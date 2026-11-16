import { fixedMultiply as mul, fixedDivide as div } from "./numeric.js";

// Native camera state: [x, y, depth, focalDistance], all signed 16.16.
// 004C5250 projects relative to the nearest integer camera pixel.
function project(camera, x, y, depth) {
  const [cx, cy, z, focal] = camera;
  const distance = (depth - z + focal) | 0;
  if (distance <= 0)
    throw new RangeError("Camera point is behind projection plane");
  let scale = div(focal, distance);
  const px = mul((x - ((cx + 0x8000) & 0xffff0000)) | 0, scale);
  const py = mul((y - ((cy + 0x8000) & 0xffff0000)) | 0, scale);
  if (depth !== distance) scale = mul(scale, div((focal + depth) | 0, focal));
  return [px, py, scale];
}

// 004C58F0 keeps requested bounds inside the viewport; 004C5450 keeps
// the viewport inside world bounds. Both adjust projection depth first.
export function nativeCameraFrame(
  before,
  viewport,
  bounds,
  depth = 0,
  limit = false,
) {
  const camera = [...before];
  const [left, top, right, bottom] = bounds;
  const halfW = Math.trunc((viewport[0] << 16) / 2);
  const halfH = Math.trunc((viewport[1] << 16) / 2);
  let a = project(camera, left, top, depth);
  let b = project(camera, right, bottom, depth);
  const exceeds = (outer, inner) => (limit ? inner < outer : outer < inner);
  if (exceeds(Math.abs(halfW * 2), Math.abs((b[0] - a[0]) | 0))) {
    camera[2] =
      (camera[3] -
        div(
          camera[3],
          div(Math.abs(halfW * 2), Math.abs((right - left) | 0)),
        )) |
      0;
    a = project(camera, left, top, depth);
    b = project(camera, right, bottom, depth);
  }
  if (exceeds(Math.abs(halfH * 2), Math.abs((b[1] - a[1]) | 0))) {
    camera[2] =
      (camera[3] -
        div(
          camera[3],
          div(Math.abs(halfH * 2), Math.abs((bottom - top) | 0)),
        )) |
      0;
    a = project(camera, left, top, depth);
    b = project(camera, right, bottom, depth);
  }
  const outsideLow = (value, edge) => (limit ? value > edge : value < edge);
  const outsideHigh = (value, edge) => (limit ? value < edge : value > edge);
  if (outsideLow(a[0], -halfW))
    camera[0] = (camera[0] + div((a[0] + halfW) | 0, b[2])) | 0;
  else if (outsideHigh(b[0], halfW))
    camera[0] = (camera[0] + div((b[0] - halfW) | 0, b[2])) | 0;
  if (outsideLow(a[1], -halfH))
    camera[1] = (camera[1] + div((a[1] + halfH) | 0, b[2])) | 0;
  else if (outsideHigh(b[1], halfH))
    camera[1] = (camera[1] + div((b[1] - halfH) | 0, b[2])) | 0;
  return camera;
}

// 004C5310: separate truncated fixed products, then a 0x3333 snap threshold.
export function nativeCameraEase(before, target) {
  const camera = [...before];
  const integerTarget = target.slice(0, 3).map((v) => v & 0xffff0000);
  for (let i = 0; i < 3; i++) {
    camera[i] =
      (mul(camera[i], i === 2 ? 0xe666 : 0xcccc) +
        mul(integerTarget[i], i === 2 ? 0x1999 : 0x3333)) |
      0;
    if (Math.abs((integerTarget[i] - camera[i]) | 0) < 0x3333)
      camera[i] = integerTarget[i];
  }
  return {
    camera,
    settled: camera.slice(0, 3).every((v, i) => v === integerTarget[i]) ? 1 : 0,
  };
}

// 004ED710 ordering: fit target to half viewport, reset depth, ease display,
// then constrain target and display independently to the world rectangle.
export class NativeCameraFraming {
  constructor(x, y, focalDistance) {
    this.target = [x, y, 0, focalDistance];
    this.display = [...this.target];
  }
  tick(bounds, viewport, limits) {
    if (bounds)
      this.target = nativeCameraFrame(
        this.target,
        viewport.map((v) => Math.trunc(v / 2)),
        bounds,
      );
    this.target[2] = 0;
    this.display = nativeCameraEase(this.display, this.target).camera;
    this.target = nativeCameraFrame(this.target, viewport, limits, 0, true);
    this.display = nativeCameraFrame(this.display, viewport, limits, 0, true);
    return this.display;
  }
}
