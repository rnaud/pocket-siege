import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/particles.json" with { type: "json" };
import {
  addNativeParticle,
  stepNativeParticles,
} from "../src/armageddon/particles.js";
import { fastForward, advance } from "./helpers/misc-fast-forward.js";
import { startMatch } from "./helpers/match.js";

test("particle integration and swap-last expiry match original executable pools", { tag: "@logic" }, () => {
  for (const row of fixture.cases) {
    const pool = row.input.map((p) => ({ ...p }));
    for (let i = 0; i < row.ticks; i++) stepNativeParticles(pool);
    expect(pool).toEqual(row.output);
  }
  const pool = [];
  for (let i = 0; i < 64; i++)
    expect(addNativeParticle(pool, { progress: 0 })).toBe(true);
  expect(addNativeParticle(pool, { progress: 1 })).toBe(false);
  expect(pool).toHaveLength(64);
});

test("live rocket emits original exhaust pixels instead of a vector trail and expires them", async ({
  page,
}, info) => {
  await startMatch(page, { seed: 42 });
  await page.locator("#angle").evaluate((el) => {
    el.value = "90";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.keyboard.down("Space");
  // Charge for the original 500 ms (25 logic ticks) without waiting in real time.
  await advance(page, 25);
  await page.keyboard.up("Space");
  await fastForward(page, (s) => s.nativeParticles.some((p) => p.sprite === "hexhaust"), { perFrame: 1 });
  await expect(page.locator(".projectile-trail")).toHaveAttribute("d", "");
  const source = await page.evaluate(async () => {
    const { originalVisual } = await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    let mismatches = 0;
    for (const name of ["hexhaust", "skdsmoke"]) {
      const sprite = decodeSprite(
        await fetch(`/armageddon/sprites/${name}.spr`).then((r) =>
          r.arrayBuffer(),
        ),
      );
      for (let index = 0; index < sprite.frames.length; index++) {
        const art = originalVisual(name, index),
          canvas = art.map.image;
        const actual = canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data;
        const expected = spriteFrameRGBA(sprite, index);
        for (let i = 0; i < expected.length; i++)
          if (actual[i] !== expected[i]) mismatches++;
        if (canvas.width !== sprite.width || canvas.height !== sprite.height)
          mismatches++;
      }
    }
    return mismatches;
  });
  expect(source).toBe(0);
  await page.screenshot({ path: info.outputPath("original-exhaust.png") });
  // Fast-forward the flight and the exhaust's expiry.
  await fastForward(page, (s) => !s.projectile && !s.nativeParticles.some((p) => p.sprite === "hexhaust"), { perFrame: 8 });
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  expect(
    await page.evaluate(() => window.siege.getState().nativeParticles.length),
  ).toBe(0);
});
