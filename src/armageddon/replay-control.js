// Native replay state uses context1D438/43C/440/444/448. These kernels
// preserve the original request boundaries; snapshot storage lives outside them.
export function nativeReplayCaptureRequest(input) {
  const state = { ...input }, calls = [];
  if (!state.replaying && !state.recording && !state.captureRequested && state.activeTeam) {
    calls.push(['wormState', state.activeTeam, state.activeWorm]);
    if ([0x80, 0x81, 0x84, 0x85, 0x87].includes(state.wormState))
      state.captureRequested = 1;
  }
  return { state, calls };
}

// Full004B5F40. Input IDs are native bindings, not browser key codes.
export function nativeReplayInput(input) {
  const state = { ...input }, calls = [];
  const first = state.controllers.length > 0 &&
    ((state.controllers[0] << 16) >> 16) === state.controller;
  const query = id => { calls.push(['query', id]); return state.keys.includes(id); };
  const consume = id => calls.push(['consume', id]);
  if (!first) return { state, calls };
  if (state.replaying) {
    if (query(3)) {
      consume(3);
      state.speed = state.speed === 1 ? 4 : 1;
      if (state.playbackDevice) calls.push(['speed', state.speed]);
    }
    if (query(0x1b) && !state.stopRequested) {
      consume(0x1b);
      state.stopRequested = 1;
      if (state.playbackDevice) calls.push(['stop']);
    }
  } else if (state.recording && query(2) && !state.manualReplay) {
    consume(2);
    state.manualReplay = 1;
  }
  return { state, calls };
}

// Full004B60B0. Match-end query is an explicit controller interface; the
// registry counters are signed while scheme thresholds are unsigned byte/word.
export function nativeReplayPlaybackRequest(input) {
  const state = { ...input }, calls = [];
  if (state.externalController || state.replaying || !state.recording || !state.selectedTeam)
    return { state, calls };
  calls.push(['counterA']);
  if (state.counterA < (state.thresholdA & 255)) {
    calls.push(['counterB']);
    if (state.counterB < (state.thresholdB & 65535)) {
      calls.push(['counterB']);
      if (state.counterB < 1 || !state.manualReplay) {
        calls.push(['counterB']);
        if (state.counterB < 1) return { state, calls };
        calls.push(['matchEnded']);
        if (!state.matchEnded) return { state, calls };
      }
    }
  }
  if (state.manualReplay || ((state.frame - state.captureFrame) | 0) <= 1000) {
    state.recording = 0;
    state.replayRequested = 1;
    state.manualReplay = 0;
  }
  return { state, calls };
}
