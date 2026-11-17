// Native 20-slot announcement ring (004EC6A0) and 50Hz controller (004ECA40).
// Font rasterization and team visibility filtering are still host adapters.
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
