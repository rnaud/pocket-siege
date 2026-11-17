import { nativeBlastDamage } from './blast-damage.js';
import { nativeBodyImpulse } from './jump.js';

// 004D1860 events433/404. Water-disabled drums ignore both hit types.
export function nativeBarrelHit(input, event, packet, extentFactor = 1) {
  const body = { ...input };
  if (body.disabled) return body;
  if (event === 0x433) {
    if (packet[0] === 1) {
      body.damage = (body.damage + packet[5]) | 0;
      if (body.damage >= body.threshold) body.state = 1;
    } else body.state = 1;
  } else if (event === 0x404) {
    packet[5] = 0;
    const blast = nativeBlastDamage(body, packet[1], packet[2], packet[3], packet[4], extentFactor);
    for (const impulse of blast.impulses) {
      const { result, ...velocity } = nativeBodyImpulse(body, ...impulse);
      Object.assign(body, velocity);
    }
    if ((body.accumulated + blast.damage) | 0) body.state = 1;
    body.accumulated = 0;
  } else throw new RangeError(`Unsupported barrel hit event ${event}`);
  return body;
}
