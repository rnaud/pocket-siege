import { test, expect } from "@playwright/test";
import { advanceFrames } from "./helpers/game-sim.js";

test("original art stays on an integer pixel grid without bitmap requests", async ({
  page,
}, info) => {
  const bitmaps = [],
    errors = [];
  page.on("request", (request) => {
    if (/\.(png|jpe?g|webp)(?:\?|$)/i.test(request.url()))
      bitmaps.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      [...document.fonts].some(
        (font) => font.family === "Siege Pixel" && font.status === "loaded",
      ),
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-pixel-menu.png`,
  });
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  // Play through the turn announcement in simulated time.
  await advanceFrames(page, 110);
  await expect(page.locator("#announcement")).toBeHidden({
    timeout: 10000,
  });
  await page.screenshot({
    path: `test-results/${info.project.name}-pixel-scene.png`,
  });
  await page.locator("#arena").screenshot({
    path: `test-results/${info.project.name}-reference-battlefield.png`,
  });
  for (const size of [
    { width: 1280, height: 720 },
    { width: 391, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const c = document.querySelector("#scene canvas");
          const scale = Number(c.dataset.pixelScale);
          const arena = document.querySelector("#arena");
          return (
            c.clientWidth === c.width * scale &&
            c.clientHeight === c.height * scale &&
            Number.isInteger(scale) &&
            (!matchMedia("(pointer: coarse)").matches || arena.classList.contains("portrait-camera") ||
              Math.abs(arena.clientWidth / arena.clientHeight - 16 / 9) <
                0.03) &&
            c.clientWidth >= arena.clientWidth &&
            c.clientWidth - arena.clientWidth < scale &&
            c.clientHeight >= arena.clientHeight &&
            c.clientHeight - arena.clientHeight < scale
          );
        }),
      )
      .toBe(true);
  }
  const pixels = await page.evaluate(async () => {
    const { originalVisual } = await import("/src/armageddon/art.js");
    return ["wblink1","grenade","missile","mineoff"].every(name => {
      const c=originalVisual(name).map.image;
      const data=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
      return [...data].every((v,i)=>i%4!==3||v===0||v===255);
    });
  });
  expect(pixels).toBe(true);
  expect(bitmaps).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/${info.project.name}-pixel-battle.png`,
  });
});
