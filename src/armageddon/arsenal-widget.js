import { nativeSpecialCrateContent } from './crate-draw.js';

// Weapon panel ("arsenal") widget, vtable 005277C8, created by 004E5380 as
// new(0x170) + 00500170(scene, team) and stored at controller+0x110.
// Every routine is expressed as an ordered list of draw requests on the
// arsenal bitmap (scene+0xAC, an 8-bit 256x480 bitmap of class 005249B0):
// ["rect", x0, y0, x1, y1, c] (00493130), ["horizontal", x0, x1, y, c]
// (00493260) and ["vertical", x, y0, y1, c] (00493310) all have EXCLUSIVE
// end coordinates for this class (executed; see nativeRasterizeArsenal),
// ["pixel", x, y, c] (0048B780; c = 0 is palette index 0), ["image", dx,
// dy, w, h, image, sx, sy, flags] (vtable+0x4C 00493380, copy w*h from the
// source at sx, sy; host-drawn) and ["text", font, x, y, string] (renderer
// scene+8 vtable+0x24; host-drawn).
//
// Host interface (all values are what the original reads):
//   ammo(slot)            004C2EE0(team, slot): usable count, 0 none
//   delay(slot)           004C3050(team, slot): turns until available
//   teamFlags()           004C29C0(team): active utility bits
//   weapon(slot)          weapon entry scene+0x125BC+slot*0x208:
//                         {name (+4), category (+0x48), kind (+0x68),
//                          subtype (+0x6C), flagBit (+0x74)}
//   icon(slot, variant)   scene+0xB8+slot*8+variant*4: 0 = lo\, 1 = hi\ IMG
//                         handle (falsy when not loaded)
//   fontHeight(font, ch)  renderer vtable+0x28
//   bitmapSize()          arsenal bitmap vtable+0x14 -> [width, height]
//   categoryLabel0        global 0056FAF8[0], set by the constructor from
//                         scene+0x1C vtable+0x40 (row label for category 0)
//   colors                {red, blue, grey, black, white} = 004EDB70
//                         colour(1), (2), (7), (8), (9) = scene+0x12438,
//                         +0x1243C, +0x12450, +0x12454, +0x12458

export const ARSENAL_COLUMNS = 5;
export const ARSENAL_CELL_PITCH = 29;
export const ARSENAL_ICON_SIZE = 24;
const ROW_LABELS = ['', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];
const FONT_LABEL = 8, FONT_LABEL_HOVER = 7, FONT_NAME = 15, FONT_DELAYED = 9;
const clamp = (v, lo, hi) => (lo > v ? lo : (hi < v ? hi : v)); // 0049BF90
const div = (a, b) => Math.trunc((a | 0) / b) | 0;

// 00500170. Fields not set by the constructor (labelX, grid, row
// categories) start as host garbage; callers always measure first.
export function nativeCreateArsenalWidget(team, initial = {}) {
  return {
    team, width: 0, height: 0, hoverCol: 0, hoverRow: 0, pointerX: 0, pointerY: 0,
    labelX: initial.labelX ?? 0, cellLeft: 0, cellTop: 0,
    grid: initial.grid ? [...initial.grid] : new Array(65).fill(0),
    rowCategories: initial.rowCategories ? [...initial.rowCategories] : new Array(13).fill(0),
    cols: -1, rows: -1,
  };
}

// 00500B20 / 005010C2 inline test: a slot cannot be chosen while delayed,
// or when it is a kind-4 subtype-0x13 utility whose team flag is active.
export function nativeArsenalSlotBlocked(slot, host) {
  if (host.delay(slot)) return true;
  const weapon = host.weapon(slot);
  return weapon.kind === 4 && weapon.subtype === 0x13 && !!(host.teamFlags() & (1 << weapon.flagBit));
}

const rowLabel = (widget, row, host) => {
  const category = widget.rowCategories[row];
  return category === 0 ? host.categoryLabel0 : ROW_LABELS[category];
};

// 00500290: draw one cell, highlighted or not.
export function nativeArsenalCell(widget, col, row, highlighted, host, out = []) {
  if (col < 0 || col >= widget.cols || row < 0 || row >= widget.rows) return out;
  const x = (widget.cellLeft + col * ARSENAL_CELL_PITCH) | 0;
  const y = (widget.cellTop + row * ARSENAL_CELL_PITCH + 4) | 0;
  const slot = widget.grid[row * 5 + col];
  let color;
  if (!highlighted) color = host.colors.black;
  else if (!slot || nativeArsenalSlotBlocked(slot, host)) color = host.colors.grey;
  else if (nativeSpecialCrateContent(slot)) color = host.colors.red;
  else if (slot >= 0x3e && slot <= 0x46) color = host.colors.blue; // 004AA990
  else color = host.colors.white;
  out.push(['horizontal', x - 1, x + 25, y - 1, color], ['horizontal', x - 1, x + 25, y + 24, color],
    ['vertical', x - 1, y - 1, y + 24, color], ['vertical', x + 24, y - 1, y + 24, color]);
  out.push(['text', highlighted ? FONT_LABEL_HOVER : FONT_LABEL, widget.labelX, y, rowLabel(widget, row, host)]);
  let variant = highlighted ? 1 : 0;
  if (!host.icon(slot, variant)) return out;
  const blocked = nativeArsenalSlotBlocked(slot, host);
  if (blocked) variant = 0;
  out.push(['image', x, y, ARSENAL_ICON_SIZE, ARSENAL_ICON_SIZE, host.icon(slot, variant), 4, 4, 0]);
  if (blocked) {
    for (let dy = 0; dy < 24; dy++)
      for (let dx = 0; dx < 24; dx++) if ((dx ^ dy) & 1) out.push(['pixel', x + dx, y + dy, 0]);
  }
  return out;
}

