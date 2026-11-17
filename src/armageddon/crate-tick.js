import { nativeCrateState } from './crate-state.js';

// 004E0F20 event3EA lifecycle. The motion interface composes the separately
// scheduled physics tick; native base event004F4410 only cleans up audio.
export function nativeCrateTick(input, bottom, interfaces) {
  let body = interfaces.motion({ ...input }), missionStatus = 0, deleted = false;
  const changeState = state => {
    interfaces.state?.(state);
    body = nativeCrateState(body, state);
  };
  const remove = () => { interfaces.delete(1); deleted = true; };
  if (interfaces.moving(body)) {
    interfaces.promote?.();
    interfaces.camera([12, body.x, body.y]);
    interfaces.busy();
  }
  if (body.submerged && body.state !== 102) changeState(102);
  if (!interfaces.moving(body) && body.kind === 3 && body.fuse) {
    body.fuse = (body.fuse - 20) | 0;
    if (body.fuse <= 0) {
      if (body.variant) missionStatus = 4;
      body.fuse = 0;
      interfaces.detonate();
      remove();
      return { body, missionStatus, deleted };
    }
  }
  if (body.state === 103) {
    interfaces.detonate();
    remove();
  } else if ((body.y >> 16) >= bottom) {
    if (body.variant) missionStatus = 4;
    remove();
  } else if (body.state === 100 || body.state === 101) {
    const opening = body.state === 100;
    if (opening) {
      body.openingProgress = (body.openingProgress + 0x51e) | 0;
      if ((body.openingProgress & 0xffff0000) < 65536)
        return { body, missionStatus, deleted };
    }
    const limit = opening ? 180 : 100;
    let offset = 0;
    for (; offset < limit; offset += 16)
      if (interfaces.collide(body.x, (body.y + (offset << 16)) | 0, body)) break;
    if (offset < limit) changeState(104);
    else if (opening) changeState(101);
  } else if (body.state === 102) {
    body.bubbleProgress = (body.bubbleProgress + 0x4000) | 0;
    while (body.bubbleProgress >= 65536) {
      body.bubbleProgress = (body.bubbleProgress - 65536) | 0;
      interfaces.bubble([body.x, body.y, 0, 0, (interfaces.visualRandom() & 3) + 1]);
    }
  }
  return { body, missionStatus, deleted };
}
