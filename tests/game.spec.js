import { test, expect } from "@playwright/test";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
test("play a full destructive turn with responsive controls", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  // This fixed shot needs a fixed terrain fixture; the default picks an original map.
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await expect(page.locator("#menu")).not.toBeVisible();
  await expect(page.locator("#fire")).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const finishTurn = target => page.evaluate(target => {
    for(let frames=0;frames<1500;frames+=25) {
      window.siege.debug.advanceReplayFrames(25);
      if(window.siege.getState().team===target)return target;
    }
    return window.siege.getState().team;
  },target);
  const before = await page.evaluate(() => window.siege.getState());
  await setAim(page, "-60");
  await chargeShot(page);
  expect(await finishTurn(1)).toBe(1);
  const after = await page.evaluate(() => window.siege.getState());
  expect(after.explosions).toBeGreaterThan(0);
  expect(after.terrainPixels).toBeLessThan(before.terrainPixels);
  await page.screenshot({
    path: `test-results/${info.project.name}-game.png`,
    fullPage: true,
  });
  await openArsenal(page);
  await page.locator('[data-weapon="grenade"]').click();
  await setAim(page, "90");
  await chargeShot(page);
  expect(await finishTurn(0)).toBe(0);
  expect(errors).toEqual([]);
});
test("computer takes its turn and returns control", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="ai"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  // Test the computer's turn without a human projectile or supply-drop
  // settlement delaying its start; destructive turns are covered above.
  await page.evaluate(async () => {
    await window.siege.debug.resetSeed(42);
    window.siege.debug.setCrateKind("grenade");
    window.siege.debug.collectCrate();
  });
  await page.locator("#skip").click();
  await advanceUntil(page, (s) => s.team === 1, { max: 1500, step: 5, label: "computer turn" });
  await expect(page.locator("#fire")).toBeDisabled();
  const playerHp = (state) => state.worms.filter((w) => w.team === 0).reduce((sum, w) => sum + w.hp, 0);
  const before = playerHp(await page.evaluate(() => window.siege.getState()));
  // Bound the simulation, not the runner's render speed. This still executes
  // the actual AI, projectile and settlement steps, with no forced turn change.
  const after = await page.evaluate(() => {
    for (let frames=0;frames<1500;frames+=25) {
      window.siege.debug.advanceReplayFrames(25);
      const state = window.siege.getState();
      if (state.team === 0 && state.round === 2 && state.phase === "aim") return state;
    }
    return window.siege.getState();
  });
  expect(after.round).toBe(2);
  expect(after.team).toBe(0);
  // The original AI may pick any family: a projectile leaves a recorded shot,
  // a strike or melee attack shows up as damage to the player's worms.
  expect((after.lastShot?.points ?? 0) > 1 || playerHp(after) < before).toBe(true);
  await expect(page.locator("#fire")).toBeEnabled();
});
test("movement, jump, and pointer aiming", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="ai"]').click();
  await page.locator("#start").click();
  const before = await page.evaluate(() => window.siege.getState().worms[0]);
  await page.locator('[data-move="1"]').scrollIntoViewIfNeeded();
  const button = await page.locator('[data-move="1"]').boundingBox();
  await page.mouse.move(
    button.x + button.width / 2,
    button.y + button.height / 2,
  );
  await page.mouse.down();
  await advanceUntil(page, (s, x) => s.worms[0].x > x + 6, { arg: before.x, max: 500, label: "walked right" });
  await page.mouse.up();
  await advanceUntil(page, (s) => s.worms[0].ground, { max: 500, label: "landed" });
  const jumpY = await page.evaluate(() => window.siege.getState().worms[0].y);
  await page.locator("#jump").click();
  await advanceUntil(page, (s, y) => s.worms[0].y > y + 10, { arg: jumpY, max: 200, label: "jumped" });
  const field = await page.locator("#arena").boundingBox();
  await page.mouse.click(
      field.x + field.width * 0.7,
      field.y + field.height * 0.2,
    );
  expect(await page.locator("#angle").inputValue()).not.toBe("45");

});


test("original art loads and character labels stay readable", async ({
  page,
}, info) => {
  const missing = [];
  page.on("response", (r) => {
    if (r.url().includes("/armageddon/") && r.status() !== 200) missing.push(r.url());
  });
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.screenshot({
    path: `test-results/${info.project.name}-art-menu.png`,
    fullPage: true,
  });
  await page.locator('[data-mode="ai"]').click();
  await expect(page.locator("#start")).toBeInViewport();
  await page.locator("#start").click();
  await expect(page.locator(".worm-label")).toHaveCount(6);
  const labels = await page.locator('.native-worm-text').evaluateAll(canvases =>
    canvases.map(canvas => ({ width: canvas.width, height: canvas.height,
      rendering: getComputedStyle(canvas).imageRendering })));
  expect(labels).toHaveLength(6);
  for (const label of labels) {
    expect(label.width).toBeGreaterThan(0);
    expect(label.height).toBe(33);
    expect(label.rendering).toBe('pixelated');
  }
  await page.screenshot({
    path: `test-results/${info.project.name}-art-battle.png`,
    fullPage: true,
  });
  expect(missing).toEqual([]);
});

