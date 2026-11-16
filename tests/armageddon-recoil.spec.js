import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { nativePostFire, nativeRecoilTick } from "../src/armageddon/recoil.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/recoil.json", import.meta.url),
  ),
);
test("post-fire queues and recoil countdown match original x86", { tag: "@logic" }, () => {
  expect(fixture.vectors).toHaveLength(355);
  expect(fixture.ticks).toHaveLength(1704);
  for (const v of fixture.vectors)
    expect(nativePostFire(v.fields, v.progress), JSON.stringify(v)).toEqual({
      calls: v.calls,
      delay: v.delay,
    });
  for (const v of fixture.ticks)
    expect(
      nativeRecoilTick(v.fields, v.delay, v.progress, v.resume),
      JSON.stringify(v),
    ).toEqual({ delay: v.result_delay, target: v.targets[0] ?? null });
});

test("renderer keeps original firing poses for their native countdown", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { loadOriginalArt, startOriginalRecoil, originalWormFrame } =
      await import("/src/armageddon/art.js");
    await loadOriginalArt();
    return [
      ["grenade", 6],
      ["mine", 6],
      ["dynamite", 6],
      ["shotgun", 11],
      ["bat", 26],
    ].map(([weapon, end]) => {
      const worm = { hp: 100, frozen: 0, hurt: 0 };
      startOriginalRecoil(worm, weapon, 45, 0);
      const first = originalWormFrame(worm, "idle", 1, 45, weapon, false);
      const last = originalWormFrame(worm, "idle", end - 1, 45, weapon, false);
      const done = originalWormFrame(worm, "idle", end, 45, weapon, false);
      return {
        weapon,
        first: first.name,
        last: last.name,
        done: done.name,
        firstFrame: first.index,
        lastFrame: last.index,
        equipped: first.equipped,
      };
    });
  });
  expect(
    result.map((r) => [r.weapon, r.first, r.last, r.done, r.equipped]),
  ).toEqual([
    ["grenade", "wthrow", "wthrow", "wbrth1", true],
    ["mine", "wthrow", "wthrow", "wbrth1", true],
    ["dynamite", "wthrow", "wthrow", "wbrth1", true],
    ["shotgun", "wshotf", "wshotf", "wbrth1", true],
    ["bat", "wbsbswn", "wbsbswn", "wbrth1", true],
  ]);
  for (const r of result) expect(r.lastFrame).toBe(r.firstFrame);
  expect(result.find((r) => r.weapon === "mine").firstFrame).toBe(16);
});

for (const [weapon, sprite] of [
  ["shotgun", "wshotf"],
  ["bat", "wbsbswn"],
]) {
  test(`live ${weapon} action displays original firing sprite`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect
      .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
      .toBe(true);
    await page.locator("#mode").selectOption("local");
    await page.locator("#start").click();
    await page.locator("#inventory-toggle").click();

    await page.locator(`[data-weapon="${weapon}"]`).click();
    const shooter = await page.evaluate(() => window.siege.getState().current);
    await page.evaluate(({ shooter, sprite }) => {
      window.recoilObserved = false;
      const deadline = performance.now() + 10000;
      const sample = () => {
        if (window.siege.getState().worms[shooter].originalSprite === sprite) window.recoilObserved = true;
        else if (performance.now() < deadline) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, { shooter, sprite });
    await page.locator("#fire").click();
    await expect.poll(() => page.evaluate(() => window.recoilObserved), {timeout:10000}).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`native-${weapon}-fire.png`),
    });
    await expect
      .poll(() =>
        page.evaluate(
          (shooter) => window.siege.getState().worms[shooter].originalSprite,
          shooter,
        ),
      )
      .not.toBe(sprite);
  });
}
