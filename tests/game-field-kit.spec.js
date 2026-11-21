import { test, expect } from "./helpers/shared-page.js";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
import { startMatch } from "./helpers/match.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
test("field kit teleport and girder target the battlefield", async ({
  page,
}) => {
  await startMatch(page, { map: "fern", seed: 42 });
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="teleport"]').click();
  let box = await page.locator("#arena").boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.2);
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.utilities.teleport).toBe(0);
  expect(state.phase).toBe("settle");
  await expect.poll(() => page.evaluate(() => window.siege.getState().nativeCameraFocus)).not.toBeNull();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().worms[0].y))
    .toBeGreaterThan(300);
  // Finish rematerialization and the fall using simulation ticks, not a wall-clock deadline.
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(350));
  await expect.poll(() => page.evaluate(() => window.siege.getState().nativeCameraFocus)).toBeNull();

  await page.reload();
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="girder"]').click();
  box = await page.locator("#arena").boundingBox();
  state = await page.evaluate(() => window.siege.getState());
  const beforeGirder = state, active = state.worms[state.current], camera = state.camera;
  await page.mouse.click(box.x + (active.x-camera.x)/camera.w*box.width,
    box.y + (1-(active.y-camera.y)/camera.h)*box.height);
  state = await page.evaluate(() => window.siege.getState());
  expect(state.girders).toHaveLength(0);
  expect(state.utilities.girder).toBe(beforeGirder.utilities.girder);
  expect(state.terrainPixels).toBe(beforeGirder.terrainPixels);
  expect(state.phase).toBe("aim");
  // Resolve world coordinates and dispatch in the same frame; camera easing
  // must not turn a valid near-worm target into a different world position.
  await page.evaluate(() => {
    const state=window.siege.getState(),w=state.worms[state.current],camera=state.camera;
    const arena=document.querySelector("#arena"),box=arena.getBoundingClientRect();
    arena.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerType:"mouse",button:0,
      clientX:box.x+(w.x+80-camera.x)/camera.w*box.width,
      clientY:box.y+(1-(w.y+100-camera.y)/camera.h)*box.height}));
  });
  state = await page.evaluate(() => window.siege.getState());
  expect(state.girders).toHaveLength(1);
  expect(state.utilities.girder).toBe(0);
  expect(state.phase).toBe("settle");
});

test("rope attaches and releases; jetpack burns fuel", async ({ page }) => {
  await startMatch(page, { map: "fern" });
  let attached = false;
  for (const angle of [0, -10, 10, -30, 30, -50]) {
    await page.locator("#angle").evaluate((el, value) => {
      el.value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, angle);
    await page.keyboard.press("r");
    await page.waitForTimeout(40);
    attached = await page.evaluate(() => window.siege.getState().rope.attached);
    if (attached) break;
  }
  expect(attached).toBe(true);
  await page.evaluate(() => window.siege.debug.releaseRope());
  expect(await page.evaluate(() => window.siege.getState().rope.attached)).toBe(
    false,
  );
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="jetpack"]').click();
  await advanceFrames(page, 12);
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.jetpack.active).toBe(true);
  expect(state.jetpack.fuel).toBe(30);
  await page.keyboard.down("ArrowUp");
  await expect.poll(() => page.evaluate(() => window.siege.getState().jetpack.fuel)).toBeLessThan(30);
  await page.keyboard.up("ArrowUp");
  await page.keyboard.press("j");
  state = await page.evaluate(() => window.siege.getState());
  expect(state.jetpack.active).toBe(false);
});

