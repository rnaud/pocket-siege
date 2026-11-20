import { test, expect as playwrightExpect } from "@playwright/test";
import { fastExpect } from "./helpers/fast-expect.js";
// Fixture loops make thousands of assertions: skip Playwright step bookkeeping for passing ones.
const expect = fastExpect(playwrightExpect);
import fixture from "./fixtures/armageddon/arsenal-widget.json" with { type: "json" };
import {
  nativeCreateArsenalWidget, nativeArsenalMeasure, nativeArsenalLayout, nativeArsenalPosition,
  nativeArsenalSelection, nativeCreateTeamStatusStrip, nativeTeamStatusStrip, nativeRasterizeArsenal,
} from "../src/armageddon/arsenal-widget.js";

// The oracle packs consecutive same-colour pixel writes losslessly.
function packed(requests) {
  const out = [];
  for (const r of requests) {
    const last = out[out.length - 1];
    if (r[0] === "pixel" && last?.[0] === "pixels" && last[1] === r[3]) last[2].push(r[1], r[2]);
    else if (r[0] === "pixel") out.push(["pixels", r[3], [r[1], r[2]]]);
    else out.push(r);
  }
  return out;
}
const recorded = (calls) => calls.map((c) => {
  if (c[0] !== "text") return c;
  expect(c[5]).toBe("widget");
  return c.slice(0, 5);
});
const colors = { red: fixture.colors[1], blue: fixture.colors[2], grey: fixture.colors[7], black: fixture.colors[8], white: fixture.colors[9] };

function caseHost(c, log) {
  const missing = new Set(c.missingIcons.map(([s, v]) => `${s}:${v}`));
  return {
    ammo: (slot) => c.ammo[slot], delay: (slot) => c.delay[slot], teamFlags: () => c.flags,
    weapon: (slot) => c.weapons[slot],
    icon: (slot, variant) => (slot >= 1 && slot <= 70 && !missing.has(`${slot}:${variant}`) ? 0x40000000 + slot * 2 + variant : 0),
    fontHeight: (font, ch) => { log.push(["fontHeight", font, ch]); return c.fontHeight; },
    bitmapSize: () => c.bitmap, categoryLabel0: "Util", colors,
  };
}

test("arsenal widget matches original 00500B20/00500960/00500A40/00500FD0", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(18);
  let checked = 0;
  for (const c of fixture.cases) {
    const k = c.constructed;
    const widget = nativeCreateArsenalWidget(fixture.team, { labelX: k.labelX, grid: k.grid, rowCategories: k.rowCategories });
    expect([widget.width, widget.height, widget.hoverCol, widget.hoverRow, widget.pointerX, widget.pointerY, widget.cols, widget.rows])
      .toEqual([k.width, k.height, ...k.hover, ...k.pointer, k.cols, k.rows]);
    for (const [index, o] of c.ops.entries()) {
      const where = `${c.name} #${index} ${JSON.stringify(o.op)}`;
      const log = [];
      const host = caseHost(c, log);
      let result = null;
      if (o.op[0] === "measure") { const m = nativeArsenalMeasure(widget, host, log); result = [m.width, m.height]; }
      else if (o.op[0] === "layout") result = nativeArsenalLayout(widget, ...o.op.slice(1));
      else if (o.op[0] === "position") nativeArsenalPosition(widget, o.op[1], o.op[2], host, log);
      else result = nativeArsenalSelection(widget, host);
      expect(result, where).toEqual(o.result);
      expect(packed(log), where).toEqual(recorded(o.calls));
      if (o.state) {
        expect([[widget.hoverCol, widget.hoverRow], [widget.pointerX, widget.pointerY]], where).toEqual([o.state.hover, o.state.pointer]);
        if (o.op[0] === "measure") {
          const s = o.state;
          expect({ width: widget.width, height: widget.height, labelX: widget.labelX, cellLeft: widget.cellLeft, cellTop: widget.cellTop,
            grid: widget.grid, rowCategories: widget.rowCategories, cols: widget.cols, rows: widget.rows }, where)
            .toEqual({ width: s.width, height: s.height, labelX: s.labelX, cellLeft: s.cellLeft, cellTop: s.cellTop,
              grid: s.grid, rowCategories: s.rowCategories, cols: s.cols, rows: s.rows });
        }
      }
      checked++;
    }
  }
  expect(checked).toBe(6744);
});

test("team status strip matches original 004FFFE0", { tag: "@logic" }, () => {
  expect(fixture.strips).toHaveLength(33);
  let strip = null, missingKey = null;
  for (const s of fixture.strips) {
    if (JSON.stringify(s.missing) !== missingKey) {
      missingKey = JSON.stringify(s.missing);
      const icons = Array.from({ length: 8 }, (_, i) => (s.missing.includes(i) ? 0 : 0x40000000 + (63 + i) * 2));
      strip = nativeCreateTeamStatusStrip(fixture.colors[7], fixture.colors[8], icons);
    }
    const out = [];
    const result = nativeTeamStatusStrip(strip, s.mask, out);
    const where = JSON.stringify([s.missing, s.mask]);
    expect(result ? "image" : 0, where).toBe(s.result);
    if (result) expect([result.width, result.height], where).toEqual(s.size);
    expect(packed(out), where).toEqual(s.calls);
    expect([strip.mask, strip.width, strip.height], where).toEqual(s.cache);
  }
});

test("arsenal primitives rasterize like the original 005249B0 bitmap class", { tag: "@logic" }, () => {
  expect(fixture.rasters).toHaveLength(4);
  for (const r of fixture.rasters) {
    const c = fixture.cases.find((k) => k.name === r.name);
    const requests = [];
    for (const o of c.ops) {
      if (o.op[0] !== "measure" && o.op[0] !== "position") continue;
      for (const call of o.calls) {
        if (call[0] === "pixels") for (let i = 0; i < call[2].length; i += 2) requests.push(["pixel", call[2][i], call[2][i + 1], call[1]]);
        else if (["rect", "horizontal", "vertical", "pixel"].includes(call[0])) requests.push(call);
      }
    }
    const used = requests.slice(0, 6000);
    expect(used.length, r.name).toBe(r.requests);
    const pixels = nativeRasterizeArsenal(used, r.width, r.height);
    expect(Buffer.from(pixels).toString("hex"), r.name).toBe(r.pixels);
  }
});
