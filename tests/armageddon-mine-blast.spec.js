import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-blast.json" with { type: "json" };
import { nativeMineBlast } from "../src/armageddon/mine-blast.js";

test("mine blast event matches original executable damage and body impulses", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(432);
  for (const [i, c] of fixture.cases.entries()) {
    expect(nativeMineBlast(c.before, c.packet, c.extent), `case ${i}`).toEqual({
      body: c.after,
      outputPacket: c.outputPacket,
    });
  }
});

test("live explosions deliver the original blast event to placed mines", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#inventory-toggle").click();
  const mine = page.locator('[data-weapon="mine"]');
  if (!(await mine.isVisible())) await page.locator("#inventory-toggle").click();
  await mine.click();
  await page.locator("#fire").click();
  const result = await page.evaluate(() => {
    const before = window.siege.getState().mines[0];
    window.siege.debug.explodeAt(before.x - 10, before.y, "death");
    const after = window.siege.getState().mines[0];
    return { before, after };
  });
  const body = result.before.nativeBody;
  const expected = nativeMineBlast(body, [
    1,
    (result.before.x - 10) * 65536,
    Math.round(body.y / 65536) * 65536,
    100,
    30,
    0,
  ]).body;
  expect(result.after.nativeBody).toEqual(expected);
  expect(expected.vx).toBeGreaterThan(body.vx);
  expect(expected.accumulated).toBeGreaterThan(body.accumulated);
  expect(result.after.nativeTimer).toEqual(result.before.nativeTimer);
});
