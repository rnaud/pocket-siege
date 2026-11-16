import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/fire-punch.json" with { type: "json" };
import entryFixture from "./fixtures/armageddon/fire-punch-entry.json" with { type: "json" };
import tickFixture from "./fixtures/armageddon/fire-punch-tick.json" with { type: "json" };
import { nativeFirePunchRequest, nativeFirePunchEntry, nativeFirePunchTick } from "../src/armageddon/fire-punch.js";

test("Fire Punch tick matches original transitions, particles, hits and random consumption", { tag: "@logic" }, () => {
  expect(tickFixture.cases).toHaveLength(240);
  for (const row of tickFixture.cases) {
    let draw = 0;
    expect(nativeFirePunchTick(row.body, row.record, () => row.random[draw++])).toEqual(row.calls);
    expect(draw).toBe(row.randomCount);
  }
});

test("Fire Punch launch and terrain clearance match the original executable", { tag: "@logic" }, () => {
  expect(entryFixture.cases).toHaveLength(24);
  for (const row of entryFixture.cases)
    expect(nativeFirePunchEntry(row.power, row.x, row.y)).toEqual(row.calls);
});

test("Fire Punch attack rectangle and impulse match the original executable", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(140);
  for (const row of fixture.cases)
    expect(nativeFirePunchRequest(row.record, row.x, row.y, row.facing)).toEqual(row.request);
});

async function preparePunch(page) {
  await page.goto('/');
  await page.waitForFunction(()=>window.siege?.getState().assetsReady);
  await page.locator('#mode').selectOption('local');
  await page.locator('#start').click();
  const targets=await page.evaluate(()=>{window.siege.debug.resetSeed(42);return window.siege.debug.stageMeleeTargets();});
  await page.locator('#inventory-toggle').click();

  await page.locator('[data-weapon="firepunch"]').click();
  return targets;
}

test('live Fire Punch rises, hits an ally once, spends ammo and finishes the action',async({page})=>{
  const targets=await preparePunch(page);
  await expect(page.locator('#angle')).toBeDisabled();
  await page.evaluate(()=>{
    window.punchObserved={maxY:0,allyHealth:[]};
    function sample(){
      const s=window.siege.getState(),w=s.worms[0];
      window.punchObserved.maxY=Math.max(window.punchObserved.maxY,w.y);
      const hp=s.worms[1].hp; if(window.punchObserved.allyHealth.at(-1)!==hp)window.punchObserved.allyHealth.push(hp);
      if(!s.shotCount||s.preparing)requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await page.locator('#fire').click();
  await expect.poll(()=>page.evaluate(()=>window.siege.getState().shotCount)).toBe(1);
  await expect(page.locator('#fire')).toBeDisabled();
  await expect.poll(()=>page.evaluate(()=>window.siege.getState().preparing),{timeout:15000}).toBeNull();
  const s=await page.evaluate(()=>window.siege.getState());
  expect(s.ammo[0].firepunch).toBe(2);
  expect(s.worms[targets.ally].hp).toBeLessThanOrEqual(70);
  expect(s.worms[targets.enemy].hp).toBe(100);
  expect(s.worms[targets.shooter].hp).toBe(100);
  expect(s.worms[targets.rear].hp).toBe(100);
  const seen=await page.evaluate(()=>window.punchObserved);
  expect(seen.allyHealth.slice(0,2)).toEqual([100,70]);
  expect(seen.maxY).toBeGreaterThan(280);
});
