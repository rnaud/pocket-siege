import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/casing.json" with { type: "json" };
import { nativeCasing } from "../src/armageddon/casing.js";
import { nextVisualRandom } from "../src/armageddon/numeric.js";
import {
  nativeParticleRequest,
  stepNativeParticles,
} from "../src/armageddon/particles.js";
test("casing emission matches original x86 packet and random state", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(81);
  for (const row of fixture.cases) {
    let state = row.seed;
    const request = nativeCasing(
      row.sprite,
      row.facing,
      row.x,
      row.y,
      row.gravity,
      () => (state = nextVisualRandom(state)),
    );
    expect(request).toEqual(row.request);
    expect(state).toBe(row.random);
  }
});
test("casing packet preserves mirror, gravity, trajectory and native lifetime", { tag: "@logic" }, () => {
  for (const facing of [-1, 1]) {
    const request = nativeCasing(
      0x33c,
      facing,
      100 << 16,
      200 << 16,
      0x3d70,
      () => 0,
    );
    const body = nativeParticleRequest(request),
      pool = [body];
    expect(body.sprite).toBe(0x33c);
    expect(body.mirror).toBe(facing > 0);
    let risen = false,
      fallen = false,
      ticks = 0;
    while (pool.length && ticks < 110) {
      const previous = body.y;
      stepNativeParticles(pool);
      risen ||= body.y < previous;
      fallen ||= body.y > previous;
      ticks++;
    }
    expect({ risen, fallen, ticks }).toEqual({
      risen: true,
      fallen: true,
      ticks: 101,
    });
    expect(Math.sign(body.x - (100 << 16))).toBe(-facing);
  }
});
test("original casing strips preserve all source pixels", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { originalVisual } = await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    let frames = 0,
      mismatch = 0;
    for (const name of ["shotcase", "uzicase"]) {
      const source = decodeSprite(
        await fetch(`/armageddon/sprites/${name}.spr`).then((r) =>
          r.arrayBuffer(),
        ),
      );
      for (let i = 0; i < source.frames.length; i++) {
        const canvas = originalVisual(name, i).map.image,
          pixels = canvas
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
