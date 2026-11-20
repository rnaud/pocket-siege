import {
  nativeCreateArsenalWidget, nativeArsenalMeasure, nativeArsenalLayout,
  nativeArsenalPosition, nativeArsenalSelection,
} from "./armageddon/arsenal-widget.js";
import { nativeInitializeWeaponRecords } from "./armageddon/weapon-initialization.js";
import localized from "./armageddon/localized-names.json";
import schemeWeapons from "./armageddon/scheme-weapon-data.json";
import iconTable from "./armageddon/hud-resource-table.json";
import { originalHUDIcon } from "./armageddon/hud-icons.js";
import { loadNativeFont, rasterNativeText } from "./armageddon/font.js";
import { originalVisual } from "./armageddon/art.js";
import { fixedMultiply } from "./armageddon/numeric.js";
import { nativeSpriteFrame } from "./armageddon/animation.js";

// Live weapon panel for the original desktop layout. The widget routines
// (00500170/00500B20/00500960/00500A40/00500FD0), slide and cursor rules
// (004E5F70, 00501370) and placement (004E5BF0) are the recovered ones; this
// file adapts them to a canvas and to the host inventory.

// 004A68E0 palette roles used by the widget (colour(1), (2), (7), (8), (9)).
const COLORS = { red: 1, blue: 2, grey: 7, black: 8, white: 9 };
const PALETTE = { 1: [255, 128, 128], 2: [128, 128, 255], 7: [157, 157, 157], 8: [0, 0, 0], 9: [255, 255, 255] };
// Renderer font ids used by the widget: smlwht1/smlwht2/stdred1/stdwht1.
const FONT_NAMES = { 7: "smlwht1", 8: "smlwht2", 9: "stdred1", 15: "stdwht1" };
// scene+0xAC: the 256x480 arsenal bitmap.
const BITMAP = [256, 480];

let weaponTable = null;
// 004B90A0 names each slot through the 005259C8 localisation getters; the
// numeric fields (+0x48 category, +0x68 kind, +0x6C subtype, +0x74 flag bit)
// come from the default scheme 195 records.
function weapons() {
  if (weaponTable) return weaponTable;
  const memory = new Uint8Array(0x40000);
  memory[0x11c98] = 100; memory[0x11cde] = 100; // nonzero override divisors
  nativeInitializeWeaponRecords(memory, (method) =>
    Uint8Array.from(localized.strings[method / 4] ?? "", (c) => c.charCodeAt(0)));
  const records = schemeWeapons.schemes.find((scheme) => scheme.resource_id === 195).weapons;
  weaponTable = Array.from({ length: 71 }, (_, slot) => {
    let name = "", offset = 0x125bc + slot * 0x208 + 4;
    while (memory[offset]) name += String.fromCharCode(memory[offset++]);
    const fields = records[slot] ?? [];
    return { name, category: fields[0] | 0, kind: fields[8] | 0, subtype: fields[9] | 0, flagBit: fields[11] | 0 };
  });
  return weaponTable;
}
const iconBySlot = new Map(iconTable.map(([slot, file]) => [slot, file.replace(/\.img$/, "")]));

const fonts = new Map();
export async function loadNativeArsenalFonts() {
  await Promise.all(Object.entries(FONT_NAMES).map(async ([id, name]) =>
    fonts.set(Number(id), await loadNativeFont(name))));
}

const abs32 = (v) => ((v ^ (v >> 31)) - (v >> 31)) | 0;
// 004E5F70 panel slide: 0x1333 per frame, snapping inside 0x1334.
function slide(current, target) {
  if (abs32((target - current) | 0) < 0x1334) return target;
  return (current + (target < current ? -0x1333 : 0x1333)) | 0;
}

