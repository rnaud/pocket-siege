import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/teleport.json" with { type: "json" };
import {
  nativeTeleportTick,
  nativeTeleportRenderProgress,
} from "../src/armageddon/teleport.js";
test("teleport progress, relocation and completion match original executable", () => {
  for (const row of fixture.cases)
    expect(nativeTeleportTick(row.input)).toEqual(row.output);
  for (const row of fixture.render_cases)
    expect(nativeTeleportRenderProgress(row.input)).toBe(row.output);
});
test("original teleport strip relocates only at tick 51 and completes at tick 101", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const {
      startOriginalTeleport,
      stepOriginalTeleport,
      originalWormFrame,
      originalVisual,
    } = await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    const source = decodeSprite(
      await fetch("/armageddon/sprites/wteldsv.spr").then((r) =>
        r.arrayBuffer(),
      ),
    );
    let mismatches = 0;
    for (let index = 0; index < source.frames.length; index++) {
      const canvas = originalVisual("wteldsv", index).map.image;
      const pixels = canvas.getContext("2d").getImageData(0, 0, 60, 60).data;
      const expected = spriteFrameRGBA(source, index);
      for (let i = 0; i < pixels.length; i++)
        if (pixels[i] !== expected[i]) mismatches++;
    }
    const worm = { hp: 100, x: 100, y: 100, facing: 1 };
    startOriginalTeleport(worm, 500, 400);
    const frames = new Set();
    const samples = [];
    let relocated = 0,
      completed = 0;
    for (let tick = 1; tick <= 101; tick++) {
      const index = originalWormFrame(
        worm,
        "idle",
        0,
        45,
        "rocket",
        true,
      ).index;
      frames.add(index);
      if ([1, 51, 101].includes(tick)) samples.push(index);
      const result = stepOriginalTeleport(worm);
      if (result.relocate) relocated = tick;
      if (result.target !== null) completed = tick;
      if (tick < 51 && (worm.x !== 100 || worm.y !== 100))
        throw new Error("Premature relocation");
    }
    return {
      mismatches,
      relocated,
      completed,
      frames: frames.size,
      samples,
      x: worm.x,
      y: worm.y,
      cleared: !worm.originalTeleport,
    };
  });
  expect(result).toEqual({
    mismatches: 0,
    relocated: 51,
    completed: 101,
    frames: 48,
    samples: [0, 47, 0],
    x: 500,
    y: 400,
    cleared: true,
  });
});

test("live teleport shows the dissolve before moving and holds the turn until it finishes", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  const before = await page.evaluate(() => window.siege.getState());
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="teleport"]').click();
  const box = await page.locator("#arena").boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.2);
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].originalSprite),
    )
    .toBe("wteldsv");
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.worms[0].x).toBe(before.worms[0].x);
  expect(state.team).toBe(0);
  await page.screenshot({ path: info.outputPath("original-teleport.png") });
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().worms[0].x))
    .not.toBe(before.worms[0].x);
  state = await page.evaluate(() => window.siege.getState());
  expect(state.team).toBe(0);
  expect(state.worms[0].originalSprite).toBe("wteldsv");
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].originalSprite),
    )
    .not.toBe("wteldsv");
});
