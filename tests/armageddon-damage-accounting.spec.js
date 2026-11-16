import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/damage-accounting.json" with { type: "json" };
import { nativeDamageAccounting } from "../src/armageddon/damage-accounting.js";
test("health, cumulative/displayed damage and events match original damage routine", () => {
  expect(fixture.cases).toHaveLength(288);
  for (const row of fixture.cases) {
    expect(
      nativeDamageAccounting(
        {
          hp: row.hp,
          total: 7,
          displayed: 9,
          reset: 12,
          resetActive: 1,
          team: 2,
          worm: 3,
          state: row.state,
        },
        row.damage,
        row,
      ),
    ).toEqual(row.result);
  }
});

test("live lethal hit labels count health actually lost", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  const result = await page.evaluate(() => {
    const before = window.siege
      .getState()
      .worms.slice(3)
      .map((w) => w.hp);
    window.siege.debug.hit(1, 200);
    return {
      before,
      hp: window.siege
        .getState()
        .worms.slice(3)
        .map((w) => w.hp),
      labels: [...document.querySelectorAll(".damage-number")].map(
        (el) => el.textContent,
      ),
    };
  });
  expect(result.hp).toEqual([0, 0, 0]);
  expect(result.labels).toEqual(result.before.map((hp) => `→−${hp}`));
});
