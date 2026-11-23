import { nativeBarrelTick } from './barrel-tick.js';
import { nativeBarrelContact } from './barrel-contact.js';
import { nativeSimpleBodyTick, nativeSimpleBounce, nativeBodyAwake } from './motion.js';

// The barrel's physics step (004CA320 with its contact response), scheduled
// by 004CA750 before the task events.
export function nativeBarrelPhysics(input, environment, interfaces) {
  return nativeSimpleBodyTick(input, environment, {
      awake: nativeBodyAwake, collide: interfaces.collide,
      skim: interfaces.skim, waterChanged: interfaces.waterChanged,
      earthquake: interfaces.earthquake,
      bounce: (body, hit, side) => {
        const other = interfaces.other(hit);
        nativeBarrelContact(body, side, environment.suppressSound || 0, {
          sound: interfaces.impactSound,
          receive: side => interfaces.receive(body, other, hit, side),
          bounce: side => {
            const response = nativeSimpleBounce(body, other, side,
              (x, y) => interfaces.collide(x, y, body));
            Object.assign(body, response.body);
            interfaces.otherUpdated?.(hit, { ...other, ...response.other });
          },
        });
      },
    });
}

// Compose separately scheduled physics and barrel event3EA at50Hz. With
// `environment.moved` the physics pass has already advanced the body.
export function stepNativeBarrelBody(input, environment, interfaces) {
  return nativeBarrelTick(input, environment.bottom, {
    ...interfaces,
    moving: nativeBodyAwake,
    motion: environment.moved ? (body) => body : (body) => nativeBarrelPhysics(body, environment, interfaces),
  });
}
