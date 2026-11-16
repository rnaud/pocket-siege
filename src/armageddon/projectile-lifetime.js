// 004E477A..004E4877, after fuse processing and before guidance.
export function nativeProjectileLifetime(body, environment) {
  const calls = [];
  const call = (operation, ...request) => calls.push({ operation, request });
  if (Math.trunc(Math.abs((body.x >> 16) - 960) / 25) >= 500)
    call("state", 1);
  if (body.phase) call("position", body.x, body.y);
  if (environment.submerged && body.phase === 1) call("special");
  if (body.mode === 2 && !environment.awake && body.count && (body.sideMask & 8))
    call("state", 1);
  if ((body.y >> 16) >= ((environment.depth + (body.secondary ? 128 : 0)) | 0)) {
    call("update");
    call("delete", 1);
  }
  return calls;
}

// 0049CA90 / 004ECBF0: camera bottom is at least 768 pixels below its
// top and 160 below water; destruction depth is another 40 pixels below.
export function nativeProjectileDepth(waterY, topY = 0) {
  return Math.max(waterY + 160, topY + 768) + 40;
}
