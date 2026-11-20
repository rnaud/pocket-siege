import { test, expect } from "@playwright/test";

test("original team selection arrows preserve all frames and phase timing", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { originalSelectionFrame, updateOriginalSelection } =
      await import("/src/armageddon/selection-hud.js");
    const { originalVisual } = await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    let mismatch = 0,
      frames = 0;
    const names = ["r", "b", "g", "y", "p", "c"].flatMap((color) =>
      ["arrowdn", "arrowsd"].map((prefix) => prefix + color));
    const sources = await Promise.all(names.map((name) =>
      fetch(`/armageddon/sprites/${name}.spr`).then((r) => r.arrayBuffer())));
    for (const [n, name] of names.entries()) {
      const source = decodeSprite(sources[n]);
      for (let i = 0; i < source.frames.length; i++) {
        const actual = originalVisual(name, i)
          .map.image.getContext("2d")
          .getImageData(0, 0, 60, 60).data;
        const expected = spriteFrameRGBA(source, i);
        if (!actual.every((v, k) => v === expected[k])) mismatch++;
        frames++;
      }
    }
    const phases = [0, 1, 25, 49, 50, 75, 100].map((t) =>
      originalSelectionFrame(2, false, t),
    );
    const label = document.createElement("div");
    updateOriginalSelection(label, 0, 25, true);
    const green = label.firstChild.dataset.originalSprite;
    updateOriginalSelection(label, 1, 25, true);
    const red = label.firstChild.dataset.originalSprite;
    updateOriginalSelection(label, 1, 25, false);
    return {
      mismatch,
      frames,
      phases,
      green,
      red,
      hidden: label.firstChild.hidden,
    };
  });
  expect(result).toEqual({
    mismatch: 0,
    frames: 360,
    phases: [0, 0, 15, 29, 0, 15, 0].map((index) => ({
      name: "arrowdng",
      index,
    })),
    green: "arrowdng",
    red: "arrowdnr",
    hidden: true,
  });
});

test("original team selection arrow follows the simulation phase", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await expect(
    page.locator(".worm-label.active .original-selection"),
  ).toBeVisible();
  await page.locator("#restart").click();
  const frame = await page
    .locator(".worm-label.active .original-selection")
    .getAttribute("data-frame");
  await page.waitForTimeout(150);
  await expect(
    page.locator(".worm-label.active .original-selection"),
  ).toHaveAttribute("data-frame", frame);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await expect(
    page.locator(".worm-label.active .original-selection"),
  ).toBeVisible();
});
