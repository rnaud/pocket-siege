import { test, expect } from "./helpers/shared-page.js";
import { startMatch } from "./helpers/match.js";
test("all 18 original girders stamp exact source pixels and carve with terrain", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { originalGirder, stampOriginalGirder } =
      await import("/src/armageddon/girders.js");
    const { decodeImage, imageRGBA } = await import("/src/armageddon/image.js");
    const { Terrain, W, H } = await import("/src/physics.js");
    const { paintTerrain } = await import("/src/terrain-paint.js");
    let mismatch = 0,
      checked = 0;
    for (const size of ["s", "l"])
      for (let n = 0; n < 9; n++) {
        const name = `grd${size}${n}`;
        const source = decodeImage(
          await fetch(`/armageddon/media/gfx/gfx/${name}.img`).then((r) =>
            r.arrayBuffer(),
          ),
        );
        const expected = imageRGBA(source);
        const t = new Terrain(42);
        t.data.fill(0);
        t.theme = "forest";
        const stamped = stampOriginalGirder(t, W, H, 600, 350, name);
        if (stamped.placed !== source.pixels.filter((v) => v !== 0).length)
          mismatch++;
        for (let sy = 0; sy < source.height; sy++)
          for (let sx = 0; sx < source.width; sx++) {
            const x = 600 - Math.floor(source.width / 2) + sx,
              y = 350 + Math.floor(source.height / 2) - sy;
            const i = sy * source.width + sx,
              offset = ((H - 1 - y) * W + x) * 4;
            if (t.solid(x, y) !== Boolean(source.pixels[i])) mismatch++;
            for (let c = 0; c < 4; c++)
              if (t.decorationPixels[offset + c] !== expected[i * 4 + c])
                mismatch++;
          }
        t.carve(600, 350, 22);
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        paintTerrain(canvas.getContext("2d"), t, {});
        const pixels = canvas.getContext("2d").getImageData(0, 0, W, H).data;
        for (let y = 329; y < 372; y++)
          for (let x = 579; x < 622; x++) {
            if ((x - 600) ** 2 + (y - 350) ** 2 >= 22 ** 2) continue;
            if (t.solid(x, y) || pixels[((H - 1 - y) * W + x) * 4 + 3])
              mismatch++;
          }
        checked++;
      }
    return { mismatch, checked };
  });
  expect(result).toEqual({ mismatch: 0, checked: 18 });
});
test("live girder uses original horizontal source dimensions", async ({
  page,
}, info) => {
  await startMatch(page, { map: "fern", seed: 42 });
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="girder"]').click();
  const box = await page.locator("#arena").boundingBox();
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.3);
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.girders).toHaveLength(1);
  expect(state.girders[0]).toMatchObject({
    sprite: "grds4",
    width: 72,
    height: 20,
  });
  await page.screenshot({ path: info.outputPath("original-girder.png") });
});
