import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/collision-mask.json" with { type: "json" };
import { ORIGINAL_MASK_REGIONS } from "../src/armageddon/collision-mask.js";
test("native collision mask crops, anchors and all shifted pixels match original constructor", async ({
  page,
}) => {
  await page.goto("/");
  const masks = await page.evaluate(async () => {
    const { decodeImage } = await import("/src/armageddon/image.js");
    const { nativeCollisionMask, ORIGINAL_MASK_REGIONS } =
      await import("/src/armageddon/collision-mask.js");
    const source = decodeImage(
      await fetch("/armageddon/media/gfx/gfx/masks.img").then((r) =>
        r.arrayBuffer(),
      ),
    );
    return Object.entries(ORIGINAL_MASK_REGIONS).map(([shape, region]) => ({
      shape: +shape,
      ...nativeCollisionMask(source, region),
    }));
  });
  for (const row of fixture.cases) {
    expect(ORIGINAL_MASK_REGIONS[row.shape]).toEqual(row.params);
    const { params, ...expected } = row;
    expect(masks.find((m) => m.shape === row.shape)).toEqual(expected);
  }
});