test("parachute and freeze utilities resolve their effects", async ({
  page,
}) => {
  await startMatch(page, { map: "fern" });
  // Turn-control checks exclude unrelated supply-drop settlement.
  await page.evaluate(async () => {
    await window.siege.debug.resetSeed(42);
    window.siege.debug.setCrateKind("grenade");
    window.siege.debug.collectCrate();
  });
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="parachute"]').click();
  expect(
    await page.evaluate(() => window.siege.getState().parachuteArmed),
  ).toBe(true);
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="freeze"]').click();
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.frozen).toEqual([1, 1, 1, 0, 0, 0]);
  // Read Moss's kit: with no fixed gap the next team's turn may already run.
  expect(state.utilityAmmo[0].freeze).toBe(0);
  await advanceUntil(page, (s) => s.team === 1, { max: 500, step: 5, label: "next team" });
  expect(await page.evaluate(() => window.siege.getState().frozen)).toEqual([
    1, 1, 1, 0, 0, 0,
  ]);
  await page.locator("#skip").click();
  await advanceUntil(page, (s) => s.team === 0, { max: 500, step: 5, label: "back to first team" });
  await advanceUntil(page, (s) => s.frozen.every((f) => f === 0), { max: 500, step: 5, label: "thawed" });
  expect(await page.evaluate(() => window.siege.getState().frozen)).toEqual([0, 0, 0, 0, 0, 0]);
});

test("scheme presets apply turn pace, sudden death and stockpile rules", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-mode="ai"]').click();
  await page.selectOption("#scheme", "blitz");
  expect(await page.locator("#turn-time").inputValue()).toBe("30");
  expect(await page.locator("#retreat-time").inputValue()).toBe("5");
  expect(await page.locator("#sudden-death").inputValue()).toBe("health");
  await page.locator("#start").click();
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.scheme).toBe("blitz");
  expect(state.turnSeconds).toBe(30);
  expect(state.retreatSeconds).toBe(5);
  expect(state.suddenDeathType).toBe("health");
  expect(state.crateRain).toBe(true);
  await page.reload();
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="ai"]').click();
  await page.selectOption("#scheme", "stockpile");
  expect(await page.locator("#format").inputValue()).toBe("best3");
  await page.locator("#start").click();
  state = await page.evaluate(() => window.siege.getState());
  expect(state.scheme).toBe("stockpile");
  expect(state.stockpile).toBe(true);
  expect(state.format).toBe("best3");
});

test("stockpile keeps ammo and utilities across series islands", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-mode="ai"]').click();
  await page.selectOption("#scheme", "stockpile");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.setAmmo(0, "grenade", 7));
  await page.evaluate(() => window.siege.debug.knockout(1));
  await advanceUntil(page, (s) => s.seriesWins[0] === 1, { max: 500, step: 5, label: "series win" });
  expect(await page.evaluate(() => window.siege.getState().seriesWins)).toEqual([1, 0]);
  // The next island starts after the break; stockpiled ammo carries over.
  // The next island may load its map asynchronously, so yield between steps.
  const nextIsland = await page.evaluate(async () => {
    for (let frame = 0; frame < 2000; frame += 5) {
      const s = window.siege.getState();
      if (s.ammo[0].grenade === 7 && s.phase !== "break") return true;
      window.siege.debug.advanceReplayFrames(5);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return false;
  });
  expect(nextIsland).toBe(true);
});

test("special and utility crates stock the field kit", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-mode="local"]').click();
  // Custom keeps the host crate rules; Classic duel draws crates from the scheme bag.
  await page.selectOption("#scheme", "custom");
  await page.locator("#start").click();
  const specialKinds = await page.locator('.weapons [data-weapon]').evaluateAll(buttons => buttons.slice(5).map(button => button.dataset.weapon));
  await page.evaluate(kinds => {
    for (const kind of kinds) window.siege.debug.setAmmo(0, kind, 0);
  }, specialKinds);
  const beforeSpecial = await page.evaluate(
    () => window.siege.getState().ammo[0],
  );
  await page.evaluate(() => window.siege.debug.setCrateKind("special"));
  await page.evaluate(() => window.siege.debug.collectCrate());
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.crate).toBeNull();
  const specialTotal = (loadout) => specialKinds.reduce((sum, kind) => sum + loadout[kind], 0);
  expect(specialTotal(state.ammo[0])).toBe(1);
  expect(specialTotal(beforeSpecial)).toBe(0);

  await page.reload();
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.setCrateKind("utility"));
  await page.evaluate(() => window.siege.debug.collectCrate());
  state = await page.evaluate(() => window.siege.getState());
  expect(state.crate).toBeNull();
  expect(
    Object.entries(state.utilities)
      .filter(([kind]) => kind !== "rope")
      .reduce((sum, [, n]) => sum + n, 0),
  ).toBeGreaterThan(5);
});
