import { nativeBodyCollision } from "./body-collision.js";
import { nativeWormReceiver } from "./worm-receiver.js";

// Virtual +28 receiver dispatch for the registered live body classes.
// Mine00527300 ->004E9C90 ->004F4990 transfers momentum, as does the
// projectile 00527090 ->004E2200 ->004F4990 (type 15; no default flag set
// selects that category, so live play never reaches it). Crate00526F48
// ->004E0260 and barrel00526988 ->004D15E0 return0, leaving incoming bounce.
export function nativeContactReceiver(receiver, incoming, side, environment = {}) {
  if (receiver.worm) return nativeWormReceiver(receiver, incoming, side, environment);
  if (receiver.type === 10 || receiver.type === 15) {
    const response = nativeBodyCollision(receiver, incoming, side);
    return { receiver: { ...receiver, ...response.receiver },
      incoming: { ...incoming, ...response.incoming }, calls: [], result: response.result };
  }
  return { receiver: { ...receiver }, incoming: { ...incoming }, calls: [], result: 0 };
}