// 005006B0: clear the bottom line and write the hovered weapon's name.
export function nativeArsenalName(widget, col, row, host, out = []) {
  const textHeight = host.fontHeight(FONT_NAME, 32) | 0;
  const top = (widget.height - textHeight - 3) | 0;
  out.push(['rect', 3, top, widget.width - 3, top + textHeight, host.colors.black]);
  if (col < 0 || col >= widget.cols || row < 0 || row >= widget.rows) return out;
  const slot = widget.grid[row * 5 + col];
  if (!slot) return out;
  const name = host.weapon(slot).name;
  let ammo = host.ammo(slot) | 0;
  if (ammo > 99) ammo = -1;
  const delay = host.delay(slot) | 0;
  if (delay) {
    out.push(['text', FONT_DELAYED, widget.labelX, top, `${name}(${delay})`]);
    return out;
  }
  out.push(['text', FONT_NAME, widget.labelX, top, name]);
  if (ammo > 0) out.push(['text', FONT_NAME, widget.width - 30, top, `x${ammo}`]);
  return out;
}

// 00500B20 (vtable+0xC): rebuild the grid and compose the whole bitmap.
export function nativeArsenalMeasure(widget, host, out = []) {
  widget.labelX = 6; widget.cellLeft = 36; widget.cellTop = 0;
  widget.grid.fill(0); widget.cols = 0; widget.rows = 0;
  let rows = 0;
  for (let category = 0; category < 13; category++) {
    let count = 0;
    for (let slot = 1; slot <= 70 && count < 5; slot++) {
      const ammo = host.ammo(slot), delay = host.delay(slot);
      if ((ammo || delay) && host.weapon(slot).category === category) widget.grid[rows * 5 + count++] = slot;
    }
    if (widget.cols < count) widget.cols = count;
    if (count) widget.rowCategories[rows++] = category;
  }
  widget.rows = rows; widget.cols = ARSENAL_COLUMNS;
  const textHeight = host.fontHeight(FONT_NAME, 32) | 0;
  let width = (widget.cols * 29 + widget.cellLeft - 1) | 0;
  let height = (rows * 29 + widget.cellTop + 6 + textHeight) | 0;
  const [bitmapWidth, bitmapHeight] = host.bitmapSize();
  if (bitmapWidth < width) width = bitmapWidth;
  if (bitmapHeight < height) height = bitmapHeight;
  widget.width = width; widget.height = height;
  const { grey, black } = host.colors;
  out.push(['rect', 0, 0, width, height, black]);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < widget.cols; col++) nativeArsenalCell(widget, col, row, 0, host, out);
    out.push(['text', FONT_LABEL, widget.labelX, widget.cellTop + row * 29 + 4, rowLabel(widget, row, host)]);
  }
  for (let row = 0; row <= rows; row++) out.push(['horizontal', 1, width - 1, widget.cellTop + row * 29 + 1, grey]);
  for (let col = 0; col < widget.cols; col++)
    out.push(['vertical', widget.cellLeft + col * 29 - 3, 1, rows * 29 + widget.cellTop + 2, grey]);
  out.push(['horizontal', 1, width - 1, 0, grey], ['horizontal', 1, width - 1, 1, grey],
    ['horizontal', 1, width - 1, height - 2, grey], ['horizontal', 1, width - 1, height - 1, grey],
    ['vertical', 0, 1, height - 1, grey], ['vertical', 1, 1, height - 1, grey],
    ['vertical', width - 2, 1, height - 1, grey], ['vertical', width - 1, 1, height - 1, grey],
    ['pixel', 2, 2, grey], ['pixel', width - 3, 2, grey], ['pixel', 2, height - 3, grey], ['pixel', width - 3, height - 3, grey]);
  widget.hoverCol = -1; widget.hoverRow = -1;
  return { width, height, requests: out };
}

// 00500880 (inline in 00500960/00500A40/00500FD0): panel pixel -> cell.
export function nativeArsenalCellAt(widget, x, y) {
  return [clamp(div(x - widget.cellLeft, 29), 0, widget.cols - 1), clamp(div(y - widget.cellTop - 4, 29), 0, widget.rows - 1)];
}

