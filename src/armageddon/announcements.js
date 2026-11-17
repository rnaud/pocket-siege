import { fixedMultiply } from "./numeric.js";
// Native 20-slot announcement ring (004EC6A0) and 50Hz controller (004ECA40).
// The historical `scale` field is pixel coverage, not geometric size.
// Native team visibility inputs remain a host adapter.
// `blocking` preserves the field name used by the oracle;
// 004EB800 consumes it for audio, while any pending queue delays turn flow.
export function createNativeAnnouncements() {
  return { read: 0, write: 0, stage: 0, elapsed: 0, scale: 0, blocking: 0,
    entries: Array(20).fill(null) };
}
export function queueNativeAnnouncement(state, text, font = 15, team = 0, teamOnly = 0) {
  if (text.startsWith("!")) {
    text = text.slice(1);
    state.write = state.read;
    state.stage = 0;
  }
  const next = (state.write + 1) % 20;
  if (next === state.read) return;
  state.entries[state.write] = { text: text.split("\0")[0].slice(0, 80),
    font: Math.abs(font | 0) | 0, long: Number(font < 0), team, teamOnly };
  state.write = next;
}
export function nativeAnnouncementTick(state) {
  const count = (state.write - state.read + 20) % 20;
  if (!count) return;
  let duration = count === 1 ? 1000 : count === 2 ? 875 : 750;
  if (state.stage && state.entries[state.read].long) duration *= 3;
  switch (state.stage) {
    case 0: state.stage = 1; state.scale = 0; break;
    case 1:
      state.scale = (state.scale + 0x4ccc) | 0;
      if (state.scale >= 65536) {
        state.stage = 2; state.scale = 65536; state.elapsed = 0;
      }
      break;
    case 2:
      state.elapsed = (state.elapsed + 20) | 0;
      if (state.elapsed <= duration) return;
      state.stage = 3;
      break;
    case 3:
      state.scale = (state.scale - 0x4ccc) | 0;
      if (state.scale <= 0) { state.stage = 0; state.read = (state.read + 1) % 20; }
      break;
  }
  state.blocking = state.stage ? state.entries[state.read].long : 0;
}

// 004AC953: retain a pixel when the unsigned accumulator addition carries.
// This is a coverage dissolve, not geometric scaling or alpha blending.
export function nativeAnnouncementMask(length, seed, coverage) {
  const mask = new Uint8Array(length);
  if (coverage >= 65536) { mask.fill(1); return mask; }
  if (coverage <= 0) return mask;
  const increment = (coverage << 16) >>> 0;
  let accumulator = seed >>> 0;
  for (let i = 0; i < length; i++) {
    const sum = accumulator + increment;
    mask[i] = Number(sum > 0xffffffff);
    accumulator = sum >>> 0;
  }
  return mask;
}

// 004C6894..004C698C: border drawn after the text at x=4.
export function nativeAnnouncementFrame(textWidth, textHeight, color) {
  const right = textWidth + 6, bottom = textHeight;
  return [
    ["horizontal", 1, right, 0, color], ["horizontal", 1, right, bottom, color],
    ["vertical", 0, 1, bottom, color], ["vertical", right, 1, bottom, color],
    ["pixel", 1, 1, color], ["pixel", right - 1, 1, color],
    ["pixel", 1, bottom - 1, color], ["pixel", right - 1, bottom - 1, color],
    ["pixel", 0, 0, 0], ["pixel", right, 0, 0],
    ["pixel", 0, bottom, 0], ["pixel", right, bottom, 0],
  ];
}

// 004EC930: visibility and center coordinates in the native screen space.
export function nativeAnnouncementDraw(state, screenHeight, playback = 0, teamVisible = true) {
  const entry = state.entries[state.read];
  if (!state.stage || !state.scale || !entry || (entry.teamOnly && !teamVisible)) return null;
  return { text: entry.text, font: entry.font, coverage: state.scale,
    x: 0, y: (Math.imul(playback, 10) - Math.trunc((screenHeight << 16) / 2) + 0x100000) | 0 };
}

// 004ECA20; 004B64B0 checks this before advancing the turn controller.
export function nativeAnnouncementsPending(state) {
  return state.read !== state.write;
}

// 004EB800 and 004EDA70; handle allocation is supplied by the audio backend.
export function nativeAnnouncementAudioTick(volume, handle, longMessage, startedHandle = 17) {
  const target = longMessage ? 65536 : 0;
  if (volume < target) volume = target;
  else {
    const difference = (target - volume) | 0;
    const increment = Math.max(0x1ca, Math.abs(fixedMultiply(difference, 0x1999)));
    volume = increment < Math.abs(difference)
      ? (volume + (volume <= target ? increment : -increment)) | 0 : target;
  }
  const calls = [];
  if (volume) {
    if (!handle) { calls.push(["play", 0x10001, 9, 65536, volume, 0]); handle = startedHandle; }
    else calls.push(["volume", handle, volume]);
  } else {
    if (handle) calls.push(["stop", handle]);
    handle = 0;
  }
  return { volume, handle, calls };
}
