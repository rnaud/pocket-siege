import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/flight-art.json" with { type: "json" };
import {
  nativeVectorAngle,
  nativeFlightSprite,
  nativeFlightProgress,
} from "../src/armageddon/flight-art.js";
test("native flying sprite selectors match original angle and displacement instructions", { tag: "@logic" }, () => {
  for (const row of fixture.angles)
    expect(nativeVectorAngle(row.x, row.y)).toBe(row.angle);
  for (const row of fixture.poses)
    expect(nativeFlightSprite(row.x, row.y)).toBe(row.sprite);
  for (const row of fixture.progress_cases)
    expect(nativeFlightProgress(row.vx, row.vy)).toBe(row.progress);
  expect(nativeFlightProgress(0, 0, 12345)).toBe(12345);
});
test("flying sprites preserve every source frame and respond to motion instead of time", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { originalWormFrame, originalVisual } =
      await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    let mismatch = 0;
    for (const name of ["wfly1", "wfly2", "wfly3"]) {
      const source = decodeSprite(
        await fetch(`/armageddon/sprites/${name}.spr`).then((r) =>
          r.arrayBuffer(),
        ),
      );
      for (let i = 0; i < source.frames.length; i++) {
        const canvas = originalVisual(name, i).map.image;
        const expected = spriteFrameRGBA(source, i);
        const pixels = canvas.getContext("2d").getImageData(0, 0, 60, 60).data;
        if (!pixels.every((v, k) => v === expected[k])) mismatch++;
      }
    }
    const worm = {
      hp: 100,
      knocked: true,
      facing: 1,
      x: 100,
      y: 300,
      vx: 150,
      vy: 100,
    };
    const a = originalWormFrame(worm, "hurt", 0, 45, "rocket", true);
    const b = originalWormFrame(worm, "hurt", 200, 45, "rocket", true);
    worm.vy = -100;
    const c = originalWormFrame(worm, "hurt", 200, 45, "rocket", true);
    const names = new Set();
    for (let x = 100; x < 180; x++) {
      worm.x = x;
      names.add(originalWormFrame(worm, "hurt", 200, 45, "rocket", true).name);
    }
    return { mismatch, a: a.index, b: b.index, c: c.index, names: [...names] };
  });
  expect(result.mismatch).toBe(0);
  expect(result.a).toBe(result.b);
  expect(result.c).not.toBe(result.a);
  expect(new Set(result.names)).toEqual(new Set(["wfly1", "wfly2", "wfly3"]));
});
