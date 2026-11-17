// 004B6AEC..004B6B68. Flags latch environment values until turn setup
// resets context814/818 to1/100 (004B3210); clearing flags alone is not a reset.
export function nativeTeamEnvironment(input, flags) {
  const damageMultiplier = flags & 16 ? 2 : input.damageMultiplier;
  const gravityPercent = flags & 1 ? 50 : input.gravityPercent;
  return { damageMultiplier, gravityPercent,
    gravity: Math.trunc(Math.imul(gravityPercent, 0x3d70) / 100) | 0 };
}
