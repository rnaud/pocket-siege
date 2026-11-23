import { fixedMultiply } from "./numeric.js";

// 004ECFB0 event 0x445 (the Earthquake utility 004FC990 sends {8}): marks
// scene+0x1AC8 and restarts progress over `duration` seconds. The English
// language table +0x300 is empty, so no announcement is shown and the
// selector consumes no random value.
export function nativeEarthquakeStart(input, duration) {
  return { body: { ...input, progress: 0, duration: duration | 0, started: 1 }, calls: [] };
}

// 004EB2E0, once per 50 Hz world frame after the camera-shake decay. Progress
// is signed 16.16 over duration*50 frames; the strength eases 0xCCC per frame
// toward a triangle peaking at 1.2, then back to zero. While shaking it keeps
// the scene busy (004EEBE0), drives loops 0x10004/0x10005 at its strength,
// and writes strength*8 to the camera shake (scene+0x1B8C4) and to the
// quake strength bodies read (scene+0x1AC4).
export function nativeEarthquakeTick(input, play = () => 0) {
  const body = { ...input }, calls = [];
  if (body.progress < 0) body.target = 0;
  else {
    body.busy = 12;
    const p = body.progress;
    body.target = (((p < 0x8000 ? p : (0x10000 - p) | 0) * 2) + 0x3333) | 0;
    const divisor = Math.imul(body.duration, 50);
    if (!divisor) throw new RangeError("Native earthquake duration divides by zero");
    body.progress = (p + Math.trunc(0x10000 / divisor)) | 0;
    if (body.progress >= 0x10000) body.progress = -1;
  }
  if (body.target > body.strength) body.strength = (body.strength + 0xccc) | 0;
  if (body.target < body.strength) {
    body.strength = (body.strength - 0xccc) | 0;
    if (body.strength === 0) body.shake = 0;
  }
  body.strength = Math.max(0, Math.min(0x10000, body.strength));
  for (const [field, sound] of [["handleA", 0x10004], ["handleB", 0x10005]]) {
    const handle = body[field];
    if (body.strength) {
      if (handle) calls.push({ operation: "volume", handle, volume: body.strength });
      else {
        const request = [sound, 10, 0x10000, body.strength, 0];
        body[field] = play(request);
        calls.push({ operation: "play", request, handle: body[field] });
      }
    } else {
      if (handle) calls.push({ operation: "stop", handle });
      body[field] = 0;
    }
  }
  if (body.strength) body.shake = body.strength << 3;
  body.quake = body.strength << 3;
  return { body, calls };
}

// 004CA250: two logic-random samples, each (bits 8..23) - 0x8000 scaled by
// the quake strength, delivered through the body's virtual +0x34 unless both
// are zero. Submerged bodies (+0xBC) draw nothing.
export function nativeEarthquakeKick(strength, submerged, random) {
  if (submerged) return null;
  const sample = () => fixedMultiply((((random() >>> 0) & 0xffff00) >>> 8) - 0x8000, strength);
  const x = sample(), y = sample();
  return x || y ? { x, y } : null;
}

// 004D6940, the worm's virtual +0x34: in jetpack, rope, bungee, parachute,
// flying (0x7F) and frozen (0x88) states the velocity is only added
// (004F4D20); any other state first enters 0x7F.
const KEEP_STATES = new Set([0x78, 0x7b, 0x7c, 0x7d, 0x7f, 0x88]);
export function nativeWormEarthquakeResponse(state, vx, vy, x, y) {
  return {
    state: KEEP_STATES.has(state) ? null : 0x7f,
    vx: (vx + x) | 0,
    vy: (vy + y) | 0,
  };
}
