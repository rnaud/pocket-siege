// LANDGEN.EXE 00406CB0 starts its /water percentage at0 and only replaces it
// for an explicit /water argument (clamped0..50). WA.exe builds the /mission
// and /custom commands without /water, and LANDGEN 00405220 writes that value
// as the second land.dat header field. WA 0049D539 then derives the initial
// Y-down waterline as (100-percent)*696/100, so scenarios start with the sea
// at the bottom edge of the 696-row landscape.
export const NATIVE_SCENARIO_WATER_PERCENT = 0;

export function nativeInitialWaterY(percent) {
  return Math.trunc(Math.imul((100 - percent) | 0, 0x2b8) / 100);
}

// Host waterLevel is the Y-up height of the surface above the world bottom.
export function nativeScenarioWaterLevel(height) {
  return height - nativeInitialWaterY(NATIVE_SCENARIO_WATER_PERCENT);
}
