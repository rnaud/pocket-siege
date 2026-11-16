import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/smoke.json" with { type: "json" };
import {
  nativeSmokeBurst,
  nativeSmokeTick,
  nativeDeathSmoke,
} from "../src/armageddon/smoke.js";
import { nextVisualRandom } from "../src/armageddon/numeric.js";
test("smoke burst requests and random state match original executable", () => {
  for (const row of fixture.emissions) {
    let state = row.seed;
    expect(
      nativeSmokeBurst(
        row.x,
        row.y,
        row.strength,
        () => (state = nextVisualRandom(state)),
      ),
    ).toEqual(row.requests);
    expect(state).toBe(row.random);
  }
});
test("smoke drift, damping and retirement match original executable", () => {
  for (const row of fixture.ticks) {
    let state = row.seed;
    expect(
      nativeSmokeTick(row.initial, () => (state = nextVisualRandom(state))),
    ).toEqual({ body: row.result, alive: row.alive });
    expect(state).toBe(row.random);
  }
});
test("death smoke spans the name label in native 24-pixel intervals", () => {
  for (const [length, groups] of [
    [0, 3],
    [11, 3],
    [12, 5],
    [24, 7],
  ]) {
    const requests = nativeDeathSmoke(100 << 16, 200 << 16, length, () => 0);
    expect(requests).toHaveLength(groups * 6);
    expect([...new Set(requests.map((r) => r[1] >> 16))]).toEqual(
      Array.from(
        { length: groups },
        (_, i) => 100 + (i - (groups - 1) / 2) * 24,
      ),
    );
    expect(requests.every((r) => r[2] === 167 << 16 && r[5] === 0x330)).toBe(
      true,
    );
  }
});
test("original flame and light/dark smoke frames retain source palette pixels", async ({
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
      "smklt25",
      "smklt50",
      "smklt75",
      "smklt100",
      "smkdrk20",
      "smkdrk30",
      "smkdrk40",
      "flame1",
    ]) {
      const source = decodeSprite(
        await fetch(`/armageddon/sprites/${name}.spr`).then((r) =>
          r.arrayBuffer(),
        ),
      );
      for (let frame = 0; frame < source.frames.length; frame++) {
        const canvas = originalVisual(name, frame).map.image;
        const pixels = canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data;
        const expected = spriteFrameRGBA(source, frame);
        if (!pixels.every((v, i) => v === expected[i])) mismatch++;
        frames++;
      }
    }
    return { frames, mismatch };
  });
  expect(result.frames).toBeGreaterThan(0);
  expect(result.mismatch).toBe(0);
});
