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
      const slopes=[-1,0,1].map(variant=>{
        const tilted={hp:100,facing:-1,nativeGroundPose:{variant}};
        startOriginalRecoil(tilted,weapon,45,0);
        const pose=originalWormFrame(tilted,"idle",1,45,weapon,false);
        return {name:pose.name,facing:pose.facing};
      });
      return {
        weapon,slopes,
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
  for (const r of result) {
    expect(r.lastFrame).toBe(r.firstFrame);
    expect(r.slopes).toEqual([r.first+"u",r.first,r.first+"d"].map(name=>({name,facing:-1})));
  }
  const torch=await page.evaluate(async()=>{
    const {startOriginalBlowtorch,originalWormFrame}=await import("/src/armageddon/art.js");
    return [0,32768,65536].map(aim=>{
      const worm={hp:100,facing:1};startOriginalBlowtorch(worm);
      worm.originalBlowtorch.body={x:12.75*65536,y:0,field1fc:10.25*65536,aim};
      const pose=originalWormFrame(worm,"idle",0,45,"blowtorch",true);
      return {name:pose.name,offsetX:pose.offsetX,facing:pose.facing};
    });
  });
  expect(torch).toEqual(["wblowwd","wbloww","wblowwu"].map(name=>({name,offsetX:-2,facing:1})));
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
    await page.locator("#map-layout").selectOption("fern");
    await page.locator("#start").click();
    // Fix landscape and object placement before staging the firing-art fixture.
    await page.evaluate(async () => {
      await window.siege.debug.resetSeed(42);
      window.siege.debug.stageMeleeTargets();
    });
    await page.locator("#inventory-toggle").click();

    await page.locator(`[data-weapon="${weapon}"]`).click();
    const shooter = await page.evaluate(() => window.siege.getState().current);
    await expect.poll(() => page.evaluate(shooter => {
      const worm = window.siege.getState().worms[shooter];
      return worm.ground && worm.y < 258;
    }, shooter)).toBe(true);
    if (weapon === "shotgun") await page.locator("#angle").evaluate(el => {
      // Fire into clear sky so a nearby impact cannot replace recoil with hurt.
      el.value = "90";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
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
