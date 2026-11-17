import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/walking-art.json" with { type: "json" };
import motion from "./fixtures/armageddon/walking-motion.json" with { type: "json" };
import { nativeWalkPosition } from "../src/armageddon/walking-motion.js";
import {
  nativeWalkingTick,
  nativeWalkingSprite,
} from "../src/armageddon/walking-art.js";
test("walking cadence and slope selection match original executable blocks", { tag: "@logic" }, () => {
  for (const row of fixture.cases)
    expect(nativeWalkingTick(row.previous)).toEqual({
      progress: row.progress,
      cycle: row.next_cycle,
    });
  for (const row of fixture.slopes)
    expect(nativeWalkingSprite(row.slope)).toBe(row.sprite);
  for (const row of motion.cases) {
    const queries = [];
    const output = nativeWalkPosition(...row.input, (x, y) => {
      queries.push([x, y]);
      return row.pattern[(queries.length - 1) % row.pattern.length];
    });
    expect({ output, queries }).toEqual({ output: row.output, queries: row.queries });
  }
});
test("original walking strips preserve pixels, follow slopes and stop/reset with movement", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { stepOriginalWalking, originalWormFrame, originalVisual } =
      await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    let mismatch = 0;
    for (const name of ["wwalk", "wwalku", "wwalkd"]) {
      const source = decodeSprite(
        await fetch(`/armageddon/sprites/${name}.spr`).then((r) =>
          r.arrayBuffer(),
        ),
      );
      for (let i = 0; i < source.frames.length; i++) {
        const pixels = originalVisual(name, i)
          .map.image.getContext("2d")
          .getImageData(0, 0, 60, 60).data;
        const expected = spriteFrameRGBA(source, i);
        if (!pixels.every((v, k) => v === expected[k])) mismatch++;
      }
    }
    const worm = {
      hp: 100,
      ground: true,
      moving: true,
      facing: 1,
      walkDirection: 1,
    };
    const names = [];
    for (const rise of [0, 1, -1]) {
      worm.walkRise = rise;
      stepOriginalWalking(worm);
      names.push(originalWormFrame(worm, "walk", 0, 45, "rocket", true).name);
    }
    const a = originalWormFrame(worm, "walk", 0, 45, "rocket", true).index;
    const b = originalWormFrame(worm, "walk", 1000, 45, "rocket", true).index;
    worm.moving = false;
    stepOriginalWalking(worm);
    const cleared = !worm.originalWalking;
    worm.moving = true;
    stepOriginalWalking(worm);
    const restarted = worm.originalWalking.progress;
    worm.walkDirection = -1;
    stepOriginalWalking(worm);
    return {
      mismatch,
      names,
      a,
      b,
      cleared,
      restarted,
      turned: worm.originalWalking.progress,
      facing: worm.originalWalking.facing,
    };
  });
  expect(result.mismatch).toBe(0);
  expect(result.names).toEqual(["wwalk", "wwalku", "wwalkd"]);
  expect(result.a).toBe(result.b);
  expect(result.cleared).toBe(true);
  expect(result.restarted).toBe(0xf5c);
  expect(result.turned).toBe(0xf5c);
  expect(result.facing).toBe(-1);
});
