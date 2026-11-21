import { test, expect } from "./helpers/shared-page.js";
import { fastForward } from "./helpers/misc-fast-forward.js";
import fixture from "./fixtures/armageddon/mine-art.json" with { type: "json" };
import { nativeMineRender, nativeMineArt } from "../src/armageddon/mine-art.js";
import { startMatch } from "./helpers/match.js";

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
  await startMatch(page, { map: "fern", seed: 42 });
  await page.locator("#sound").click();
  await page.locator("#inventory-toggle").click();
  const mine = page.locator('[data-weapon="mine"]');
  if (!(await mine.isVisible())) await page.locator("#inventory-toggle").click();
  await mine.click();
  await page.locator("#fire").click();
  await page.evaluate(() => window.siege.debug.submergeMine());
  // Fast-forward (still rendering) until the sunk mine expires.
  const { samples } = await fastForward(page, (s) => s.mines.length === 0, {
    sample: (s) => {
      const mine = s.mines[0];
      return { art: mine && { sprite: mine.sprite, frame: mine.frame },
        flags: mine?.nativeBody.flags, bubbles: s.waterBubbles.length };
    },
  });
  expect(samples.map((s) => s.art)).toContainEqual({ sprite: "water/mineoff", frame: 0 });
  expect(samples.map((s) => s.flags)).toContain(0x400000);
  expect(samples.some((s) => s.bubbles > 0)).toBe(true);
  expect(splashes.length).toBeGreaterThan(0);
});
