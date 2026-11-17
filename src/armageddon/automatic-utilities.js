// 004B62D0. Called during team updates, including after utility pickups.
// Availability is supplied by 004C2EE0 (which applies inventory delays).
// These pickups CLEAR their inventory slot, even for unlimited/stacked ammo.
export function nativeAutomaticUtilities(input, available, bits = [4, 5]) {
  const body = { ...input }, cleared = [];
  if (!body.team) return { body, cleared };
  for (let i = 0; i < 4; i++) {
    if (!available[i]) continue;
    cleared.push(67 + i);
    if (i < 2) body.flags |= 1 << (bits[i] & 31);
    else if (i === 2 && !body.doubleTime) {
      body.doubleTime = 1;
      body.time = (body.time * 2) | 0;
    } else if (i === 3 && !body.crateShower) {
      body.crateTimer = 0;
      body.crateCount = 5;
      body.crateShower = 1;
    }
  }
  return { body, cleared };
}
