import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/sight-geometry.json" with { type: "json" };
import { nativeSightGeometry } from "../src/armageddon/sight-geometry.js";
test("native sight coordinates match original trig and offset instructions", { tag: "@logic" }, () => {
  for (const r of fixture.cases)
    expect(nativeSightGeometry(r.x, r.y, r.aim, r.facing, r.opening)).toEqual(
      r.result,
    );
});
test("live sight reaches native world distance independently of viewport", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  // The sight opens in simulation steps; the HUD reads it on the next render.
  // Advance the opening synchronously instead of waiting for it in real time.
  const distance = await page.evaluate(async () => {
    const read = () => {
      const g = window.siege.getState().aim?.nativeSight;
      return g ? Math.hypot(g.dx, g.dy) / 65536 : 0;
    };
    for (let i = 0; i < 40 && read() <= 79; i++) {
      window.siege.debug.advanceReplayFrames(5);
      await new Promise(requestAnimationFrame);
    }
    return read();
  });
  expect(distance).toBeGreaterThan(79);
  expect(distance).toBeLessThanOrEqual(80.01);
});