// 00500960 (vtable+8): move the pointer by whole cells and snap it to the
// cell's cursor anchor (cell origin + 20, + 20).
export function nativeArsenalLayout(widget, x, y, dCol, dRow) {
  const [col0, row0] = nativeArsenalCellAt(widget, x, y);
  const col = clamp((col0 + dCol) | 0, 0, widget.cols - 1), row = clamp((row0 + dRow) | 0, 0, widget.rows - 1);
  return [(col * 29 + widget.cellLeft + 20) | 0, (row * 29 + widget.cellTop + 24) | 0];
}

// 00500A40 (vtable+4): hover the cell under the pointer.
export function nativeArsenalPosition(widget, x, y, host, out = []) {
  const [col, row] = nativeArsenalCellAt(widget, x, y);
  if (widget.hoverCol === col && widget.hoverRow === row) return out;
  if (widget.hoverCol >= 0 && widget.hoverRow >= 0) nativeArsenalCell(widget, widget.hoverCol, widget.hoverRow, 0, host, out);
  if (col < 0 || row < 0) return out;
  nativeArsenalCell(widget, col, row, 1, host, out);
  nativeArsenalName(widget, col, row, host, out);
  widget.hoverCol = col; widget.hoverRow = row; widget.pointerX = x; widget.pointerY = y;
  return out;
}

// 00500FD0 (vtable+0x10): slot under the last stored pointer, 0 if none
// or blocked.
export function nativeArsenalSelection(widget, host) {
  if (widget.cols <= 0 || widget.rows <= 0) return 0;
  const [col, row] = nativeArsenalCellAt(widget, widget.pointerX, widget.pointerY);
  const slot = widget.grid[row * 5 + col];
  if (!slot) return 0;
  return nativeArsenalSlotBlocked(slot, host) ? 0 : slot;
}

// 004FFED0 / 004FFFE0: team status strip at controller+0x114, built with
// (scene+0x2B0, 8, 2, 2, 30, 30, colour(7), colour(8)). scene+0x2B0 is the
// lo\ icon of slot 63, so bit i of the team flags shows slot 63+i's lo icon
// cropped 28x28 from (2, 2). Returns null (no image) for an empty mask;
// an unchanged mask reuses the cached size without drawing.
export function nativeCreateTeamStatusStrip(frame, background, icons, count = 8, left = 2, top = 2, right = 30, bottom = 30) {
  return { icons, count, left, top, cellWidth: right - left, cellHeight: bottom - top, frame, background, mask: 0, width: 0, height: 0 };
}
export function nativeTeamStatusStrip(strip, mask, out = []) {
  mask |= 0;
  if (!mask) return null;
  if (strip.mask === mask) return { width: strip.width, height: strip.height, requests: out };
  let shown = 0;
  for (let i = 0; i < strip.count; i++) if (mask & (1 << i) && strip.icons[i]) shown++;
  const width = (strip.cellWidth * shown + 2) | 0, height = (strip.cellHeight + 2) | 0;
  strip.width = width; strip.height = height;
  out.push(['rect', 0, 0, width, height, strip.background],
    ['horizontal', 1, width - 1, 0, strip.frame], ['vertical', 0, 1, height - 1, strip.frame],
    ['vertical', width - 1, 1, height - 1, strip.frame], ['horizontal', 1, width - 1, height - 1, strip.frame],
    ['pixel', 0, 0, 0], ['pixel', width - 1, 0, 0], ['pixel', 0, height - 1, 0], ['pixel', width - 1, height - 1, 0]);
  for (let i = 0, k = 0; i < strip.count; i++) {
    if (!(mask & (1 << i)) || !strip.icons[i]) continue;
    out.push(['image', strip.cellWidth * k++ + 1, 1, strip.cellWidth, strip.cellHeight, strip.icons[i], strip.left, strip.top, 0]);
  }
  strip.mask = mask;
  return { width, height, requests: out };
}

// Rasterize the primitive requests exactly as the 005249B0 bitmap does,
// into an 8-bit index buffer clipped to width x height. Image and text
// requests are passed to drawImage/drawText (host rasterisation).
export function nativeRasterizeArsenal(requests, width, height, pixels = new Uint8Array(width * height), host = {}) {
  const put = (x, y, c) => { if (x >= 0 && x < width && y >= 0 && y < height) pixels[y * width + x] = c & 255; };
  for (const r of requests) {
    const [kind, a, b, c, d, e] = r;
    if (kind === 'rect') { for (let y = Math.max(b, 0); y < Math.min(d, height); y++) for (let x = Math.max(a, 0); x < Math.min(c, width); x++) pixels[y * width + x] = e & 255; }
    else if (kind === 'horizontal') { if (a < b) for (let x = a; x < b; x++) put(x, c, d); }
    else if (kind === 'vertical') { if (b < c) for (let y = b; y < c; y++) put(a, y, d); }
    else if (kind === 'pixel') put(a, b, c);
    else if (kind === 'image') host.drawImage?.(pixels, width, height, ...r.slice(1));
    else if (kind === 'text') host.drawText?.(pixels, width, height, ...r.slice(1));
  }
  return pixels;
}
