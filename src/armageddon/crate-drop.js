import settings from './scheme-runtime.js';

// Per-turn random crate drop. 00417278 stores weapon/health/utility crate
// chances at setup 0xd5e6..0xd5e8 (scheme bytes 0xc/0xe/0x10 divided by the
// number of enabled kinds); 0049D47A builds a 100-entry bag at scene +0x1790
// with those counts of kinds 1/2/4 and kind 0 for the remainder.
export function nativeCrateDropBag(resourceId) {
  const scheme = settings.schemes.find(row => row.resource_id === resourceId);
  if (!scheme) throw new RangeError(`Unknown native scheme resource ${resourceId}`);
  const available = [];
  let total = 0;
  for (const [index, kind] of [[0, 1], [1, 2], [2, 4]]) {
    const count = scheme.bytes[0xd5e6 - 0xd430 + index];
    total += count;
    for (let i = 0; i < count; i++) available.push(kind);
  }
  for (let i = total; i < 100; i++) available.push(0);
  return { available, used: [] };
}

// 004B7D00 draw, run once between turns while root +0x198 is armed. No draw
// happens with five or more live crates. Returns the drawn kind (0 = none).
export function nativeCrateDropDraw(input, liveCrates, random) {
  if (liveCrates >= 5 || !input.available.length) return { bag: input, kind: 0 };
  const available = [...input.available], used = [...input.used];
  const index = ((random() >>> 16) & 0xffff) % available.length;
  const kind = available[index];
  used.push(kind);
  available[index] = available[available.length - 1];
  available.pop();
  if (!available.length) return { bag: { available: used, used: [] }, kind };
  return { bag: { available, used }, kind };
}
