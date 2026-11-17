import { nativePaletteBlend } from './environment-palette.js';

// Canvas presentation of 004A27B0. Keep source pixels separate from display
// pixels, just as the executable copies each palette before blending it.
export class NativeCanvasPaletteDisplay {
  constructor() {
    this.canvases = new WeakMap();
    this.records = new Set();
    this.cached = [];
    this.update();
  }
  update({ flash = 0, fade = 0, dark = 0, extra = 0 } = {}) {
    const clamp = value => Math.max(0, Math.min(65536, value));
    const values = [clamp(flash), clamp(fade), clamp(Math.max(dark, extra))];
    if (values.every((value, index) => value === this.cached[index])) return;
    this.cached = values;
    this.tables = [1, 2, 3].map(bank => {
      const colors = Array.from({ length: 256 }, (_, value) => [value, value, value]);
      if (bank === 2) nativePaletteBlend(colors, 0, 255, [255, 255, 255], values[0]);
      nativePaletteBlend(colors, 0, 255, [255, 255, 255], values[1]);
      nativePaletteBlend(colors, 0, 255, [0, 0, 0], values[2]);
      return Uint8Array.from(colors, color => color[0]);
    });
    for (const record of this.records) {
      const canvas = record.canvas.deref();
      if (canvas) this.paint(canvas, record);
      else this.records.delete(record);
    }
  }
  // Call only after a complete source redraw, never on already tinted pixels.
  capture(canvas, bank = 1, bounds = null) {
    if (!canvas.width || !canvas.height) return;
    let record = this.canvases.get(canvas);
    if (!record) {
      record = { canvas: new WeakRef(canvas) };
      this.canvases.set(canvas, record);
      this.records.add(record);
    }
    record.bank = bank;
    record.width = canvas.width;
    record.height = canvas.height;
    const [x, y, width, height] = bounds ?? [0, 0, canvas.width, canvas.height];
    record.x = x;
    record.y = y;
    record.source = width > 0 && height > 0
      ? canvas.getContext('2d').getImageData(x, y, width, height) : null;
    record.output = record.source ? canvas.getContext('2d').createImageData(width, height) : null;
    this.paint(canvas, record);
  }
  paint(canvas, record) {
    const { source, output, bank } = record;
    // A resized canvas is blank until its owner supplies new source pixels.
    if (!source || canvas.width !== record.width || canvas.height !== record.height) return;
    const table = this.tables[bank - 1];
    for (let i = 0; i < source.data.length; i += 4) {
      output.data[i] = table[source.data[i]];
      output.data[i + 1] = table[source.data[i + 1]];
      output.data[i + 2] = table[source.data[i + 2]];
      output.data[i + 3] = source.data[i + 3];
    }
    canvas.getContext('2d').putImageData(output, record.x, record.y);
  }
}
export const nativeCanvasPaletteDisplay = new NativeCanvasPaletteDisplay();
