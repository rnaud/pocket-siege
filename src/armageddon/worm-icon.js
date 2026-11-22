import { fixedMultiply } from "./numeric.js";

// The equipped weapon's lo\ icon that floats above a worm (worm task
// +0x35C icon handle, +0x370 progress, +0x374 target, +0x358 panel).

// 004DE12E..004DE1D7: holding an instant utility out (state 0x67, kind 4,
// subtypes 5, 0x13, 0x15..0x18) or roping/bungee (0x7B/0x7C) targets size
// 1; jetpack flight (0x78) and parachuting (0x7D) target 2, which rises
// higher. A new icon restarts from nothing; no weapon clears all three.
const READY_SUBTYPES = new Set([5, 0x13, 0x15, 0x16, 0x17, 0x18]);
export function nativeWormIconUpdate(body, icon) {
  let size = 0;
  if (body.slot) {
    if (body.state === 0x67) size = body.kind === 4 && READY_SUBTYPES.has(body.subtype) ? 1 : 0;
    else if (body.state === 0x78 || body.state === 0x7d) size = 2;
    else if (body.state === 0x7b || body.state === 0x7c) size = 1;
  }
  if (!size) return { value: 0, progress: 0, target: 0 };
  const value = icon(body.slot) | 0;
  return { value, progress: body.value === value ? body.progress | 0 : 0, target: size << 16 };
}

// 004EDA70: move a tenth of the gap (0x1999), at least `minimum`, landing
// exactly once within one step.
export function nativeIconEase(current, target, minimum = 0x1999) {
  current |= 0; target |= 0;
  let step = Math.abs(fixedMultiply((target - current) | 0, 0x1999));
  if (step < minimum) step = minimum;
  if (Math.abs(target - current) <= step) return target;
  return (current <= target ? current + step : current - step) | 0;
}

// 004D8A00: an icon is drawn while it has progress, a handle and weapon
// input enabled (+0x2A0). It rises 8 + 20*progress pixels and drifts
// 20*progress toward the facing side; the border blinks grey (7) / white (9)
// every 25 ticks over black (8). Images are centred on (x, y).
export function nativeWormIconDraw(body) {
  if (!body.progress || !body.value || !body.ready) return null;
  const rise = Math.imul(body.progress, 20);
  return {
    image: body.value, progress: body.progress,
    border: Math.trunc(body.tick / 25) & 1 ? 7 : 9, fill: 8,
    order: (Math.imul(body.rank, 4) + 0xd00ff) | 0,
    x: (body.x + fixedMultiply(body.facing << 16, rise)) | 0,
    y: (body.y - rise - 0x80000) | 0,
  };
}

// 004FD690 over the 2,2..30,30 crop set up by 004D664F: the shown size is
// 28 * clamp(progress, 0, 1) rounded down to even, framed by a one-pixel
// border with transparent corners; the crop stays centred on the icon.
// Repeating the last size, image and colours draws nothing new.
export function nativeWormIconPanel(cache, image, progress, border, fill) {
  const scale = Math.min(Math.max(progress | 0, 0), 0x10000);
  const inner = fixedMultiply(28, scale) & ~1;
  const width = inner + 2, height = inner + 2;
  if (cache.size === inner && cache.image === image && cache.border === border && cache.fill === fill)
    return { width, height, calls: [] };
  Object.assign(cache, { size: inner, image, border, fill });
  const offset = 2 + ((28 - inner) >> 1);
  return { width, height, calls: [
    ["fill", 0, 0, width, height, fill],
    ["hline", 1, width - 1, 0, border],
    ["vline", 0, 1, height - 1, border],
    ["vline", width - 1, 1, height - 1, border],
    ["hline", 1, width - 1, height - 1, border],
    ["pixel", 0, 0, 0], ["pixel", width - 1, 0, 0], ["pixel", 0, height - 1, 0], ["pixel", width - 1, height - 1, 0],
    ["blit", 1, 1, inner, inner, image, offset, offset, 0],
  ] };
}

// Applies a panel's calls to a canvas: palette indices map through
// `colors`, 0 is transparent, `source(image)` gives the lo\ icon canvas.
export function paintNativeWormIcon(canvas, panel, colors, source) {
  if (!panel.calls.length) return;
  canvas.width = panel.width;
  canvas.height = panel.height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const rgb = (index) => `rgb(${(colors[index] ?? [0, 0, 0]).join(",")})`;
  for (const [kind, ...a] of panel.calls) {
    if (kind === "fill") { ctx.fillStyle = rgb(a[4]); ctx.fillRect(a[0], a[1], a[2] - a[0], a[3] - a[1]); }
    else if (kind === "hline") { ctx.fillStyle = rgb(a[3]); ctx.fillRect(a[0], a[2], a[1] - a[0], 1); }
    else if (kind === "vline") { ctx.fillStyle = rgb(a[3]); ctx.fillRect(a[0], a[1], 1, a[2] - a[1]); }
    else if (kind === "pixel") ctx.clearRect(a[0], a[1], 1, 1);
    else if (kind === "blit") {
      const image = source(a[4]);
      if (image && a[2] > 0) ctx.drawImage(image, a[5], a[6], a[2], a[3], a[0], a[1], a[2], a[3]);
    }
  }
}
