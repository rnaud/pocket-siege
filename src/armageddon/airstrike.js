// 004DF43C..004DF518, native aircraft approach and ballistic release distance.
export function nativeAirstrikeInitial(config, gravity) {
  let threshold = Math.trunc((Math.imul(config.count, config.spacing) << 16) / 2);
  const minimum = Math.trunc(Math.imul(config.spacing, 4) / 3) << 16;
  if (config.kind === 2 && config.airborne) threshold = minimum;
  else {
    let y = -0xd00000, vy = 0, distance = 0;
    if (config.targetY > y && gravity <= 0) throw new RangeError("Strike ballistic approach needs positive gravity");
    while (y < config.targetY) {
      distance = (distance + Math.trunc((config.speed << 16) / 25)) | 0;
      vy = (vy + gravity) | 0;
      y = (y + vy) | 0;
    }
    threshold = Math.max((threshold + distance) | 0, minimum);
  }
  return { x: (config.targetX - Math.imul(config.direction, 1024)) | 0,
    y: -0xd00000, threshold, active: 0, count: config.count, progress: 0 };
}

// 004DF7D0 / 004DF690: one missile per50Hz tick once within release distance.
export function nativeAirstrikeTick(input, config, payload) {
  if (config.kind !== 2) throw new RangeError("Only original projectile strike payloads are connected");
  const body = { ...input }, calls = [];
  if (!body.active) {
    const dx = (body.x - config.targetX) | 0;
    const distance = ((dx ^ (dx >> 31)) - (dx >> 31)) | 0;
    if (distance <= body.threshold) body.active = 1;
    calls.push({ operation: "camera", request: [7,body.x,body.y] });
  }
  if (body.active) {
    if (body.count < 1) {
      if ((config.direction < 0 && body.x < -0x4000000) ||
          (config.direction > 0 && body.x > 0xb800000))
        calls.push({ operation: "delete" });
    } else {
      const child = [...payload];
      child[2] = body.x; child[3] = body.y;
      child[4] = Math.trunc(Math.imul(config.direction, config.speed) / 25);
      child[5] = 0; child[8] = 0;
      calls.push({ operation: "missile", payload: child });
      body.count = (body.count - 1) | 0;
    }
  }
  body.x = (body.x + Math.imul(config.direction, config.spacing)) | 0;
  body.progress = (body.progress + 0x4000) | 0;
  calls.push({ operation: "update" });
  return { body, calls };
}
