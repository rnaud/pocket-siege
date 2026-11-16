import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/charge-art.json" with { type: "json" };
import { nativeChargeBlobs } from "../src/armageddon/charge-art.js";
test("charge blob requests match original x86 renderer", () => {
  for (const row of fixture.cases)
    expect(nativeChargeBlobs(row.power, row.x, row.y, row.dx, row.dy)).toEqual(
      row.requests,
    );
});
test("original charge sprites appear while charging and clear on release", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  const mismatch = await page.evaluate(async () => {
    const { originalVisual } = await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    const source = decodeSprite(
      await fetch("/armageddon/sprites/blob.spr").then((r) => r.arrayBuffer()),
    );
    let mismatches = 0;
    for (let i = 0; i < 16; i++) {
      const actual = originalVisual("blob", i)
        .map.image.getContext("2d")
        .getImageData(0, 0, 64, 64).data;
      const expected = spriteFrameRGBA(source, i);
      if (!actual.every((v, k) => v === expected[k])) mismatches++;
    }
    return mismatches;
  });
  expect(mismatch).toBe(0);
  await page.keyboard.down("Space");
  await expect
    .poll(
      async () =>
        +(await page
          .locator(".original-charge-blobs")
          .getAttribute("data-blob-count")),
    )
    .toBeGreaterThan(4);
  await expect(page.locator(".reticle-charge")).toBeHidden();
  await page.screenshot({ path: info.outputPath("original-charge.png") });
  await page.keyboard.up("Space");
  await expect(page.locator("#aim-guide")).toBeHidden();
});
