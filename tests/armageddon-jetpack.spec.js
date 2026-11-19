import drawQueueFixture from "./fixtures/armageddon/sprite-draw-queue.json" with { type: "json" };
import { NativeSpriteDrawQueue } from "../src/armageddon/sprite-draw-queue.js";
import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/jetpack.json" with { type: "json" };
import { nativeDrawJetpackFlames, nativeJetpackInput, nativeJetpackVelocity, nativeJetpackTick } from "../src/armageddon/jetpack.js";
test("jetpack poses, fuel and inputs match original executable ticks", { tag: "@logic" }, () => {
  for (const c of drawQueueFixture.cases) {
    const queue = new NativeSpriteDrawQueue(c.remaining);
    for (const request of c.requests)
      queue[request.length === 10 ? "image" : "draw"](...request);
    const calls = [];
    queue.flush(c.view, (...args) => calls.push(args), (...args) => calls.push(args));
    expect(queue.available).toBe(c.available);
    expect(queue.records).toEqual(c.records);
    expect(calls).toEqual(c.draws);
  }
  for (const row of fixture.cases)
    expect(nativeJetpackTick(row.input)).toEqual(row.output);
  for (const row of fixture.inputCases) {
    const input = nativeJetpackInput(row.input, row.controls, row.gravity);
    expect({ ...input, velocity: nativeJetpackVelocity(...row.velocity) }).toEqual(row.output);
  }
  for (const { input, calls } of fixture.drawCases) {
    const actual = [];
    nativeDrawJetpackFlames(input, {
      state: () => { actual.push(["state"]); return input.state; },
      position: () => { actual.push(["position"]); return input; },
      draw: (...args) => actual.push(["draw", ...args]),
    });
    expect(actual).toEqual(calls);
  }
});
test("jetpack turns through original poses and renders thrust flames", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="jetpack"]').click();
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].originalSprite),
    )
    .toBe("wjetfly1");
  const result = await page.evaluate(async (drawCases) => {
    const {
      stepOriginalJetpack,
      stopOriginalJetpack,
      originalWormFrame,
      originalVisual,
    } = await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    let mismatch = 0;
    for (const name of [
      "wjetfly1",
      "wjetfly2",
      "wjetfly3",
      "wjetfly4",
      "wjetflmb",
      "wjetflmd",
    ]) {
      const sprite = decodeSprite(
        await fetch(`/armageddon/sprites/${name}.spr`).then((r) =>
          r.arrayBuffer(),
        ),
      );
      for (let i = 0; i < sprite.frames.length; i++) {
        const pixels = originalVisual(name, i)
          .map.image.getContext("2d")
          .getImageData(0, 0, 60, 60).data;
        const expected = spriteFrameRGBA(sprite, i);
        if (!pixels.every((v, k) => v === expected[k])) mismatch++;
      }
    }
    const worm = { hp: 100, facing: 1 };
    stepOriginalJetpack(worm, 0, 0);
    worm.facing = -1;
    const poses = new Set();
    for (let i = 0; i < 8; i++) {
      stepOriginalJetpack(worm, -1, 1);
      poses.add(originalWormFrame(worm, "fall", 0, 45, "rocket", true).name);
    }
    const flames = [
      worm.originalJetpack.sideFrame,
      worm.originalJetpack.downFrame,
    ];
    let compositionMismatch = 0;
    const { H } = await import("/src/physics.js");
    for (const { input, calls } of drawCases) {
      worm.x = input.x / 65536;
      worm.y = H - input.y / 65536;
      Object.assign(worm.originalJetpack, input, { sprite: 50 });
      const actual = originalWormFrame(worm, "fall", 0, 45, "rocket", true).map.image;
      const expected = document.createElement("canvas");
      expected.width = expected.height = 100;
      const ctx = expected.getContext("2d");
      const draw = (name, index, x, y, flip) => {
        ctx.save(); ctx.translate(50 + x, 50 + y); ctx.scale(flip ? -1 : 1, 1);
        ctx.drawImage(originalVisual(name, index).map.image, -30, -30); ctx.restore();
      };
      for (const [, , x, y, , sprite, progress] of calls.filter(c => c[0] === "draw")) {
        // Both original flame strips loop: progress 1 wraps to frame zero.
        const index = Math.floor((progress & 0xffff) * 6 / 65536);
        draw((sprite & 0x3ffff) === 54 ? "wjetflmb" : "wjetflmd", index,
          (x >> 16) - (input.x >> 16), (y >> 16) - (input.y >> 16), Boolean(sprite & 0x40000));
      }
      draw("wjetfly1", 0, 0, 0, input.lean >= 0);
      const expectedPixels = ctx.getImageData(0, 0, 100, 100).data;
      if (!actual.getContext("2d").getImageData(0, 0, 100, 100).data.every((v, i) => v === expectedPixels[i])) compositionMismatch++;
    }
    stopOriginalJetpack(worm);
    return {
      poses: [...poses],
      flames,
      mismatch,
      compositionMismatch,
      cleared: !worm.originalJetpack,
    };
  }, fixture.drawCases.filter(row => row.input.state === 0x78 && row.input.rank === 17 && Math.abs(row.input.x) < 0x10000000));
  expect(result.compositionMismatch).toBe(0);
  expect(result.mismatch).toBe(0);
  expect(new Set(result.poses)).toEqual(
    new Set(["wjetfly1", "wjetfly2", "wjetfly3", "wjetfly4"]),
  );
  expect(result.flames.every((v) => v > 0)).toBe(true);
  expect(result.cleared).toBe(true);
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(180);
  await page.screenshot({ path: info.outputPath("original-jetpack.png") });
  await page.keyboard.up("ArrowUp");
  await page.keyboard.press("j");
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].originalSprite),
    )
    .not.toMatch(/^wjetfly/);
});
