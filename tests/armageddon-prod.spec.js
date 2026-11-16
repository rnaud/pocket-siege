import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/prod.json" with { type: "json" };
import { nativeProdRequest } from "../src/armageddon/prod.js";
import { nativeAreaDamage } from "../src/armageddon/area-damage.js";

test("Prod impulse and direct hit rectangle match original executable", () => {
  expect(fixture.cases).toHaveLength(140);
  for (const row of fixture.cases)
    expect(nativeProdRequest(row.record, row.x, row.y, row.facing)).toEqual(row.request);
});

test("Prod excludes self and blocked bodies, includes allies and obeys strict range", () => {
  const request = nativeProdRequest({ '0x70': 0, '0x74': 30, '0x78': 45 }, 100<<16, 100<<16, 1);
  const bodies = [
    { x:100<<16,y:100<<16,type:2,self:true },
    { x:110<<16,y:100<<16,type:2 },
    { x:118<<16,y:100<<16,type:2 },
    { x:110<<16,y:100<<16,type:2,blocked:true },
    { x:90<<16,y:100<<16,type:2 },
  ];
  const result = nativeAreaDamage(bodies, request);
  expect(result).toHaveLength(1);
  expect(result[0].body).toBe(1);
  expect(result[0].packet[5]).toBe(0);
  expect(result[0].packet[3]).toBeGreaterThan(0);
  expect(result[0].packet[4]).toBeLessThan(0);
});

for (const interrupt of [false, true])
test(`live Prod ${interrupt ? 'cancels on damage without spending' : 'waits for preparation and consumes one action'}`, async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('#mode').selectOption('local');
  await page.locator('#start').click();
  await page.evaluate(() => { window.siege.debug.resetSeed(42); window.siege.debug.setAmmo(0, 'prod', 2); });
  await page.locator('#inventory-toggle').click();
  await page.locator('#special-toggle').click();
  await page.locator('[data-weapon="prod"]').click();
  await page.evaluate(interrupt => {
    document.querySelector('#fire').addEventListener('pointerup', () => {
      const s = window.siege.getState();
      window.prodRelease = { weapon:s.preparing?.weapon, shots:s.shotCount, ammo:s.ammo[0].prod };
      if (interrupt) window.siege.debug.hit(0, 1);
    }, { once:true });
  }, interrupt);
  await page.locator('#fire').click();
  expect(await page.evaluate(() => window.prodRelease)).toEqual({ weapon:'prod', shots:0, ammo:2 });
  await expect.poll(() => page.evaluate(() => window.siege.getState().preparing)).toBeNull();
  await page.waitForTimeout(200);
  const s = await page.evaluate(() => window.siege.getState());
  expect(s.shotCount).toBe(interrupt ? 0 : 1);
  expect(s.ammo[0].prod).toBe(interrupt ? 2 : 1);
  expect(s.explosions).toBe(0);
});
