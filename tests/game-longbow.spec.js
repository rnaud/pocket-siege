import { test, expect } from "./helpers/shared-page.js";
import { startMatch } from "./helpers/match.js";

// The original arrow (00502E70/00503840) flies straight along its aim; a worm
// takes the kind 9 hit (15 damage, a quarter of the arrow's velocity) and the
// arrow is gone, while landscape keeps it: its image becomes terrain.
async function fireArrow(page, enemyX, wallX = 700) {
  return page.evaluate(([enemyX, wallX]) => {
    const debug = window.siege.debug;
    const staged = debug.stageArrowRange(enemyX, wallX);
    debug.setAmmo(0, "longbow", 9);
    debug.setWeapon("longbow");
    const aim = document.querySelector("#angle");
    aim.value = 0;
    aim.dispatchEvent(new Event("input", { bubbles: true }));
    debug.advanceReplayFrames(30);
    const before = window.siege.getState();
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: " ", code: "Space", bubbles: true }));
    key("keydown");
    const path = [];
    let frames = 0;
    for (; frames < 400 && !path.length; frames++) {
      debug.advanceReplayFrames(1);
      const p = window.siege.getState().projectile;
      if (p?.kind === "longbow") path.push(p);
    }
    key("keyup");
    for (; frames < 400; frames++) {
      debug.advanceReplayFrames(1);
      const p = window.siege.getState().projectile;
      if (p?.kind !== "longbow") break;
      path.push(p);
    }
    const after = window.siege.getState();
    return { staged, path, before: before.worms[staged.enemy].hp, after: after.worms[staged.enemy].hp,
      enemy: after.worms[staged.enemy], ammo: after.ammo[0].longbow,
      stuck: [wallX - 2, wallX - 1].map((x) => debug.solidAt(x, 252)) };
  }, [enemyX, wallX]);
}

test("longbow arrow flies along its aim, hits a worm or sticks in landscape", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  const shot = await fireArrow(page, 520);
  expect(shot.ammo).toBe(8);
  expect(shot.path.length).toBeGreaterThan(2);
  // Level aim: 20 px a frame to the right, heading 0x4000, at the worm's height.
  for (const p of shot.path) {
    expect(p.y).toBe(shot.path[0].y);
    expect(p.arrow.angle).toBe(0x4000);
    expect(p.arrow.vx).toBe(0x140000);
    expect(p.sprite).toBe("arrow");
  }
  expect(shot.path[1].x - shot.path[0].x).toBe(20);
  expect(shot.path.at(-1).x).toBeLessThan(520);
  expect(shot.before - shot.after).toBe(15);
  expect(shot.enemy.vx).toBeGreaterThan(0); // pushed along the arrow (v/4)
  expect(shot.stuck).toEqual([false, false]);

  // Next turn: the enemy stands behind a wall. The arrow is kept where its
  // check met the wall, its image blitted into the landscape centred there:
  // the fletching sticks out of the wall face as new terrain.
  await page.evaluate(() => {
    for (let i = 0; i < 4000 && window.siege.getState().phase !== "aim"; i++) window.siege.debug.advanceReplayFrames(1);
  });
  const wall = await fireArrow(page, 560, 480);
  expect(wall.path.at(-1).x).toBeLessThan(480);
  expect(wall.before).toBe(wall.after);
  expect(wall.stuck).toEqual([true, true]);
  expect(errors).toEqual([]);
});

test("longbow fires two arrows per use, as record +0x54 allows", async ({ page }) => {
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  const result = await page.evaluate(() => {
    const debug = window.siege.debug;
    debug.advanceReplayFrames(30);
    debug.setAmmo(0, "longbow", 9);
    debug.setWeapon("longbow");
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: " ", code: "Space", bubbles: true }));
    const shoot = () => {
      key("keydown");
      let seen = false;
      for (let i = 0; i < 400; i++) {
        debug.advanceReplayFrames(1);
        const s = window.siege.getState();
        if (s.projectile?.kind === "longbow") seen = true;
        else if (seen) break;
        if (i === 3) key("keyup");
      }
      key("keyup");
      debug.advanceReplayFrames(2);
      const s = window.siege.getState();
      return { phase: s.phase, ammo: s.ammo[0].longbow, team: s.team, retreat: s.retreat > 0 };
    };
    const team = window.siege.getState().team;
    return { team, first: shoot(), second: shoot() };
  });
  // After the first arrow the worm aims again with one use spent.
  expect(result.first).toMatchObject({ phase: "aim", ammo: 8, team: result.team, retreat: false });
  // The second arrow uses no more ammo and starts the retreat.
  expect(result.second.ammo).toBe(8);
  expect(result.second.phase === "aim" && result.second.team === result.team && !result.second.retreat).toBe(false);
});
