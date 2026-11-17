import { nativeTurnClockTick, nativeClockPresentationTick, nativeTimerFont, nativeClockFrame, nativeClockSlide } from "../src/armageddon/number-hud.js";
import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/hud-frame.json" with { type: "json" };
import { nativeTeamListTick, nativeTeamListRows, sortNativeTeamList, removeNativeTeamListRow, nativeHUDFrame, nativeTeamHighlight, nativeTeamHealthTick, nativeTeamPanelTick, nativeTeamPanelVisibilityTick } from "../src/armageddon/hud-frame.js";
test("HUD frame drawing matches original executable requests", { tag: "@logic" }, () => {
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
