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
    this.special = null;
  }
  // 004EEA10 changes the priority cap and clears request counts, while
  // preserving the ordinary hold timer and the stored rectangle coordinates.
  setPriority(cap) {
    this.cap = cap;
    for (const group of this.groups) group[0] = 0;
    this.special = null;
  }
  // 004EEB70 replaces the special rectangle on every request.
  offerSpecial(x, y) {
    this.special = [x, y, x, y];
  }
  selectRequest(frame) {
    // 004EEA50 takes precedence without advancing the ordinary hold timer.
    if (this.special) return { bounds: [...this.special], special: true };
    return { bounds: this.select(frame), special: false };
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

// 004D6760, including the original 004D11E0 movement predicate.
export function nativeWormCameraRequest(body, environment) {
  const { x, y, active, state, motion } = body;
  const { left, right, top, bottom, sameTeam, override } = environment;
  if (y < -9999 * 65536 || y > bottom << 16) return null;
  let priority;
  if (active) priority = !sameTeam || override ? 11 : 1;
  else if (state === 0x87) priority = 9;
  else if (motion.some((v) => v !== 0)) priority = 2;
  else priority = x >= left && x <= right && y >= top ? 4 : 3;
  return [priority, x, y];
}
