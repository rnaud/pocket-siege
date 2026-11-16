//004E9DD0 render request, including004AAFD0's mine water substitutions.
export function nativeMineRender(body, timer, order = 0) {
  const lit = timer.triggered && Math.trunc((timer.fuse << 2) / 1000) & 1;
  const wet = body.submerged || body.fieldB0;
  const sprite = (lit ? 637 : 638) + (wet ? 75 : 0);
  return [
    ((timer.triggered ? 0 : 0x80000) + 0xa0001 + Math.imul(order, 2)) | 0,
    body.x,
    body.y,
    0,
    sprite,
    body.submerged ? 0 : body.angle,
  ];
}

export function nativeMineArt(body, timer, order = 0) {
  const request = nativeMineRender(body, timer, order);
  return {
    request,
    name: {
      637: "mineon",
      638: "mineoff",
      712: "water/mineon",
      713: "water/mineoff",
    }[request[4]],
    progress: request[5],
  };
}
