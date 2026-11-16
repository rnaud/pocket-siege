import { nativeWeaponAnimation } from "./weapon-animation.js";

// 004F67E0. Sound lookup and random input come from the native task context.
export function nativePreparation(
  record,
  previous,
  progress,
  { random = 0, voice = (slot) => slot, control = 0, cue = 0 } = {},
) {
  const calls = [],
    sounds = [];
  const queue = (sprite_id, value = 0) =>
    calls.push({ operation: "queue", sprite_id, progress: value >>> 0 });
  const sprite = nativeWeaponAnimation(record);
  if (previous === sprite)
    calls.push({ operation: "setProgress", progress: progress >>> 0 });
  else {
    calls.push({ operation: "clear" });
    queue(sprite, progress);
  }
  let delay = 1,
    burst = 0;
  if (record["0x68"] === 1) {
    if (record["0x70"] === 2) burst = record["0x78"] ?? 0;
    if (record["0x6c"] === 5) {
      queue(0x1fd, progress);
      delay = 20;
      cue = 1;
    }
  } else if (record["0x68"] === 3) {
    queue(0x17f);
    sounds.push(voice(random & 0x10000 ? 0x18 : 0x2a));
  } else if (record["0x68"] === 4) {
    const entry = {
      1: [0x1ad, 10],
      3: [0x1a3, 15],
      4: [0x85, 28],
      5: [0x8e, 28],
      10: [0x188, -0x44],
      23: [0xe9, -0x1a],
    }[record["0x6c"]];
    if (entry) {
      if ([4, 5, 23].includes(record["0x6c"])) control = 0;
      calls.push({ operation: "clear" });
      queue(entry[0]);
      sounds.push(entry[1] < 0 ? -entry[1] : voice(entry[1]));
    } else if (record["0x6c"] === 9) queue(0x173);
  }
  return {
    calls,
    sounds,
    delay,
    cue,
    control,
    burst,
    released: false,
    targets: [],
  };
}

// 004F6B20, through release and state-transition interfaces. Native projectile
// construction and type-2 repeat-fire state writes remain unported.
export function nativePreparationTick(record, state, currentState = 0x69) {
  const { sprite, progress } = state;
  let { delay, cue, control, burst } = state;
  const calls = [],
    sounds = [];
  const result = (released = false) => ({
    calls,
    sounds,
    delay,
    cue,
    control,
    burst,
    released,
    targets: released && currentState === 0x69 ? [0x6a] : [],
  });
  if (record["0x68"] === 1) {
    if (cue) {
      sounds.push(0x51);
      cue = 0;
    }
    if (record["0x6c"] === 5 && sprite === 0x1fd) {
      const before = delay;
      delay = (delay - 1) | 0;
      if (before !== 0) return result();
      calls.push({
        operation: "queue",
        sprite_id: 0x1fa,
        progress: progress >>> 0,
      });
      delay = 25;
    }
  } else if (record["0x68"] === 3) {
    if (progress < 65536) return result();
  } else if (record["0x68"] === 4) {
    if ([1, 3, 9, 10, 23, 4].includes(record["0x6c"]) && progress < 65536)
      return result();
    if (record["0x6c"] === 4 && sprite === 0x85) {
      calls.push({ operation: "queue", sprite_id: 0x88, progress: 0 });
      return result();
    }
  }
  const before = delay;
  delay = (delay - 1) | 0;
  return result(before === 0);
}
