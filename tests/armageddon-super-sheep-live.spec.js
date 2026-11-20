import { test, expect } from "@playwright/test";

async function startLocalMatch(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  // Step the intro synchronously instead of waiting for it in real time.
  await page.waitForFunction(() => window.siege.getState().phase !== undefined && window.siege.debug);
  const phase = await page.evaluate(() => {
    for (let frame = 0; frame < 2000 && window.siege.getState().phase !== "aim"; frame++)
      window.siege.debug.advanceReplayFrames(1);
    return window.siege.getState().phase;
  });
  expect(phase).toBe("aim");
}

test("Super Sheep takes off on fire, steers 0x5B0 per held frame and explodes on contact", async ({ page }) => {
  await startLocalMatch(page);
  const flight = await page.evaluate(() => {
    const { debug } = window.siege;
    const state = () => window.siege.getState();
    const team = state().worms.findIndex((w) => w.team === state().worms[state().current].team);
    // Open air beside the island, below its cliff tops.
    debug.spawnUnitAt("supersheep", -300, state().waterLevel + 100);
    // spawnUnitAt owns the unit with worm 0; fire belongs to its team.
    const owner = state().worms[0].team === state().worms[state().current].team;
    debug.advanceReplayFrames(2);
    const press = (key, type = "keydown") => window.dispatchEvent(new KeyboardEvent(type, { key }));
    press(" "); press(" ", "keyup");
    const takeOff = state().projectile.sheep;
    debug.advanceReplayFrames(1);
    const straight = state().projectile.sheep;
    press("ArrowRight");
    debug.advanceReplayFrames(3);
    const steered = state().projectile.sheep;
    // Keep turning to about 88 degrees: level flight into the island cliff.
    debug.advanceReplayFrames(8);
    press("ArrowRight", "keyup");
    const sprite = state().projectile.sprite;
    let frames = 0;
    while (state().projectile && frames < 1200) { debug.advanceReplayFrames(1); frames++; }
    return { owner, team, takeOff, straight, steered, sprite, frames, after: state().projectile };
  });
  expect(flight.owner).toBe(true);
  expect(flight.takeOff.phase).toBe(1);
  expect(flight.takeOff.steering).toBe(true);
  // 004E3E40: heading 0 flies straight up at 8 px per frame.
  expect([flight.straight.vx, flight.straight.vy]).toEqual([0, -8 << 16]);
  expect(flight.steered.angle).toBe(3 * 0x5b0);
  expect(flight.steered.vx).toBeGreaterThan(0);
  expect(flight.sprite).toMatch(/^spsheep[12]$/);
  // The flight ends in a detonation well before the 20 s fuse.
  expect(flight.after).toBeNull();
  expect(flight.frames).toBeLessThan(1000);
});

test("second fire drops a flying Super Sheep and the third explodes it", async ({ page }) => {
  await startLocalMatch(page);
  const result = await page.evaluate(() => {
    const { debug } = window.siege;
    const state = () => window.siege.getState();
    debug.spawnUnitAt("supersheep", -300, state().waterLevel + 200); // open air off the map edge
    debug.advanceReplayFrames(2);
    const fire = () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
      window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    };
    fire();
    debug.advanceReplayFrames(5);
    const flying = state().projectile.sheep;
    fire();
    const dropped = state().projectile.sheep;
    const sprite = state().projectile.sprite;
    debug.advanceReplayFrames(2);
    fire();
    debug.advanceReplayFrames(2);
    return { flying, dropped, sprite, after: state().projectile };
  });
  expect(result.flying.phase).toBe(1);
  // 004E4170: a third of the flight velocity, back on the walking art.
  expect(result.dropped.phase).toBe(2);
  expect(result.dropped.steering).toBe(false);
  expect(result.dropped.vy).toBe(Math.trunc((-8 << 16) / 3));
  expect(result.sprite).toBe("sheepwlk");
  expect(result.after).toBeNull();
});

test("released sheep walk 2 px per frame through original 004E3920", async ({ page }) => {
  await startLocalMatch(page);
  const walk = await page.evaluate(() => {
    const { debug } = window.siege;
    const state = () => window.siege.getState();
    // Worms stand on ground: release the sheep beside each in turn until one
    // spot leaves it room to walk (random maps put some by drums or cliffs).
    const steps = [];
    for (const worm of state().worms) {
      debug.spawnUnitAt("sheep", worm.x + 40);
      for (let frame = 0; frame < 150 && state().projectile; frame++) {
        const before = state().projectile;
        debug.advanceReplayFrames(1);
        const after = state().projectile;
        // Only frames that start at rest step: the walk needs zero velocity.
        if (after && after.walkTicks > before.walkTicks && !before.vx && !before.vy)
          steps.push(Math.abs(after.x - before.x));
      }
      if (steps.length > 2) break;
      debug.detonateCurrent();
      debug.advanceReplayFrames(5);
    }
    return { steps, sprite: state().projectile?.sprite };
  });
  expect(walk.steps.length).toBeGreaterThan(2);
  // walkSpeed 100%: dx = 2 px x facing, solved by the 004F4D80 climb.
  for (const step of walk.steps) expect(step).toBe(2);
  expect(walk.sprite).toBe("sheepwlk");
});

test("Aqua Sheep dives and keeps flying where Super Sheep loses flight", async ({ page }) => {
  await startLocalMatch(page);
  const dive = await page.evaluate(() => {
    const { debug } = window.siege;
    const state = () => window.siege.getState();
    const results = {};
    for (const kind of ["aquasheep", "supersheep"]) {
      // Open water beyond the left edge of the island, 60 px above the sea.
      debug.spawnUnitAt(kind, -300, state().waterLevel + 60);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
      window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
      // Turn half a revolution (0x8000 = 22.5 x 0x5B0) to head down.
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
      debug.advanceReplayFrames(23);
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight" }));
      let wet = null;
      for (let frame = 0; frame < 400 && state().projectile; frame++) {
        debug.advanceReplayFrames(1);
        const p = state().projectile;
        // The speed comes from the row before the move, so check a frame deeper.
        if (p && p.y < state().waterLevel - 10) { wet = p.sheep; break; }
      }
      results[kind] = wet;
      debug.detonateCurrent();
      debug.advanceReplayFrames(5);
    }
    return results;
  });
  // 004E3E40: under water the speed halves to 4 px/frame; flag 0x400000
  // makes Super Sheep lose flight instead (004E4170).
  expect(dive.aquasheep.phase).toBe(1);
  expect(Math.hypot(dive.aquasheep.vx, dive.aquasheep.vy) / 65536).toBeCloseTo(4, 0);
  expect(dive.supersheep.phase).toBe(2);
});
