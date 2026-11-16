import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/explosion-art.json" with { type: "json" };
import {
  createImpactBag,
  nativeExplosionArt,
} from "../src/armageddon/explosion-art.js";
import { nextVisualRandom } from "../src/armageddon/numeric.js";
test("explosion artwork requests and no-repeat bag match original x86 sequences", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(112);
  for (const row of fixture.cases) {
    let state = row.seed;
    const bag = createImpactBag();
    for (const step of row.sequence) {
      const result = nativeExplosionArt(
        row.mode,
        row.x,
        row.y,
        row.strength,
        () => (state = nextVisualRandom(state)),
        bag,
      );
      expect(result).toEqual({ smoke: step.smoke, effects: step.effects });
      expect(state).toBe(step.random);
      expect(bag).toEqual({ available: step.available, used: step.used });
    }
  }
});
test("all original explosion ring and hit sprites retain their source pixels", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { originalVisual } = await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    let frames = 0,
      mismatch = 0;
    for (const name of [
      "circle25",
      "circle50",
      "circle75",
      "circl100",
      "elipse25",
      "elipse50",
      "elipse75",
      "elips100",
      "shothit",
      "uzihit",
      "exfoom",
      "exbiff",
      "expoot",
      "expow",
    ]) {
      const source = decodeSprite(
        await fetch(`/armageddon/sprites/${name}.spr`).then((r) =>
          r.arrayBuffer(),
        ),
      );
      for (let i = 0; i < source.frames.length; i++) {
        const canvas = originalVisual(name, i).map.image;
        const pixels = canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data;
        const expected = spriteFrameRGBA(source, i);
        if (!pixels.every((v, k) => v === expected[k])) mismatch++;
        frames++;
      }
    }
    return { frames, mismatch };
  });
  expect(result.frames).toBeGreaterThan(0);
  expect(result.mismatch).toBe(0);
});
