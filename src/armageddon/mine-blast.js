import { nativeBlastDamage } from "./blast-damage.js";
import { nativeBodyImpulse } from "./jump.js";

// 004EA070 event404 clears the report flag before forwarding to004F4410.
// Mines accumulate radial damage and receive the ordinary body impulse;
// this event does not set the mine's forced-detonation flag.
export function nativeMineBlast(previous, packet, extent = 1) {
  const body = { ...previous };
  const outputPacket = [...packet];
  outputPacket[5] = 0;
  const blast = nativeBlastDamage(
    body,
    packet[1],
    packet[2],
    packet[3],
    packet[4],
    extent,
  );
  for (const impulse of blast.impulses) {
    const { vx, vy, angularVelocity } = nativeBodyImpulse(body, ...impulse);
    Object.assign(body, { vx, vy, angularVelocity });
  }
  body.accumulated = (body.accumulated + blast.damage) | 0;
  return { body, outputPacket };
}
