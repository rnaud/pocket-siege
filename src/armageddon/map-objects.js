//004EBA80 consumes the weighted terrain candidate pool, reserving enough
// positions for worms.004EE900 uses the plain LCG during world setup.
export function nativeMapObjects(points, settings, random) {
  const remaining = points.map((point) => ({ ...point }));
  const calls = [];
  let ordinal = 0;
  const choose = (mode) => {
    if (!remaining.length) return null;
    let index = 0;
    if (mode === "last") index = remaining.length - 1;
    else if (mode === "weighted") {
      const value = (random() >>> 8) & 65535;
      const total = remaining.reduce((sum, p) => (sum + p.weight) | 0, 0);
      let weight = 0;
      index = remaining.findIndex((p) => {
        weight = (weight + p.weight) | 0;
        return value < Math.trunc(Math.imul(weight, 65536) / total);
      });
      if (index < 0) return null;
    }
    const point = remaining[index];
    //004CBDB0 removes the first matching packed coordinate, retaining order.
    remaining.splice(
      remaining.findIndex((p) => p.position === point.position),
      1,
    );
    return point.position;
  };
  while (ordinal < settings.count && remaining.length > settings.reserve) {
    const mode =
      settings.edges && ordinal % 3 !== 2
        ? ordinal % 3 === 0
          ? "last"
          : "first"
        : "weighted";
    const position = choose(mode);
    if (position === null) break;
    const fuseByte = (settings.fuse << 24) >> 24;
    const fuse = fuseByte < 0 ? (random() >>> 0) % 3000 : fuseByte * 1000;
    const x = position & 0xffff0000,
      y = position << 16;
    if (settings.kind === 0 || (settings.kind !== 1 && ordinal & 1)) {
      calls.push({
        kind: "mine",
        record: [48, 0, 60, fuse, 0, 100, 50, 0],
        payload: [0, 0, x, y, 0, 0, 0, 0, 0, 0, 0],
        settle: 1,
        placed: 0,
      });
    } else calls.push({ kind: "barrel", x, y, settle: 1 });
    ordinal++;
  }
  while (remaining.length > settings.reserve) {
    const mode =
      ordinal % 5 === 0 ? "last" : ordinal % 5 === 1 ? "first" : "weighted";
    if (choose(mode) === null) break;
    ordinal++;
  }
  return { calls, remaining };
}
