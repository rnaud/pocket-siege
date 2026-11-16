import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/collision-overlap.json" with { type: "json" };
import masks from "./fixtures/armageddon/collision-mask.json" with { type: "json" };
import shapes from "../src/armageddon/collision-shapes.json" with { type: "json" };
import { bodyBlocked, hitsWorm } from "../src/physics.js";

test("runtime shapes retain original constructor pixels and anchors", { tag: "@logic" }, () => {
  for (const { shape, params, planes, ...bounds } of masks.cases)
    expect(shapes.shapes[shape]).toEqual({
      ...bounds,
      planes: planes.slice(0, 1),
    });
});

test("live upward-coordinate terrain collision matches original native overlap", { tag: "@logic" }, () => {
  const terrains = fixture.terrains.map((t) => {
    const pixels = new Set(t.planes[0].points.map(([x, y]) => y * t.width + x));
    return {
      solid(x, y) {
        x = Math.floor(x);
        y = t.height - 1 - Math.floor(y);
        return (
          x >= 0 &&
          x < t.width &&
          y >= 0 &&
          y < t.height &&
          pixels.has(y * t.width + x)
        );
      },
    };
  });
  for (const r of fixture.cases) {
    expect(
      Number(bodyBlocked(terrains[r.pattern], r.x, 48 - r.y)),
      JSON.stringify(r),
    ).toBe(r.result);
    // A fractional body still selects the same native integer pixel.
    expect(
      Number(bodyBlocked(terrains[r.pattern], r.x + 0.25, 48 - r.y - 0.25)),
      JSON.stringify(r),
    ).toBe(r.result);
    if (r.pattern === 4) {
      // Native terrain pattern 4 is the single pixel (32,24).
      expect(
        Number(hitsWorm({ x: r.x, y: 48 - r.y }, 32.5, 23.5)),
        JSON.stringify(r),
      ).toBe(r.result);
    }
  }
});

for (const layout of ["fern", "original:image/artclass.img"]) {
  test(`live worms use body-centered native pixels on ${layout}`, async ({
    page,
  }, info) => {
    await page.goto("/");
    await page.waitForFunction(() => window.siege?.getState().assetsReady);
    await page.locator("#mode").selectOption("local");
    await page.locator("#map-layout").selectOption(layout);
    await page.locator("#start").click();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const worms = window.siege.getState().worms;
          return (
            worms.length === 6 &&
            worms.every((w) => w.ground && w.originalTransform)
          );
        }),
      )
      .toBe(true);
    const worms = await page.evaluate(() => window.siege.getState().worms);
    for (const worm of worms) {
      expect(worm.originalTransform).toEqual({
        x: Math.floor(worm.x),
        y: Math.ceil(worm.y),
        offsetX: 0,
        offsetY: 0,
        width: worm.originalCanvas.width,
        height: worm.originalCanvas.height,
      });
    }
    await page.screenshot({ path: info.outputPath("native-worm-bodies.png") });
  });
}
