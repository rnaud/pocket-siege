import { nativeBarrelTick } from './barrel-tick.js';
import { nativeBarrelContact } from './barrel-contact.js';
import { nativeSimpleBodyTick, nativeSimpleBounce, nativeBodyAwake } from './motion.js';

// Compose separately scheduled physics and barrel event3EA at50Hz.
export function stepNativeBarrelBody(input, environment, interfaces) {
  const result = nativeBarrelTick(input, environment.bottom, {
    ...interfaces,
    moving: nativeBodyAwake,
    motion: body => nativeSimpleBodyTick(body, environment, {
      awake: nativeBodyAwake, collide: interfaces.collide,
      skim: interfaces.skim, waterChanged: interfaces.waterChanged,
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
    }),
  });
  return result;
}
