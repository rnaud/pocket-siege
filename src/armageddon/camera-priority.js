// 004EE990 / 004EEAA0. Each simulation frame supplies up to14 priority
// groups; bounds use native signed16.16 screen coordinates.
export class NativeCameraPriority {
  constructor() {
    this.reset();
  }
  reset() {
    this.cap = 14;
    this.lastFrame = 0;
    this.beginFrame();
  }
  beginFrame() {
    this.groups = Array.from({ length: 14 }, () => [0, 0, 0, 0, 0]);
  }
  offer(priority, x, y, disabled = false) {
    if (disabled) return;
    const group = this.groups[priority];
    if (!group) throw new RangeError("Invalid native camera priority");
    if (!group[0]) {
      group.splice(0, 5, 1, x, y, x, y);
      return;
    }
    group[1] = Math.min(group[1], x);
    group[2] = Math.min(group[2], y);
    group[3] = Math.max(group[3], x);
    group[4] = Math.max(group[4], y);
  }
  select(frame) {
    if (this.cap < 0 || ((frame - this.lastFrame) | 0) > 49) {
      this.lastFrame = frame;
      this.cap = 13;
    }
    for (let i = 0; i <= this.cap && i <= 13; i++) {
      if (!this.groups[i][0]) continue;
      this.lastFrame = frame;
      this.cap = i;
      return this.groups[i].slice(1);
    }
    return null;
  }
}

// 004E4C16..004E4C76. The lower world boundary does not affect priority.
export function nativeProjectileCameraRequest(body, [left, right, top]) {
  const priority = body.submerged
    ? 10
    : body.x < left || body.x > right || body.y < top
      ? 8
      : 5;
  return [priority, body.x, body.y];
}