test("crosshair and articulated weapon follow upward and downward aim", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await expect(page.locator("#aim-reticle")).toBeVisible();
  await setAim(page, "90");
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].weaponRotation),
    )
    .toBeCloseTo(Math.PI / 2, 2);
  await page.screenshot({
    path: `test-results/${info.project.name}-aim-up.png`,
    fullPage: true,
  });
  // Fire vertically into the ground beneath the shooter. A diagonal shot
  // can pass the ledge and explode outside self-damage range with native masks.
  await setAim(page, "-90");
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].weaponRotation),
    )
    .toBeLessThan(0);
  const aim = await page.evaluate(() => window.siege.getState().aim);
  expect(aim.muzzle.y).toBeLessThan(aim.pivot.y);
  await page.screenshot({
    path: `test-results/${info.project.name}-aim-down.png`,
    fullPage: true,
  });
  await chargeShot(page);
  await expect(page.locator("#aim-guide")).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().worms[0].pose), {
      intervals: [20, 30, 50],
      timeout: 5000,
    })
    .toBe("hurt");
  await expect(page.locator(".worm-label.hurt")).not.toHaveCount(0);
  await page.screenshot({
    path: `test-results/${info.project.name}-hurt.png`,
    fullPage: true,
  });
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.worms[0].hp).toBeLessThan(100);
  expect(state.worms[0].hits).toBeGreaterThan(0);
  // Finish the shot, settlement and any turn-start supply drop in frames.
  await advanceUntil(page, (s) => s.team === 1, { max: 6000, step: 10, label: "next team" });
  await advanceUntil(page, (s) => s.phase === "aim", { max: 3000, step: 10, label: "aim phase" });
  await expect(page.locator("#aim-reticle")).toBeVisible();
});

test("grenade shows fuse and swaps weapon, help pauses the turn", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-mode="local"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await openArsenal(page);
  await page.locator('[data-weapon="grenade"]').click();
  await setAim(page, "90");
  await chargeShot(page);
  await expect(page.locator("#projectile-tag")).toContainText(/\d\.\ds/);
  await expect(page.locator('[data-weapon="rocket"]')).toBeDisabled();
  await page.locator("#help").click();
  const before = await page.evaluate(() => window.siege.getState().projectile);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.siege.getState().projectile)).toEqual(
    before,
  );
  await page.locator(".close-help").click();
  await advanceUntil(page, (s) => s.projectile === null, { max: 3000, step: 5, label: "grenade resolved" });
});

test("Space charges until release, arrows only aim, and no shot prediction exists", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await expect(page.locator("#fire")).toBeEnabled();
  await expect(page.locator("#power")).toHaveCount(0);
  await expect(
    page.locator(".arc,.arc-shadow,.impact-marker,.impact-caption"),
  ).toHaveCount(0);
  await setAim(page, "45");
  const y = await page.evaluate(() => window.siege.getState().worms[0].y);
  await page.keyboard.down("ArrowUp");
  await expect
    .poll(async () => Number(await page.locator("#angle").inputValue()), {
      timeout: 5000,
    })
    .toBeGreaterThan(45);
  await page.keyboard.up("ArrowUp");
  expect(
    Math.abs(
      (await page.evaluate(() => window.siege.getState().worms[0].y)) - y,
    ),
  ).toBeLessThan(2);
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(200);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.down("Space");
  // Wait on simulation state, not wall-clock time: a loaded CI runner may
  // process fewer fixed steps than a local machine in the same interval.
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().power), {
      timeout: 5000,
    })
    .toBeGreaterThan(10);
  const held = await page.evaluate(() => window.siege.getState());
  expect(held.charging).toBe(true);
  expect(held.shotCount).toBe(0);
  expect(held.projectile).toBeNull();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().power), {
      timeout: 5000,
    })
    .toBeGreaterThan(Math.max(held.power + 5, 30));
  await page.keyboard.up("Space");
  expect(await page.evaluate(() => window.siege.getState().shotCount)).toBe(1);
  expect(
    await page.evaluate(() => window.siege.getState().firedPower),
  ).toBeGreaterThan(25);
});

test("holding fire caps at one full-power shot and canceled input does not shoot", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await expect(page.locator("#fire")).toBeEnabled();
  const b = page.locator("#fire");
  await b.scrollIntoViewIfNeeded();
  const rect = await b.boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await advanceFrames(page, 12);
  expect(await page.evaluate(() => window.siege.getState().charging)).toBe(
    true,
  );
  await page.dispatchEvent("#fire", "pointercancel");
  await page.mouse.up();
  expect(await page.evaluate(() => window.siege.getState().shotCount)).toBe(0);
  await page.keyboard.down("Space");
  // A held charge fires by itself at full power; step until it does.
  await advanceUntil(page, (s) => s.shotCount === 1, { max: 500, label: "full-power shot" });
  expect(await page.evaluate(() => window.siege.getState().firedPower)).toBe(
    100,
  );
  await page.keyboard.up("Space");
  expect(await page.evaluate(() => window.siege.getState().shotCount)).toBe(1);
});

test("grenade fuse selection and retreat movement work without granting another shot", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await expect(page.locator("#fire")).toBeEnabled();
  await openArsenal(page);
  await page.locator('[data-weapon="grenade"]').click();
  await page.keyboard.press("5");
  await page.keyboard.press("-");
  expect(await page.evaluate(() => window.siege.getState().fuse)).toBe(5);
  expect(await page.locator("#bounce").inputValue()).toBe("0.3");
  await setAim(page, "90");
  await chargeShot(page, 1200);
  await expect(page.locator("#projectile-tag")).toContainText(/4\.\ds/);
  const before = await page.evaluate(() => window.siege.getState().worms[0].x);
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().worms[0].x), {
      timeout: 5000,
    })
    .toBeGreaterThan(before + 3);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.press("Space");
  expect(await page.evaluate(() => window.siege.getState().shotCount)).toBe(1);
  await advanceUntil(page, (s) => s.retreat === 0, { max: 1500, step: 5, label: "retreat over" });
});
