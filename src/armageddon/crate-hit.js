import { nativeBlastDamage } from './blast-damage.js';
import { nativeBodyImpulse } from './jump.js';
import { nativeCrateState } from './crate-state.js';

// 004E0F20 event404: suppress the caller's quality report, apply the base
// blast, then consume accumulated damage through virtual+C8.
export function nativeCrateHit(input, packet, extentFactor = 1) {
  let body = { ...input };
  packet[5] = 0;
  const blast = nativeBlastDamage(body, packet[1], packet[2], packet[3], packet[4], extentFactor);
  for (const impulse of blast.impulses) {
    const { result, ...velocity } = nativeBodyImpulse(body, ...impulse);
    Object.assign(body, velocity);
  }
  const accumulated = (body.accumulated + blast.damage) | 0;
  body.accumulated = 0;
  if (accumulated) body = nativeCrateState(body, 103);
  return body;
}

// 004E0F20 events433/444 enter detonation state unconditionally, including
// zero-damage hits and submerged crates; the incoming packet is untouched.
export function nativeCrateDirectHit(input) {
  return nativeCrateState(input, 103);
}
