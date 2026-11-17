// 004D3C50. Task construction and 200-slot flame pool registration remain
// caller interfaces; both random draws use the gameplay stream.
export function nativeFlameBody(record, frame, counter, random) {
  const progress = random() & 0xffff;
  const draw = random() & 0xffff;
  const divisor = Math.imul(record[7], 50);
  if (!divisor) throw new RangeError('Native flame lifetime divisor is zero');
  const decay = (Math.trunc(draw / 500) + Math.trunc(0x3e80000 / divisor)) | 0;
  return {
    body: {
      age: 0, strength: 0xffff, progress, decay,
      x: record[0], y: record[1], vx: record[2], vy: record[3],
      smokeProgress: 0, jitterX: 0, jitterY: 0, burnProgress: 0,
      hitDelay: 0, initial: 1, contact: 0, enabled: 1, created: frame,
      identity: counter & 255, direction: 0,
    },
    record: record.slice(0, 11),
    nextCounter: (counter + 1) | 0,
  };
}
