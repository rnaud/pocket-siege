import { fixedMultiply, fixedDivide } from "./numeric.js";

// 004DDBD0 calls 004FD3B0 with this signed 16.16 delta every game tick.
export const ANIMATION_TICK = 0x51e;

// 004AFC10. Metadata starts with a packed 16.16 rate, then loop flags.
export function animationMetadata(sprite) {
  const [low, high, flags] = sprite.metadata;
  const count = sprite.frames.length;
  return {
    rate: low | (high << 16) | 0,
    loop: flags & 1,
    span: flags & 2 ? count * 2 - 1 : count,
  };
}

// 004B0260: wrap/clamp normalized progress, then optionally ping-pong.
export function nativeSpriteFrame(count, flags, progress) {
  progress |= 0;
  progress =
    flags & 1 ? progress & 0xffff : Math.max(0, Math.min(0xffff, progress));
  if (!(flags & 2)) return Math.imul(count, progress) >> 16;
  let index = Math.imul(count * 2 - 1, progress) >> 16;
  if (index >= count) index = count * 2 - index - 1;
  return index;
}

// 004AFB00. The crop's anchor is measured from the full canvas center,
// independent of the visible feet or the current frame's bottom edge.
// 00498890 subtracts these anchors from the integer body draw position.
export function nativeSpriteBounds(sprite, progress) {
  const index = nativeSpriteFrame(
    sprite.frames.length,
    sprite.metadata[2],
    progress,
  );
  const frame = sprite.frames[index];
  return {
    index,
    width: frame.right - frame.left,
    height: frame.bottom - frame.top,
    anchorX: (sprite.width >> 1) - frame.left,
    anchorY: (sprite.height >> 1) - frame.top,
  };
}

// 004FD2B0/004FD4B0/004FD3B0: 16-slot ring with one slot left empty.
export class NativeAnimationPlayer {
  constructor() {
    this.clear();
  }
  clear() {
    this.current = { id: 0, progress: 0, rate: 0, loop: 0, span: 0 };
    //004FD2B0 clears the header, retaining inactive ring storage for replay.
    this.slots ??= Array(16).fill(null);
    this.read = this.write = 0;
  }
  pop() {
    this.current = { ...this.slots[this.read] };
    this.read = (this.read + 1) & 15;
  }
  enqueue(id, metadata, progress = 0) {
    const next = (this.write + 1) & 15;
    if (next === this.read) return false;
    this.slots[this.write] = { id, progress: progress | 0, ...metadata };
    this.write = next;
    if (!this.current.id) this.pop();
    return true;
  }
  // 004FD270 only allows callers to control zero-rate strips (aim/walk).
  setProgress(progress) {
    if (!this.current.rate) this.current.progress = progress | 0;
  }
  advance(delta = ANIMATION_TICK) {
    if (!delta) return;
    while (this.current.id) {
      const c = this.current;
      const before = c.progress;
      c.progress =
        (before + Math.trunc(fixedMultiply(delta, c.rate) / c.span)) | 0;
      if (this.read === this.write) return;
      if (
        !((c.progress ^ before) & 0xffff0000) &&
        (c.loop || c.progress < 0x10000) &&
        c.rate
      )
        return;
      delta = c.rate
        ? fixedDivide(Math.imul((c.progress - before) | 0, c.span), c.rate)
        : 0;
      this.pop();
      if (!delta) return;
    }
  }
  //004FD330/004FD370 persist the full348-byte body, including inactive slots.
  replayState() {
    const bytes = new Uint8Array(0x15c), view = new DataView(bytes.buffer);
    const fields = ['id', 'progress', 'rate', 'loop', 'span'];
    fields.forEach((key, index) => view.setInt32(index * 4, this.current[key], true));
    view.setInt32(20, this.write, true); view.setInt32(24, this.read, true);
    this.slots.forEach((slot, index) => {
      ['progress', 'id', 'rate', 'loop', 'span'].forEach((key, field) =>
        view.setInt32(28 + index * 20 + field * 4, slot?.[key] ?? 0, true));
    });
    return bytes;
  }
  restoreReplayState(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 0x15c)
      throw new RangeError('Invalid native animation replay record');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const write = view.getInt32(20, true), read = view.getInt32(24, true);
    if (write < 0 || write > 15 || read < 0 || read > 15)
      throw new RangeError('Invalid native animation ring cursor');
    this.current = Object.fromEntries(['id', 'progress', 'rate', 'loop', 'span'].map((key, index) => [key, view.getInt32(index * 4, true)]));
    this.slots = Array.from({ length: 16 }, (_, index) => Object.fromEntries(
      ['progress', 'id', 'rate', 'loop', 'span'].map((key, field) => [key, view.getInt32(28 + index * 20 + field * 4, true)])));
    this.write = write; this.read = read;
    return this;
  }
  snapshot() {
    const c = this.current;
    return [c.id, c.progress, c.rate, c.loop, c.span, this.write, this.read];
  }
}
