import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-art.json" with { type: "json" };
import { nativeMineRender, nativeMineArt } from "../src/armageddon/mine-art.js";

test("mine water sprites, rotation and render order match the original executable", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(288);
  for (const [i, c] of fixture.cases.entries()) {
    expect(nativeMineRender(c.body, c.timer, c.order), `case ${i}`).toEqual(
      c.request,
    );
    expect(nativeMineArt(c.body, c.timer).name.startsWith("water/")).toBe(
      Boolean(c.body.submerged || c.body.fieldB0),
    );
  }
});

test("live submerged mines use original water artwork at zero rotation", async ({
  page,
}) => {
  const splashes = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/splash.wav")) splashes.push(request.url());
  });
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#sound").click();
  await page.locator("#inventory-toggle").click();
  const mine = page.locator('[data-weapon="mine"]');
  if (!(await mine.isVisible())) await page.locator("#inventory-toggle").click();
  await mine.click();
  await page.locator("#fire").click();
  await page.evaluate(() => window.siege.debug.submergeMine());
  await expect
    .poll(() =>
      page.evaluate(() => {
        const mine = window.siege.getState().mines[0];
        return mine && { sprite: mine.sprite, frame: mine.frame };
      }),
    )
    .toEqual({ sprite: "water/mineoff", frame: 0 });
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().mines[0]?.nativeBody.flags),
    )
    .toBe(0x400000);
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().waterBubbles.length),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().mines.length), {
      timeout: 6000,
    })
    .toBe(0);
  expect(splashes.length).toBeGreaterThan(0);
});