// host: { team(), ammo(slot), delay(slot), teamFlags(), canOpen(), select(slot), sound(id) }
export function createNativeArsenalPanel(arena, host) {
  const canvas = document.createElement("canvas");
  canvas.className = "native-arsenal";
  canvas.setAttribute("role", "listbox");
  canvas.setAttribute("aria-label", "Weapons");
  canvas.hidden = true;
  const cursor = document.createElement("canvas");
  cursor.className = "native-arsenal-cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.hidden = true;
  arena.append(canvas, cursor);
  const context = canvas.getContext("2d");
  const text = document.createElement("canvas");
  let widget = nativeCreateArsenalWidget(0);
  let open = 0, progress = 0, dirty = false, signature = "";
  const pointer = [0, 0]; // scene+0x1246C/0x12470 (and the 0x12474 copy)

  const widgetHost = () => ({
    ammo: (slot) => host.ammo(slot),
    delay: (slot) => host.delay(slot),
    teamFlags: () => host.teamFlags(),
    weapon: (slot) => weapons()[slot] ?? { name: "", category: -1, kind: 0, subtype: 0, flagBit: 0 },
    icon: (slot, variant) => {
      const name = iconBySlot.get(slot);
      return name ? originalHUDIcon(name, variant ? "hi" : "lo") : null;
    },
    fontHeight: (font) => fonts.get(font)?.height ?? 0,
    bitmapSize: () => BITMAP,
    categoryLabel0: localized.strings[0x40 / 4],
    colors: COLORS,
  });
  const rgb = (index) => `rgb(${(PALETTE[index] ?? [0, 0, 0]).join(",")})`;
  // Requests use exclusive end coordinates; index 0 is the transparent key.
  function paint(requests) {
    for (const request of requests) {
      const [kind] = request;
      if (kind === "rect" || kind === "horizontal" || kind === "vertical" || kind === "pixel") {
        let x0, y0, x1, y1, color;
        if (kind === "rect") [, x0, y0, x1, y1, color] = request;
        else if (kind === "horizontal") { [, x0, x1, y0, color] = request; y1 = y0 + 1; }
        else if (kind === "vertical") { [, x0, y0, y1, color] = request; x1 = x0 + 1; }
        else { [, x0, y0, color] = request; x1 = x0 + 1; y1 = y0 + 1; }
        if (x1 <= x0 || y1 <= y0) continue;
        if (color === 0) context.clearRect(x0, y0, x1 - x0, y1 - y0);
        else { context.fillStyle = rgb(color); context.fillRect(x0, y0, x1 - x0, y1 - y0); }
      } else if (kind === "image") {
        const [, dx, dy, w, h, image, sx, sy] = request;
        if (image) context.drawImage(image, sx, sy, w, h, dx, dy, w, h);
      } else if (kind === "text") {
        const [, id, x, y, string] = request;
        const font = fonts.get(id);
        if (!font || !string) continue;
        const raster = rasterNativeText(font, string);
        if (!raster.width) continue;
        text.width = raster.width; text.height = raster.height;
        text.getContext("2d").putImageData(new ImageData(raster.pixels, raster.width, raster.height), 0, 0);
        context.drawImage(text, x, y);
      }
    }
  }
  function measure() {
    const hostApi = widgetHost();
    widget = nativeCreateArsenalWidget(host.team());
    const { width, height, requests } = nativeArsenalMeasure(widget, hostApi);
    canvas.width = Math.max(1, width); canvas.height = Math.max(1, height);
    context.imageSmoothingEnabled = false;
    paint(requests);
    // 004E5F70: reset the cursor and place it on the first cell's anchor.
    const position = nativeArsenalLayout(widget, 0, 0, 0, 0);
    pointer[0] = position[0] << 16; pointer[1] = position[1] << 16;
  }
  const inventorySignature = () => {
    let value = `${host.team()}:${host.teamFlags()}`;
    for (let slot = 1; slot <= 70; slot++) value += `,${host.ammo(slot)}/${host.delay(slot)}`;
    return value;
  };
  const panel = {
    get open() { return open !== 0; },
    // 005011F0: right click opens only when a slot 1..70 is available.
    toggle() {
      if (open) { panel.close(); return; }
      if (!host.canOpen()) return;
      let slot = 1;
      while (slot < 71 && !(host.ammo(slot) && !host.delay(slot))) slot++;
      if (slot === 71) return;
      open = 65536; dirty = true;
    },
    close() { open = 0; },
    // 00501370: relative motion moves the cursor, clamped to the panel.
    move(dx, dy) {
      if (!open || dirty) return;
      pointer[0] = Math.min(Math.max(0, (pointer[0] + (dx << 16)) | 0), widget.width << 16);
      pointer[1] = Math.min(Math.max(0, (pointer[1] + (dy << 16)) | 0), widget.height << 16);
    },
    // Left click: sound 0x77 with a selection (event 0x41B), else 0x78.
    click() {
      if (!open || dirty) return false;
      const slot = nativeArsenalSelection(widget, widgetHost());
      host.sound(slot ? 0x77 : 0x78);
      if (slot) { panel.close(); host.select(slot); }
      return true;
    },
    // 004E5F70 at 50 Hz: slide, refresh when dirty, hover under the cursor.
    tick() {
      progress = slide(progress, open);
      if (!open) return;
      const next = inventorySignature();
      if (next !== signature) { signature = next; dirty = true; }
      if (dirty) { measure(); dirty = false; }
      paint(nativeArsenalPosition(widget, pointer[0] >> 16, pointer[1] >> 16, widgetHost()));
    },
    // 004E5BF0: centre (W/2-w/2-10 + (w+30)(1-progress), H/2-h/2-23) in
    // screen-centred coordinates; the cursor sits at panel+10+pointer.
    render(width, height, cursorName) {
      const visible = progress !== 0 && widget.width > 0;
      canvas.hidden = cursor.hidden = !visible;
      if (!visible) return;
      const half = (v) => Math.trunc(v / 2);
      const x = ((((half(width) - half(widget.width) - 10) << 16) +
        fixedMultiply((widget.width + 30) << 16, (65536 - progress) | 0)) | 0) >> 16;
      const y = half(height) - half(widget.height) - 23;
      const left = half(width) + x - half(widget.width), top = half(height) + y - half(widget.height);
      canvas.style.left = `${left}px`; canvas.style.top = `${top}px`;
      canvas.style.width = `${canvas.width}px`; canvas.style.height = `${canvas.height}px`;
      // 004E5BF0 draws the team cursor at fixed progress 0xA000.
      const info = originalVisual(cursorName);
      const frameIndex = info ? nativeSpriteFrame(info.count, info.flags, 0xa000) : 0;
      const frame = info && originalVisual(cursorName, frameIndex);
      if (!frame?.map?.image) { cursor.hidden = true; return; }
      const image = frame.map.image;
      const key = `${cursorName}:${frameIndex}`;
      if (cursor.width !== image.width || cursor.height !== image.height || cursor.dataset.name !== key) {
        cursor.width = image.width; cursor.height = image.height; cursor.dataset.name = key;
        cursor.getContext("2d").clearRect(0, 0, image.width, image.height);
        cursor.getContext("2d").drawImage(image, 0, 0);
      }
      const cx = left + 10 + (pointer[0] >> 16), cy = top + 10 + (pointer[1] >> 16);
      cursor.style.left = `${cx - half(image.width)}px`; cursor.style.top = `${cy - half(image.height)}px`;
      cursor.style.width = `${image.width}px`; cursor.style.height = `${image.height}px`;
      const hovered = widget.hoverRow >= 0 && widget.hoverCol >= 0
        ? widget.grid[widget.hoverRow * 5 + widget.hoverCol] : 0;
      canvas.setAttribute("aria-valuetext", hovered ? weapons()[hovered].name : "");
    },
    state: () => ({ open: open !== 0, progress, pointer: [...pointer], width: widget.width, height: widget.height,
      rows: widget.rows, hover: [widget.hoverCol, widget.hoverRow] }),
  };
  return panel;
}
export const nativeArsenalWeapons = () => weapons();
