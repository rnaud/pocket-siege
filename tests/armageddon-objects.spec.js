import { test, expect } from "@playwright/test";
async function start(page) {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  expect(
    await page.evaluate(() => window.siege.getState().originalArtError),
  ).toBeNull();
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
}
test("original crates descend by parachute and switch to ground idle art", async ({
  page,
}) => {
  await start(page);
  const initial = await page.evaluate(() => window.siege.getState());
  expect(initial.crate.sprite).toMatch(/^[muw]crate2$/);
  expect(initial.hazards.length).toBeGreaterThan(0);
  expect(initial.hazards.every((h) => h.sprite === "oildrum1")).toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().crate?.sprite), {
      timeout: 5000,
    })
    .toMatch(/^[muw]crate1$/);
  await page.screenshot({ path: "test-results/original-world-objects.png" });
});
test("cluster fragments and fire use original art in live gameplay", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => window.siege.debug.explodeAt(600, 500, "cluster"));
  const fragments = await page.evaluate(() => window.siege.getState().bombs);
  expect(fragments).toHaveLength(5);
  expect(fragments.every((b) => b.sprite === "clustlet")).toBe(true);
  await page.evaluate(() => window.siege.debug.explodeAt(600, 350, "napalm"));
  const fires = await page.evaluate(() => window.siege.getState().fires);
  expect(fires).toHaveLength(3);
  expect(
    fires.every((f) => f.sprites.join(",") === "flame1,flame1,flame1"),
  ).toBe(true);
});
test("native object strips preserve ping-pong playback and feet when changing canvas size", async ({
  page,
}) => {
  await start(page);
  const result = await page.evaluate(async () => {
    const { createOriginalObject, updateOriginalObject, originalVisual } =
      await import("/src/armageddon/art.js");
    const mesh = createOriginalObject("wcrate2", -10);
    const foot = () => {
      const frame = originalVisual(mesh.userData.originalSprite);
      const plane = mesh.children[0];
      return plane.position.y + plane.scale.y / 2 - frame.bottom;
    };
    const fallingFoot = foot();
    updateOriginalObject(mesh, "wcrate1", 0);
    const landedFoot = foot();
    const data = originalVisual("wcrate1");
    updateOriginalObject(mesh, "wcrate1", 0, 0x8000);
    const middle = mesh.userData.originalFrame;
    updateOriginalObject(mesh, "wcrate1", 0, 0xffff);
    const end = mesh.userData.originalFrame;
    mesh.children[0].geometry.dispose();
    mesh.children[0].material.dispose();
    return { fallingFoot, landedFoot, middle, end, count: data.count };
  });
  expect(result.fallingFoot).toBe(-10);
  expect(result.landedFoot).toBe(-10);
  expect(result.middle).toBe(result.count - 1);
  expect(result.end).toBe(1);
});

test("planting a mine displays the original unarmed sprite", async ({
  page,
}) => {
  await start(page);
  if (!(await page.locator(".weapon-panel").isVisible()))
    await page.locator("#inventory-toggle").click();
  await page.locator('[data-weapon="mine"]').click();
  await page.locator("#fire").click();
  const mines = await page.evaluate(() => window.siege.getState().mines);
  expect(mines).toHaveLength(1);
  expect(mines[0].sprite).toBe("mineoff");
});
