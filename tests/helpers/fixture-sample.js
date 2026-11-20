// Large executable fixtures are checked in full only when FULL_FIXTURES is set
// (the weekly CI run and on demand). Everyday runs check a deterministic,
// evenly spaced subset that always keeps the first and last cases, so every
// fixture region is still exercised and failures reproduce exactly.
export const FULL_FIXTURES = /^(1|true|yes)$/i.test(process.env.FULL_FIXTURES ?? "");

export function sampleCases(cases, limit) {
  if (FULL_FIXTURES || cases.length <= limit) return cases;
  if (limit <= 1) return cases.slice(0, limit);
  const picked = [];
  for (let i = 0; i < limit; i++) picked.push(cases[Math.round((i * (cases.length - 1)) / (limit - 1))]);
  return picked;
}
