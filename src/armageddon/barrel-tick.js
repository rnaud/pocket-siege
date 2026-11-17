// 004D1860 event3EA. Physics is separately scheduled; the motion interface
// composes that step while native base event3EA only cleans up audio.
export function nativeBarrelTick(input, bottom, interfaces) {
  const body = interfaces.motion({ ...input });
  if (body.submerged) body.disabled = 1;
  if (interfaces.moving(body)) {
    interfaces.promote?.();
    interfaces.camera([12, body.x, body.y]);
    interfaces.busy();
  }
  if (body.submerged) {
    body.bubbleProgress = (body.bubbleProgress + 0x4000) | 0;
    while (body.bubbleProgress > 65535) {
      body.bubbleProgress = (body.bubbleProgress - 65536) | 0;
      interfaces.bubble([body.x, body.y, 0, 0,
        ((interfaces.visualRandom() & 0x30000) >>> 16) + 1]);
    }
  }
  let deleted = false;
  if ((body.y >> 16) >= bottom || body.state) {
    if ((body.y >> 16) < bottom) interfaces.detonate();
    interfaces.delete(1);
    deleted = true;
  }
  return { body, deleted };
}
