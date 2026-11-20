import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-state.json" with { type: "json" };
import { nativeMineStateEvents } from "../src/armageddon/mine-state.js";
import { fastForward } from "./helpers/misc-fast-forward.js";

test("mine physical-state detonation matches original executable", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(48);
  for (const [i, c] of fixture.cases.entries()) {
    expect(nativeMineStateEvents(c.body, c.damage), `case ${i}`).toEqual(
      c.calls,
    );
  }
});

test("live mine physical state detonates before its arming timer expires", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#inventory-toggle").click();
  const mine = page.locator('[data-weapon="mine"]');
  if (!(await mine.isVisible())) await page.locator("#inventory-toggle").click();
  await mine.click();
  await page.locator("#fire").click();
  const arm = await page.evaluate(() => {
    const arm = window.siege.getState().mines[0].nativeTimer.arm;
    window.siege.debug.setMinePhysicalState(1);
    return arm;
  });
  expect(arm).toBeGreaterThan(3000);
  // Well before the arming timer: the physical state alone detonates it.
  const { ticks } = await fastForward(page, (s) => s.mines.length === 0, { perFrame: 2, maxTicks: 100 });
  expect(ticks * 20).toBeLessThan(arm);
  expect(
    await page.evaluate(() => window.siege.getState().explosions),
  ).toBeGreaterThan(0);
});
