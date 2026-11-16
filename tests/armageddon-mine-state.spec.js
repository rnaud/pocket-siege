import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-state.json" with { type: "json" };
import { nativeMineStateEvents } from "../src/armageddon/mine-state.js";

test("mine physical-state detonation matches original executable", () => {
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
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#inventory-toggle").click();
  const mine = page.locator('[data-weapon="mine"]');
  if (!(await mine.isVisible())) await page.locator("#special-toggle").click();
  await mine.click();
  await page.locator("#fire").click();
  const arm = await page.evaluate(() => {
    const arm = window.siege.getState().mines[0].nativeTimer.arm;
    window.siege.debug.setMinePhysicalState(1);
    return arm;
  });
  expect(arm).toBeGreaterThan(3000);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().mines.length), {
      timeout: 2000,
    })
    .toBe(0);
  expect(
    await page.evaluate(() => window.siege.getState().explosions),
  ).toBeGreaterThan(0);
});
