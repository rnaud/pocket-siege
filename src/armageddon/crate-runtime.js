import { nativeBodyBase } from './mine-body.js';
import { nativeCratePlacement } from './crate-body.js';
import { nativeCrateTick } from './crate-tick.js';
import { nativeCrateEvent } from './crate-events.js';
import { nativeCrateContact } from './crate-contact.js';
import { nativeSimpleBodyTick, nativeSimpleBounce, nativeBodyAwake } from './motion.js';

export function createNativeCrateBody(record, mode, bottom, friction, interfaces) {
  return nativeCratePlacement({
    ...nativeBodyBase(friction, 11, 6), kind: record.kind,
    fuse: 0, openingProgress: 0, bubbleProgress: 0, progress: 0,
    variant: record.variant || 0, targetStyle: record.targetStyle || 0,
    targetDrag: record.targetDrag || 0,
  }, record, mode, bottom, interfaces);
}

// The crate's physics step (004CA320 with its contact response), scheduled
// by 004CA750 before the task events.
export function nativeCratePhysics(input, environment, interfaces) {
  return nativeSimpleBodyTick(input, environment, {
      awake: nativeBodyAwake, collide: interfaces.collide,
      skim: interfaces.skim, waterChanged: interfaces.waterChanged,
      earthquake: interfaces.earthquake,
      bounce: (body, hit, side) => {
        const other = interfaces.other(hit);
        nativeCrateContact(body, side, environment.suppressSound || 0, {
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

// Compose physics then task event3EA and animation event3ED at50Hz. With
// `environment.moved` the physics pass has already advanced the body.
// Event3FF is a global drop/cancel request, NOT an impact notification.
export function stepNativeCrateBody(input, environment, interfaces) {
  const result = nativeCrateTick(input, environment.bottom, {
    ...interfaces,
    moving: nativeBodyAwake,
    motion: environment.moved ? (body) => body : (body) => nativeCratePhysics(body, environment, interfaces),
  });
  if (!result.deleted) result.body = nativeCrateEvent(result.body, 0x3ed);
  return result;
}
