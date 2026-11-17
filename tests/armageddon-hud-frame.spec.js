import windMeter from "./fixtures/armageddon/wind-meter.json" with { type: "json" };
import { nativeWindMeter, nativeWindMeterTick } from "../src/armageddon/wind-meter.js";
import windSelection from "./fixtures/armageddon/wind-selection.json" with { type: "json" };
import { nativeWindSelection } from "../src/armageddon/wind-selection.js";
import wormRotation from "./fixtures/armageddon/worm-rotation.json" with { type: "json" };
import { nativeWormRotation } from "../src/armageddon/worm-rotation.js";
import teamRotation from "./fixtures/armageddon/team-rotation.json" with { type: "json" };
import { nativeTeamRotationReset, nativeSelectNextTeam } from "../src/armageddon/team-rotation.js";
import turnStart from "./fixtures/armageddon/turn-start.json" with { type: "json" };
import { nativeTurnStart } from "../src/armageddon/turn-start.js";
import retreatRequest from "./fixtures/armageddon/retreat-request.json" with { type: "json" };
import { nativeRetreatRequest } from "../src/armageddon/retreat-request.js";
import actionBusy from "./fixtures/armageddon/action-busy.json" with { type: "json" };
import { nativeActionBusyWrite, nativeActionBusyClear, nativeActionGate } from "../src/armageddon/action-busy.js";
import retreat from "./fixtures/armageddon/retreat.json" with { type: "json" };
import { nativeRetreatTick } from "../src/armageddon/retreat.js";
import settlementEntry from "./fixtures/armageddon/settlement-entry.json" with { type: "json" };
import { nativeSettlementEntry } from "../src/armageddon/settlement-entry.js";
import busyCounter from "./fixtures/armageddon/busy-counter.json" with { type: "json" };
import { NativeBusyCounter } from "../src/armageddon/busy-counter.js";
import settlement from "./fixtures/armageddon/settlement-presentation.json" with { type: "json" };
import { nativeSettlementPresentation } from "../src/armageddon/settlement-presentation.js";
import paletteBanks from "./fixtures/armageddon/palette-banks.json" with { type: "json" };
import { NativePaletteBanks, createNativeGamePaletteBanks } from "../src/armageddon/palette-banks.js";
import gamePalette from "./fixtures/armageddon/game-palette.json" with { type: "json" };
import { NativeGamePalette } from "../src/armageddon/game-palette.js";
import environmentPalette from "./fixtures/armageddon/environment-palette.json" with { type: "json" };
import { nativeEnvironmentPalette } from "../src/armageddon/environment-palette.js";
import { nextLogicRandom } from "../src/armageddon/numeric.js";
import { nativePoisonAnnouncement, nativeKillAnnouncement, nativeCrateDropAnnouncement, nativeWormDeathAnnouncement, nativeVictorySpeech, nativeSuddenDeathAnnouncement, nativeMatchResultAnnouncement, nativeTeamEliminationAnnouncement, nativeAnnouncementAudioTick, nativeAnnouncementsPending, nativeAnnouncementDraw, nativeAnnouncementFrame, nativeAnnouncementMask, createNativeAnnouncements, queueNativeAnnouncement, nativeAnnouncementTick } from "../src/armageddon/announcements.js";
import { nativeTurnClockTick, nativeClockPresentationTick, nativeTimerFont, nativeClockFrame, nativeClockSlide } from "../src/armageddon/number-hud.js";
import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/hud-frame.json" with { type: "json" };
import { nativeTeamPanelSounds, nativeTeamListTick, nativeTeamListRows, sortNativeTeamList, removeNativeTeamListRow, nativeHUDFrame, nativeTeamHighlight, nativeTeamHealthTick, nativeTeamPanelTick, nativeTeamPanelVisibilityTick } from "../src/armageddon/hud-frame.js";
test("HUD frame drawing matches original executable requests", { tag: "@logic" }, () => {
  for (const row of actionBusy.writer) expect(nativeActionBusyWrite(row.input)).toEqual(row.result);
  for (const row of actionBusy.clear) expect(nativeActionBusyClear(row.input)).toEqual(row.result);
  for (const row of actionBusy.gate) expect(nativeActionGate(row.input)).toEqual(row.result);
  for (const row of windMeter.ticks) expect(nativeWindMeterTick(row.current, row.target)).toBe(row.result);
  for (const row of windMeter.cases) expect(nativeWindMeter(row.input)).toEqual(row.calls);
  for (const row of windSelection.cases) {
    let state = row.input.seed;
    const result = nativeWindSelection(row.input, () => (state = nextLogicRandom(state, row.input.frame)));
    expect({ ...result, randomState: state }).toEqual(row.result);
  }
  for (const row of wormRotation.cases) expect(nativeWormRotation(row.input)).toEqual(row.result);
  for (const row of teamRotation.reset) expect(nativeTeamRotationReset(row.input)).toEqual(row.result);
  for (const row of teamRotation.cases) expect(nativeSelectNextTeam(row.input)).toEqual(row.result);
  for (const row of turnStart.cases) expect(nativeTurnStart(row.input)).toEqual(row.result);
  for (const row of retreatRequest.cases) expect(nativeRetreatRequest(row.input)).toEqual(row.result);
  for (const row of retreat.cases) expect(nativeRetreatTick(row.input)).toEqual(row.result);
  for (const row of settlementEntry.cases) expect(nativeSettlementEntry(row.input)).toEqual(row.result);
  for (const row of busyCounter.cases) {
    const counter = new NativeBusyCounter(row.before);
    counter[row.operation](row.seconds);
    expect(counter.value).toBe(row.after);
    expect(counter.value).toBe(row.read);
  }
  for (const row of settlement.cases) expect(nativeSettlementPresentation(row.input)).toEqual(row.result);
  const bankState = manager => ({
    banks: manager.banks.map(palette => palette ? [palette.first, palette.last] : null),
    available: manager.available,
    references: manager.references,
  });
  for (const sequence of paletteBanks.cases) {
    const manager = new NativePaletteBanks();
    for (const { operation: [operation, bank, count], result, ...state } of sequence) {
      let value = null;
      if (operation === "references") manager.references[bank] = count;
      else if (operation === "release") value = manager.release(bank);
      else value = manager.allocate(bank, count, operation === "fail" ? () => null : undefined);
      expect(value).toBe(result);
      expect(bankState(manager)).toEqual(state);
    }
  }
  const banks = createNativeGamePaletteBanks();
  expect({ ...bankState(banks), blackIndex: banks.get(1).used[0], usedCount: banks.get(1).used.length }).toEqual(paletteBanks.setup);
  for (const row of gamePalette.cases) {
    const palette = new NativeGamePalette(row.first, row.last);
    for (const step of row.steps) expect(palette.add(step.color)).toBe(step.value);
    for (const read of row.reads) expect(palette.read(read.index)).toEqual(read.color);
    const entries = [];
    for (let entry; (entry = palette.next());) entries.push(entry);
    expect(entries).toEqual(row.entries);
    expect(palette.free).toEqual(row.free);
    expect(palette.dirty).toBe(row.dirty);
  }
  for (const row of environmentPalette.cases) {
    const sources = environmentPalette.ranges.map(([first, last]) => ({ first, last, colors: environmentPalette.colors }));
    const previous = { palettes: sources.map(() => environmentPalette.colors.map(() => [0, 0, 0])),
      cached: row.unchanged ? [row.input.flash, Math.max(row.input.dark, row.input.extra), row.input.fade] : [-1, -1, -1] };
    expect(nativeEnvironmentPalette(row.input, sources, previous)).toEqual({ palettes: row.palettes, cached: row.cached, calls: row.calls });
  }
  for (const c of fixture.killCases) {
    const stats = { turnKills: c.kills };
    let random = c.seed;
    const next = () => (random = nextLogicRandom(random, c.frame));
    expect(nativeKillAnnouncement(c.active ? stats : null, c.name, c.color, next)).toEqual(c.message);
    expect(stats.turnKills).toBe(c.remaining);
    expect(random).toBe(c.random);
  }
  for (const c of fixture.wormDeathCases) {
    let random = c.seed;
    const next = () => (random = nextLogicRandom(random, c.frame));
    expect(nativeWormDeathAnnouncement(c.name, c.color, c.drowned, next)).toEqual(c.message);
    expect(random).toBe(c.random);
  }
  for (const c of fixture.victorySpeechCases)
    expect(nativeVictorySpeech(c.totals)).toEqual(c.request);
  for (const c of fixture.eliminationCases) {
    let random = c.seed;
    const next = () => (random = nextLogicRandom(random, c.frame));
    expect(c.kind === "elimination" ? nativeTeamEliminationAnnouncement(c.name, c.color, next)
      : c.kind.endsWith("Drop") ? nativeCrateDropAnnouncement(c.kind.replace("Drop", ""), next)
      : c.kind === "poison" ? nativePoisonAnnouncement(c.name, next)
      : c.kind === "suddenDeath" ? nativeSuddenDeathAnnouncement(next)
      : nativeMatchResultAnnouncement(c.name, c.color, c.kind === "draw", next)).toEqual(c.message);
    expect(random).toBe(c.random);
  }
  for (const c of fixture.teamSoundCases) {
    const state = { ...c.before };
    expect(nativeTeamPanelSounds(state)).toEqual(c.calls);
    expect(state).toEqual(c.after);
  }
  for (const c of fixture.announcementAudioCases)
    expect(nativeAnnouncementAudioTick(c.volume, c.handle, c.long)).toEqual(c.after);
  for (const c of fixture.announcementDrawCases)
    expect(nativeAnnouncementDraw({ read: 0, stage: c.stage, scale: c.coverage,
      entries: [{ text: "READY", font: 23, teamOnly: c.teamOnly }] }, c.height, c.playback, c.visible)).toEqual(c.after);
  for (const c of fixture.announcementFrameCases)
    expect(nativeAnnouncementFrame(c.width, c.height, 7)).toEqual(c.calls);
  for (const c of fixture.announcementMaskCases)
    expect([...nativeAnnouncementMask(c.length, c.seed, c.coverage)]).toEqual(c.mask);
  for (const c of fixture.announcementQueueCases) {
    const state = { ...createNativeAnnouncements(), read: c.head, write: c.tail, stage: 2 };
    queueNativeAnnouncement(state, c.text, c.font, 2, 1);
    expect({ read: state.read, write: state.write, stage: state.stage, entry: state.entries[c.after.index], index: c.after.index }).toEqual(c.after);
  }
  for (const c of fixture.announcementCases) {
    const state = { ...c.before, entries: Array.from({ length: 20 }, () => ({ long: c.long })) };
    nativeAnnouncementTick(state);
    expect(nativeAnnouncementsPending(state)).toBe(c.pending);
    const { entries, ...after } = state;
    expect(after).toEqual(c.after);
  }
  for (const c of fixture.clockCountdownCases)
    expect(nativeTurnClockTick(c.remaining, c.active)).toEqual(c.after);
  for (const c of fixture.clockPresentationCases)
    expect(nativeClockPresentationTick(c.before, c.remaining, c.selected)).toEqual(c.after);
  expect(nativeClockFrame(56, 42, 22, 33)).toEqual(fixture.clockFrame);
  for (const c of fixture.clockSlideCases)
    expect(nativeClockSlide(c.progress, c.target)).toBe(c.after);
  for (const c of fixture.timerCases)
    expect(nativeTimerFont(c.milliseconds, c.running)).toBe(c.font);
  for (const c of fixture.listCases) {
    const list = structuredClone(c.before);
    const result = c.operation === "tick" ? nativeTeamListTick(list)
      : c.operation === "sort" ? sortNativeTeamList(list, c.scores) : removeNativeTeamListRow(list, c.scores);
    expect(result).toEqual(c.result);
    expect(list).toEqual(c.after);
    expect(nativeTeamListRows(list)).toEqual(c.rows);
  }
  for (const c of fixture.highlightCases)
    expect(nativeTeamHighlight(c.color, c.selected, c.tick)).toEqual(c.after);
  for (const c of fixture.healthCases)
    expect(nativeTeamHealthTick(c.value, c.roster, c.maximum, c.surrendered)).toEqual(c.after);
  for (const c of fixture.visibilityCases) {
    const state = { ...c.before };
    nativeTeamPanelVisibilityTick(state, c.keys.every(Boolean));
    expect(state).toEqual(c.after);
  }
  for (const c of fixture.panelCases) {
    const panel = { ...c.before };
    nativeTeamPanelTick(panel);
    expect(panel).toEqual(c.after);
  }
  for (const c of fixture.cases)
    expect(nativeHUDFrame(c.width, c.height, 11, 22, 33)).toEqual(c.calls);
});
test("live native team bars update with damage and keep HUD controls usable", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  // Exercise actual Canvas pixels against the executable palette captures,
  // including repeated updates and restoration of cached source artwork.
  const palettePixels = await page.evaluate(async () => {
    const { NativeCanvasPaletteDisplay } = await import('/src/armageddon/canvas-palette.js');
    const fixture = await (await fetch('/tests/fixtures/armageddon/environment-palette.json')).json();
    const display = new NativeCanvasPaletteDisplay();
    const canvases = fixture.ranges.map(([first, last], bank) => {
      const canvas = document.createElement('canvas');
      canvas.width = last - first + 2;
      canvas.height = 1;
      const pixels = new Uint8ClampedArray(canvas.width * 4);
      for (let i = first; i <= last; i++) pixels.set([...fixture.colors[i], 255], (i - first) * 4);
      canvas.getContext('2d').putImageData(new ImageData(pixels, canvas.width, 1), 0, 0);
      display.capture(canvas, bank + 1);
      return canvas;
    });
    let checked = 0;
    for (const row of fixture.cases.filter(row => !row.unchanged)) {
      display.update(row.input);
      display.update(row.input);
      for (let bank = 0; bank < 3; bank++) {
        const canvas = canvases[bank], [first, last] = fixture.ranges[bank];
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, 1).data;
        for (let i = first; i <= last; i++) {
          const actual = [...pixels.slice((i - first) * 4, (i - first + 1) * 4)];
          const expected = [...row.palettes[bank][i], 255];
          if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Palette mismatch ${bank}/${i}`);
          checked++;
        }
        if (pixels[pixels.length - 1] !== 0) throw new Error('Transparency changed');
      }
    }
    display.update();
    for (let bank = 0; bank < 3; bank++) {
      const [first, last] = fixture.ranges[bank];
      const pixels = canvases[bank].getContext('2d').getImageData(0, 0, last - first + 1, 1).data;
      for (let i = first; i <= last; i++)
        if (JSON.stringify([...pixels.slice((i - first) * 4, (i - first + 1) * 4)]) !== JSON.stringify([...fixture.colors[i], 255]))
          throw new Error('Source artwork did not restore');
    }
    return checked;
  });
  expect(palettePixels).toBe(576);

  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator(".native-team-health").first()).toHaveAttribute(
    "data-native-health",
    "100",
  );
  await page.evaluate(() => window.siege.debug.hit(1, 10));
  await expect(page.locator(".native-team-health").nth(1)).toHaveAttribute(
    "data-native-health",
    "100",
  );
  await expect(page.locator("#fire")).toBeEnabled();
  await expect(page.locator("#timer")).toBeInViewport();
  await expect(page.locator("#wind")).toBeInViewport();
  await expect.poll(() => page.locator(".match-bar").evaluate(el => el.style.getPropertyValue("--team-panel-offset"))).toBe("32px");
  await expect(page.locator(".native-team-health").first()).toHaveCSS("height", "17px");
  await page.screenshot({ path: info.outputPath("native-hud.png") });
  await page.keyboard.press("ArrowRight");
  const offset = () => page.locator(".match-bar").evaluate(el => el.style.getPropertyValue("--team-panel-offset"));
  await expect.poll(offset).toBe("0px");
  await page.keyboard.press("Shift+Delete");
  await expect.poll(offset).toBe("32px");
  await page.keyboard.press("Shift+Delete");
  await expect.poll(offset).toBe("0px");
  await page.evaluate(() => window.siege.debug.hit(0, 10));
  // Hitting the active worm resolves damage for both teams; 270/300 truncates
  // to 58982 in 16.16, then the original 100px draw truncates again to 89.
  await expect(page.locator(".native-team-health").nth(1)).toHaveAttribute("data-native-health", "89", { timeout: 10000 });
  await expect.poll(() => page.evaluate(() => window.siege.getState().worms.map(w => w.damageTaken))).toEqual([0, 0, 0, 0, 0, 0]);
  await page.evaluate(() => window.siege.debug.hit(0, 10));
  await expect.poll(() => page.evaluate(() => {
    const moss = document.querySelector(".team-lime").getBoundingClientRect();
    const coral = document.querySelector(".team-coral").getBoundingClientRect();
    return { x: moss.x - coral.x, y: moss.y - coral.y };
  }), { timeout: 10000 }).toEqual({ x: 0, y: 16 });
  await page.screenshot({ path: info.outputPath("native-hud-reordered.png") });
});
