import { test, expect } from "./helpers/shared-page.js";
import fs from "node:fs";
import {
  advanceNativeDelays,
  createWeaponDelays,
} from "../src/armageddon/delays.js";
import { ammoFor } from "../src/weapons.js";
import { readSettings } from "../src/settings.js";
import { planTurn } from "../src/ai.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/delays.json", import.meta.url),
  ),
);

test("countdown matches original x86 across banks, bypass and overflow", { tag: "@logic" }, () => {
  expect(fixture.vectors).toHaveLength(16);
  for (const v of fixture.vectors) {
    expect(
      advanceNativeDelays(v.previous_turns, v.initial, v.bypass),
      JSON.stringify({
        turns: v.previous_turns,
        bypass: v.bypass,
        bank: v.bank,
      }),
    ).toEqual({ turns: v.turns, delays: v.delays, unlocked: v.unlocked });
  }
  const delayed = createWeaponDelays({ rocket: 1, shotgun: -1 });
  expect(ammoFor({}, "rocket", delayed)).toBe(0);
  expect(ammoFor({ shotgun: -1 }, "shotgun", delayed)).toBe(0);
});

test("saved delays validate values and weapon identities", { tag: "@logic" }, () => {
  const saved = readSettings({
    getItem: () =>
      JSON.stringify({
        weaponDelays: {
          rocket: 1,
          shotgun: -1,
          grenade: 2.5,
          mortar: 99,
          holy: "2",
          unknown: 3,
        },
      }),
  });
  expect(saved.weaponDelays).toEqual({ rocket: 1, shotgun: -1 });
});

test("AI cannot select delayed weapons even with unlimited stock", { tag: "@logic" }, () => {
  const me = { team: 1, hp: 100 };
  expect(
    planTurn({
      me,
      worms: [me, { team: 0, hp: 100 }],
      ammo: { grenade: -1, mortar: -1, sticky: 0 },
      delays: createWeaponDelays({ rocket: 1, grenade: 1, mortar: 1 }),
    }),
  ).toBeNull();
});

test("delay survives worm selection and unlocks on the next own turn", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator(".weapon-delay-options summary").click();
  await page.locator("#delay-weapon").selectOption("rocket");
  await page.locator("#weapon-delay").selectOption("1");
  // The choice is saved for later sessions (readSettings is covered above)
  // and applies to the next match without a reload.
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-settings-v1")).weaponDelays.rocket)).toBe(1);
  await page.locator("#start").click();
  // Isolate turn-delay progression from the randomly placed supply drop.
  await page.evaluate(() => {
    window.siege.debug.setCrateKind("grenade");
    window.siege.debug.collectCrate();
  });
  await page.locator("#inventory-toggle").click();
  const rocket = page.locator('[data-weapon="rocket"]');
  await expect(rocket).toBeDisabled();
  await expect(rocket.locator("small")).toHaveText("WAIT 1");
  await page.locator("#inventory-toggle").click();
  await page.locator("#select-worm").click();
  expect(
    await page.evaluate(() => window.siege.getState().weaponDelays[0].turns),
  ).toBe(1);
  // Skipped turns still settle and announce; advance them in simulation frames.
  const waitForTeam = (target) => page.evaluate((target) => {
    for (let frames = 0; frames < 6000; frames += 25) {
      if (window.siege.getState().team === target) return target;
      window.siege.debug.advanceReplayFrames(25);
    }
    return window.siege.getState().team;
  }, target);
  await page.locator("#skip").click();
  expect(await waitForTeam(1)).toBe(1);
  await page.locator("#skip").click();
  expect(await waitForTeam(0)).toBe(0);
  await page.locator("#inventory-toggle").click();
  await expect(rocket).toBeEnabled();
  await page.screenshot({
    path: test.info().outputPath("unlocked-arsenal.png"),
  });
  await expect(rocket.locator("small")).toHaveText("∞");
  expect(
    await page.evaluate(() => window.siege.getState().weaponDelays[0].turns),
  ).toBe(2);
});
