import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/recovery.json" with { type: "json" };
import {
  nativeRecoveryEntry,
  nativeRecoveryTick,
} from "../src/armageddon/recovery.js";
test("recovery entry and sound/completion thresholds match original executable", { tag: "@logic" }, () => {
  for (const r of fixture.entries)
    expect(
      nativeRecoveryEntry(r.previous, r.maxVy, r.flag, r.handle, r.random, 99),
    ).toEqual(r.result);
  for (const r of fixture.ticks)
    expect(nativeRecoveryTick(r.progress, r.flag, r.handle, 99)).toEqual(
      r.result,
    );
});
test("original recovery strips finish and emit the pop once", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const {
      startOriginalRecovery,
      stepOriginalRecovery,
      originalWormFrame,
      originalVisual,
    } = await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    for (const name of ["wsldlk1", "wsldlk2", "wtwang"]) {
      const sprite = decodeSprite(
        await fetch(`/armageddon/sprites/${name}.spr`).then((r) =>
          r.arrayBuffer(),
        ),
      );
      for (let frame = 0; frame < sprite.frames.length; frame++) {
        const canvas = originalVisual(name, frame).map.image;
        const pixels = canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data;
        const expected = spriteFrameRGBA(sprite, frame);
        if (!pixels.every((value, i) => value === expected[i]))
          throw new Error(`Pixel mismatch: ${name}:${frame}`);
      }
    }
    const results = [];
    for (const [speed, flag] of [
      [0x80000, 0],
      [0x80001, 0],
      [0xc0000, 1],
    ]) {
      const w = { hp: 100, ground: true, facing: 1 };
      let draws = 0;
      const entry = startOriginalRecovery(w, 0x7f, speed, flag, () => {
        draws++;
        return 255;
      });
      const name = originalWormFrame(w, "idle", 0, 0, "rocket", false).name;
      let ticks = 0,
        pops = 0,
        done = false;
      while (w.originalRecovery && ticks < 300) {
        ticks++;
        for (const c of stepOriginalRecovery(w)) {
          if (c.operation === "sound" && c.request[0] === 54) pops++;
          if (c.operation === "state" && c.target === 101) done = true;
        }
      }
      results.push({ name, draws, pops, done, ticks });
    }
    return results;
  });
  expect(result.map((r) => r.name)).toEqual(["wsldlk1", "wsldlk2", "wtwang"]);
  expect(result.map((r) => r.draws)).toEqual([0, 0, 1]);
  expect(result.map((r) => r.pops)).toEqual([0, 0, 1]);
  expect(result.every((r) => r.done && r.ticks > 1 && r.ticks < 300)).toBe(
    true,
  );
});
