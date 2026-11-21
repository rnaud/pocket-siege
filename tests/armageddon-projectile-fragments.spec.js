import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/projectile-fragments.json" with { type: "json" };
import { nativeProjectileFragments } from "../src/armageddon/projectile-fragments.js";
import { MatchRandom } from "../src/armageddon/random.js";
import { advanceUntil } from "./helpers/misc-advance.js";
import { startMatch } from "./helpers/match.js";

test("fragment payloads and random consumption match original projectile emission", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(288);
  for (const [i,c] of fixture.cases.entries()) {
    const rng = new MatchRandom(c.seed); rng.frame = c.frame;
    expect(nativeProjectileFragments(c.body,c.payload,c.x,c.y,() => rng.logicUint()), `case ${i}`).toEqual(c.outputs);
    expect(rng.logicState).toBe(c.randomState);
  }
});

for (const [kind, sprite, damage] of [["cluster", "clustlet", 20], ["banana", "banana", 75]])
test(`live ${kind} children use native secondary sprites, damage and lifecycle`, async ({ page }) => {
  await startMatch(page, { map: "fern", seed: 42 });
  await page.locator("#inventory-toggle").click();

  await page.locator(`[data-weapon="${kind}"]`).click();
  await page.locator("#fuse").selectOption("1");
  await page.locator("#angle").fill("90");
  await page.locator("#angle").dispatchEvent("input");
  await page.locator("#fire").dispatchEvent("pointerdown", { pointerId: 1 });
  // Hold the charge for 25 logic frames (500 ms) without waiting in real time.
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(25));
  await page.locator("#fire").dispatchEvent("pointerup", { pointerId: 1 });
  await advanceUntil(page, (s) => s.bombs.length === 5, { label: "five fragments" });
  expect(await page.evaluate(() => window.siege.getState().nativeCameraFocus)).not.toBeNull();
  const children = await page.evaluate(() => window.siege.getState().bombs);
  expect(children.map(b => b.nativeRepeat)).toEqual([1,2,3,4,5]);
  expect(children.every(b => b.nativeDamage === damage && b.sprite === sprite)).toBe(true);
  await advanceUntil(page, (s) => s.bombs.length === 0, { label: "fragments expire" });
  expect(await page.evaluate(() => window.siege.getState().explosions)).toBeGreaterThan(1);
  // Camera focus belongs to all native actors: secondary flames, crates and
  // injured worms may still request it after the final fragment is removed.
});
