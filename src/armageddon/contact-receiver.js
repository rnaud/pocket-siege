import { nativeBodyCollision } from "./body-collision.js";
import { nativeWormReceiver } from "./worm-receiver.js";

// Virtual +28 receiver dispatch for the registered live body classes.
// Mine00527300 ->004E9C90 ->004F4990 transfers momentum. Crate00526F48
// ->004E0260 and barrel00526988 ->004D15E0 return0, leaving incoming bounce.
export function nativeContactReceiver(receiver, incoming, side, environment = {}) {
  if (receiver.worm) return nativeWormReceiver(receiver, incoming, side, environment);
  if (receiver.type === 10) {
    const response = nativeBodyCollision(receiver, incoming, side);
    return { receiver: { ...receiver, ...response.receiver },
      incoming: { ...incoming, ...response.incoming }, calls: [], result: response.result };
  }
  return { receiver: { ...receiver }, incoming: { ...incoming }, calls: [], result: 0 };
}
