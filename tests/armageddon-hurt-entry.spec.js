import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/hurt-entry.json" with { type: "json" };
import { nativeHurtEntry } from "../src/armageddon/hurt-entry.js";
import { startMatch } from "./helpers/match.js";
test("hurt entries match original animation queue and angle reset", { tag: "@logic" }, () => {
  for (const row of fixture.cases)
    expect(nativeHurtEntry(row.state, row.angle)).toEqual(row.result);
});
test("native ordinary hits render the original rolling strip with exact pixels", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { originalWormFrame, originalVisual, startOriginalHurt } =
      await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    let mismatch = 0;
    for (const name of ["wroll", "wslide"]) {
      const sprite = decodeSprite(
        await fetch(`/armageddon/sprites/${name}.spr`).then((r) =>
          r.arrayBuffer(),
        ),
      );
      for (let i = 0; i < sprite.frames.length; i++) {
        const canvas = originalVisual(name, i).map.image;
        const expected = spriteFrameRGBA(sprite, i);
        const pixels = canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data;
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
      nativeFlight: { angle: 12345 },
    };
    startOriginalHurt(worm, 0x80);
    const roll = originalWormFrame(worm, "hurt", 0, 45, "rocket", true);
    const reset = worm.nativeFlight.angle;
    startOriginalHurt(worm, 0x7f);
    const slide = originalWormFrame(worm, "hurt", 0, 45, "rocket", true);
    return { mismatch, roll: roll.name, slide: slide.name, reset };
  });
  expect(result).toEqual({
    mismatch: 0,
    roll: "wroll",
    slide: "wslide",
    reset: 0,
  });
});

test("live native death blast selects the rolling hurt pose", async ({
  page,
}) => {
  // A manual clock renders every logic tick: on a slow runner the real-time
  // loop can step past this short pose between two drawn frames.
  await startMatch(page, { seed: 42, manualClock: true });
  const observed = await page.evaluate(async () => {
    const w = window.siege.getState().worms[0];
    window.siege.debug.explodeAt(w.x - 20, w.y, "death");
    for (let tick = 0; tick < 250; tick++) {
      window.siege.debug.advanceReplayFrames(1);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (window.siege.getState().worms[0].originalSprite === "wroll") return true;
    }
    return false;
  });
  expect(observed).toBe(true);
});
