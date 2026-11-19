// Armageddon meteor shower. 004ED41F stores message 0x443 {count, interval,
// weapon} at root +0x84/+0x8c/+0x90 and zeroes the timer at +0x88.
export function nativeArmageddonStart([count, interval, weapon]) {
  return { count: count | 0, timer: 0, interval: interval | 0, weapon: weapon | 0 };
}

// 004EB110, once per 20 ms frame. random() is the scene RNG step 004EE960.
// Returns the updated state, at most one meteor launch payload (the 11-word
// 004E1830 record) and an optional sound request.
export function nativeArmageddonTick(input, random) {
  const state = { ...input };
  if (!state.count) return { state, meteor: null, sound: null };
  state.timer = (state.timer - 20) | 0;
  if (state.timer > 0) return { state, meteor: null, sound: null };
  state.timer = (state.interval + (random() & 0xffff) % 100 + state.timer) | 0;
  const column = (random() & 0xffff) % 1920;
  const drift = ((random() & 0xffff) % 401) - 200;
  const x = ((column + Math.trunc(-696 * drift / 100)) << 16) | 0;
  const vx = Math.trunc(((5 * drift) << 17) / 100) | 0;
  const meteor = [0, 0, x, -696 << 16, vx, 0x140000, 0x3c00000, 0x15c0000, 0, 0, 0];
  const sound = random() & 0x80000000 ? null : [0x2c, 8, 0x10000, 0x10000, 0];
  state.count = (state.count - 1) | 0;
  return { state, meteor, sound };
}
