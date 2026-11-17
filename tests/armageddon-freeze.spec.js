import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { freezeTeam, nativeFreezeAnimation } from "../src/armageddon/freeze.js";
import { blastImpulse } from "../src/physics.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/freeze.json", import.meta.url),
  ),
);
const ids = JSON.parse(
  fs.readFileSync(
    new URL("../src/armageddon/sprite-ids.json", import.meta.url),
  ),
).sprites;

test("Freeze targets match original dispatch and animation queue execution", { tag: "@logic" }, () => {
  for (const v of fixture.dispatch) {
    const worms = Array.from({ length: 6 }, (_, team) => ({
      team,
      hp: 100,
      frozen: 0,
    }));
    freezeTeam(worms, v.team);
    expect(worms.filter((w) => w.frozen).map((w) => w.team)).toEqual([
      v.payload_team,
    ]);
    expect(v.event).toBe(0x411);
  }
  for (const v of fixture.animation) {
    const queue = nativeFreezeAnimation(v.previous_sprite_id);
    const calls = [
      ...(queue.clear ? [{ operation: "clear" }] : []),
      ...queue.sprites.map((sprite_id) => ({ operation: "queue", sprite_id })),
    ];
    expect(calls).toEqual(v.calls);
  }
  expect(Object.keys(ids)).toHaveLength(767);
  for (const sprite of Object.values(ids))
    expect(
      fs.existsSync(
        new URL(
          `../public/armageddon/sprites/${sprite.name}.spr`,
          import.meta.url,
        ),
      ),
      sprite.name,
    ).toBe(true);
  expect(ids[0x248].name).toBe("wicestnd");
});

test("frozen blast response suppresses horizontal push but retains falling motion", { tag: "@logic" }, () => {
  const worm = { x: 20, y: 100, vx: 80, vy: -5, frozen: 1 };
  const factor = blastImpulse(worm, 0, 100, 100);
  expect(factor).toBeGreaterThan(0);
  expect(worm.vx).toBe(0);
  expect(worm.vy).not.toBe(-5);
});

test("Freeze protects its own squad, shows native ice and thaws without skipping", async ({
  page,
}) => {
  const audio = new Set();
  page.on("response", (r) => {
    if (r.ok() && r.url().endsWith(".wav")) audio.add(r.url().split("/").pop());
  });
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  // Fix terrain/object placement so random settling does not time the Freeze check.
  await page.evaluate(async () => {
    await window.siege.debug.resetSeed(42);
    window.siege.debug.setCrateKind("grenade");
    window.siege.debug.collectCrate();
  });
  await page.locator("#sound").click();
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="freeze"]').click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().team))
    .toBe(1);
  expect(await page.evaluate(() => window.siege.getState().phase)).toBe("aim");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.siege
          .getState()
          .worms.slice(0, 3)
          .map((w) => w.originalSprite),
      ),
    )
    .toEqual(["wicestnd", "wicestnd", "wicestnd"]);
  await page.screenshot({ path: test.info().outputPath("native-freeze.png") });
  await page.evaluate(() => window.siege.debug.hit(0, 50));
  expect(
    await page.evaluate(() =>
      window.siege
        .getState()
        .worms.slice(0, 3)
        .map((w) => w.hp),
    ),
  ).toEqual([100, 100, 100]);
  await page.locator("#skip").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().team))
    .toBe(0);
  expect(await page.evaluate(() => window.siege.getState().phase)).toBe("aim");
  expect(await page.evaluate(() => window.siege.getState().frozen)).toEqual([
    0, 0, 0, 0, 0, 0,
  ]);
  await expect
    .poll(() =>
      [...audio]
        .filter((name) =>
          ["freeze.wav", "unfreeze.wav", "frozenwormimpact.wav"].includes(name),
        )
        .sort(),
    )
    .toEqual(["freeze.wav", "frozenwormimpact.wav", "unfreeze.wav"]);
  await page.evaluate(() => window.siege.debug.hit(0, 7));
  expect(
    await page.evaluate(() =>
      window.siege
        .getState()
        .worms.slice(0, 3)
        .map((w) => w.hp),
    ),
  ).toEqual([93, 93, 93]);
});
