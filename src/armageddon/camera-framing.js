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
    this.suppression = 0;
  }
  track(priority, frame, viewport, limits) {
    const request =
      this.suppression > 0
        ? { bounds: null, special: false }
        : priority.selectRequest(frame);
    return this.tick(request.bounds, viewport, limits, request.special);
  }
  tick(bounds, viewport, limits, special = false) {
    if (this.suppression > 0) bounds = null;
    if (special && bounds) {
      this.target[0] = Math.trunc(((bounds[0] + bounds[2]) | 0) / 2);
      this.target[1] = Math.trunc(((bounds[1] + bounds[3]) | 0) / 2);
      this.target[2] = 0;
    }
    if (bounds)
      this.target = nativeCameraFrame(
        this.target,
        viewport.map((v) => Math.trunc(v / 2)),
        bounds,
      );
    if (this.suppression < 0) this.suppression++;
    else if (this.suppression > 0) this.suppression--;
    this.target[2] = 0;
    this.display = nativeCameraEase(this.display, this.target).camera;
    this.target = nativeCameraFrame(this.target, viewport, limits, 0, true);
    this.display = nativeCameraFrame(this.display, viewport, limits, 0, true);
    return this.display;
  }
}

// 004ED5F0 (first local player only): the raw mouse delta moves the camera
// target in screen pixels. A resting camera (suppression 0) ignores moves
// below |dx|+|dy| 16; negative suppression disables mouse-look. Any applied
// move holds automatic framing for 100 frames (004ED6F1).
export function nativeCameraMouseLook(framing, dx, dy) {
  dx |= 0; dy |= 0;
  if (framing.suppression < 0) return false;
  if (framing.suppression === 0 && (Math.abs(dx) + Math.abs(dy)) < 0x10) return false;
  if (!dx && !dy) return false;
  framing.target[0] = (framing.target[0] + (dx << 16)) | 0;
  framing.target[1] = (framing.target[1] + (dy << 16)) | 0;
  framing.suppression = 100;
  return true;
}

// 004DEF07..004DEF67 worm frame update: which states offer 004D6760 each
// frame. Walking/idle states never do; airborne, hurt, jump, recovery,
// parachute, drowning and death states always do; rope/frozen states
// (0x7B/0x7C/0x82/0x83/0x88) only while the 0xF4 movement predicate holds.
export function nativeWormFrameCameraRequest(state, moving) {
  state |= 0;
  if ((state >= 0x64 && state <= 0x67) || state === 0x74) return false;
  if ([0x7b, 0x7c, 0x82, 0x83, 0x88].includes(state)) return Boolean(moving);
  if (state >= 0x68 && state <= 0x75) return state === 0x73;
  return true;
}

// 0049D2CE..0049D3DE and 004EABB5..004EABE5 world limits in 16.16: open
// landscapes let the camera roam 2046 pixels past each side and above the
// map, closed ones (scene 0x11D67 -> 0x1B8AC) stop 2 pixels inside; the bottom
// is the Y-down waterline + 160, at least 768 below the top. The original
// right edges 0x77E/0xF7E assume the 1920-pixel landscape; width scales them.
export function nativeCameraWorldLimits({ closed = false, width = 1920, waterY }) {
  const left = closed ? 2 : -2046;
  const right = closed ? width - 2 : width + 2046;
  const top = left << 16;
  let bottom = ((waterY + 160) << 16) | 0;
  if (((bottom - top) & 0xffff0000) < 0x3000000) bottom = (top + 0x3000000) | 0;
  return [left << 16, top, right << 16, bottom];
}

// 004DEF07..004DEF67: which worm states call 004EEBE0 (scene busy wake) each
// frame. Idle/walk states 0x64-0x67 and 0x74 never do; rope/frozen states
// (0x7B/0x7C/0x82/0x83/0x88) only while moving; all other states always do.
export function nativeWormFrameActivity(state, moving) {
  state |= 0;
  if ((state >= 0x64 && state <= 0x67) || state === 0x74) return false;
  if ([0x7b, 0x7c, 0x82, 0x83, 0x88].includes(state)) return Boolean(moving);
  return true;
}
