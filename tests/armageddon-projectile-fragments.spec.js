import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/projectile-fragments.json" with { type: "json" };
import { nativeProjectileFragments } from "../src/armageddon/projectile-fragments.js";
import { MatchRandom } from "../src/armageddon/random.js";

test("fragment payloads and random consumption match original projectile emission", () => {
  expect(fixture.cases).toHaveLength(288);
  for (const [i,c] of fixture.cases.entries()) {
    const rng = new MatchRandom(c.seed); rng.frame = c.frame;
    expect(nativeProjectileFragments(c.body,c.payload,c.x,c.y,() => rng.logicUint()), `case ${i}`).toEqual(c.outputs);
    expect(rng.logicState).toBe(c.randomState);
  }
});

for (const [kind, sprite, damage] of [["cluster", "clustlet", 20], ["banana", "banana", 75]])
test(`live ${kind} children use native secondary sprites, damage and lifecycle`, async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#inventory-toggle").click();
  await page.locator("#special-toggle").click();
  await page.locator(`[data-weapon="${kind}"]`).click();
  await page.locator("#fuse").selectOption("1");
  await page.locator("#angle").fill("90");
  await page.locator("#angle").dispatchEvent("input");
  await page.locator("#fire").dispatchEvent("pointerdown", { pointerId: 1 });
  await page.waitForTimeout(500);
  await page.locator("#fire").dispatchEvent("pointerup", { pointerId: 1 });
  await expect.poll(() => page.evaluate(() => window.siege.getState().bombs.length), { intervals: [20, 50, 100] }).toBe(5);
  expect(await page.evaluate(() => window.siege.getState().nativeCameraFocus)).not.toBeNull();
  const children = await page.evaluate(() => window.siege.getState().bombs);
  expect(children.map(b => b.nativeRepeat)).toEqual([1,2,3,4,5]);
  expect(children.every(b => b.nativeDamage === damage && b.sprite === sprite)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.siege.getState().bombs.length), { timeout: 15000 }).toBe(0);
  expect(await page.evaluate(() => window.siege.getState().explosions)).toBeGreaterThan(1);
  expect(await page.evaluate(() => window.siege.getState().nativeCameraFocus)).toBeNull();
});
