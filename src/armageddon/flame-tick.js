const abs = value => { const sign = value >> 31; return ((value ^ sign) - sign) | 0; };

// 004D4590 event3EA. Record layout is the constructor's eleven-word packet.
export function nativeFlameTick(input, sourceRecord, environment, interfaces) {
  let body = { ...input };
  const record = [...sourceRecord], persistent = record[10];
  const smoke = (sprite, count) => {
    for (let i = 0; i < count; i++) interfaces.smoke([
      0x10ff00, body.x, body.y,
      (interfaces.visualRandom() & 0xffff) - 0x8000,
      (interfaces.visualRandom() & 0xffff) - 0x8000,
      sprite, Math.trunc((interfaces.visualRandom() & 0xffff) / 200) + 0x20c,
    ]);
  };
  const remove = () => {
    interfaces.delete(1);
    return { body, record, deleted: true };
  };
  const burn = () => {
    if (body.enabled) interfaces.burn(body.strength >= 0xc000 ? 12
      : body.strength >= 0x8000 ? 13 : body.strength >= 0x4000 ? 14 : 15,
    body.x >> 16, body.y >> 16);
  };
  if (!persistent || record[9] > 0) interfaces.busy();
  const motion = interfaces.motion(body);
  body = motion.body;
  body.smokeProgress = (body.smokeProgress + 0x51e +
    Math.trunc(((65536 - body.strength) | 0) / 24)) | 0;
  smoke(0x336, body.smokeProgress >> 16);
  body.smokeProgress &= 0xffff;
  if (body.hitDelay) body.hitDelay = Math.max(0, (body.hitDelay - 20) | 0);
  if (!body.hitDelay && ((environment.frame + record[9]) & 15))
    body = interfaces.hit(body, record);
  if (body.age >= 0 && body.strength > 0x1998 && record[9] > 0) {
    body.age = (body.age + 20) | 0;
    if (body.age >= record[8]) {
      let child = [...record];
      child[0] = body.x; child[1] = body.y;
      child[2] = Math.trunc(Math.imul(body.vx, 3) / 4);
      child[3] = Math.trunc(Math.imul(body.vy, 3) / 4);
      child[9] = (child[9] - 1) | 0;
      if (!record[4]) {
        child[4] = -1;
        child = interfaces.spread(child);
        child[4] = 1;
      }
      interfaces.spread(child);
      body.age = -1; record[9] = 0;
    }
  }
  if (!persistent && !motion.result) body.strength = (body.strength - body.decay) | 0;
  if (body.strength < 1) return remove();
  if ((body.y >> 16) >= environment.water) {
    smoke(0x331, (Math.imul(record[9], 4) + 4) | 0);
    interfaces.sound([0x37, 1, 65536, 65536, 0]);
    return remove();
  }
  body.progress = (body.progress + 0x5e3) & 0xffff;
  if (!persistent) interfaces.camera([6, body.x, body.y]);
  body.jitterX = (interfaces.logicRandom() & 0xffff) * 3 - 0x18000;
  body.jitterY = (interfaces.logicRandom() & 0xffff) * 3 - 0x18000;
  if (!persistent) {
    if (body.contact && body.initial) { burn(); body.initial = 0; }
    else {
      body.burnProgress = (body.burnProgress + Math.trunc(body.strength / 40)) | 0;
      if ((body.burnProgress & 0xffff0000) > 65535) {
        body.burnProgress &= 0xffff;
        burn();
      }
    }
  }
  if (body.initial && ((abs(body.vx) + abs(body.vy)) | 0) < 0x50000) body.initial = 0;
  return { body, record, deleted: false };
}
