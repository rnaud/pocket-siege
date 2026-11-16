//004EA584..004EA683, after the timer and depth-removal branches.
export function nativeMineWater(previous, env, random) {
  const body = { ...previous };
  const calls = [];
  if (env.submerged) {
    body.bubbleProgress = (body.bubbleProgress + 0x4000) | 0;
    while (body.bubbleProgress >= 65536) {
      body.bubbleProgress = (body.bubbleProgress - 65536) | 0;
      calls.push({
        operation: "bubble",
        request: [env.x, env.y, 0, 0, ((random() & 0x30000) >>> 16) + 1],
      });
    }
    if (!body.waterFlagsSet) {
      body.flags = 0x400000;
      body.waterFlagsSet = 1;
    }
  }
  if (!body.splashActive && env.fieldB0) {
    body.splashActive = 1;
    if (env.vy > 65536)
      calls.push({ operation: "sound", request: [57, 5, 65536, 65536, 0] });
  }
  if (body.splashActive && !env.fieldB0) body.splashActive = 0;
  if (!env.awake) body.forceBlast = 0;
  return { body, calls };
}
