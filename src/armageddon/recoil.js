// 004F6DA0: post-fire animation queue and initial countdown.
export function nativePostFire(record, progress) {
  const calls = [];
  let delay = 0;
  const queue = (sprite_id, value = progress) =>
    calls.push({ operation: "queue", sprite_id, progress: value >>> 0 });
  switch (record["0x68"]) {
    case 1: {
      const entry = {
        1: [0x1f1, 2],
        2: [0x91, 5],
        4: [0x22a, 0],
        5: [0x200, 10],
        6: [0x20c, 2],
      }[record["0x6c"]];
      if (entry) {
        queue(entry[0]);
        delay = entry[1];
      }
      break;
    }
    case 2:
      calls.push({ operation: "clear" });
      queue(0x91, 0x8000);
      delay = 5;
      break;
    case 4:
      switch (record["0x6c"]) {
        case 1:
          queue(0x1b2, 0);
          break;
        case 2:
          queue(0xa7);
          delay = 25;
          break;
        case 3:
          queue(0x1a6, 0);
          break;
      }
  }
  return { calls, delay };
}

// 004F6FA0: timed punch/firepunch strips must finish before counting down.
export function nativeRecoilTick(record, delay, progress, resume) {
  if (
    record["0x68"] === 4 &&
    [1, 3].includes(record["0x6c"]) &&
    progress < 65536
  )
    return { delay, target: null };
  return {
    delay: (delay - 1) | 0,
    target: delay === 0 ? (resume ? 0x65 : 0x6b) : null,
  };
}
