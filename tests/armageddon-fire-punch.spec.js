import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/fire-punch.json" with { type: "json" };
import entryFixture from "./fixtures/armageddon/fire-punch-entry.json" with { type: "json" };
import tickFixture from "./fixtures/armageddon/fire-punch-tick.json" with { type: "json" };
import { advanceUntil } from "./helpers/misc-advance.js";
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
  await page.locator('[data-mode="local"]').click();
  await page.locator('#map-layout').selectOption('fern');
  await page.locator('#start').click();
  const targets=await page.evaluate(async ()=>{await window.siege.debug.resetSeed(42);return window.siege.debug.stageMeleeTargets();});
  await page.locator('#inventory-toggle').click();

  await page.locator('[data-weapon="firepunch"]').click();
  return targets;
}

test('live Fire Punch rises, hits an ally once, spends ammo and finishes the action',async({page})=>{
  const targets=await preparePunch(page);
  await expect(page.locator('#angle')).toBeDisabled();
  await page.locator('#fire').click();
  // Step the punch synchronously, sampling every logic tick, instead of waiting in real time.
  // Runs in the page each tick; `arg` names the phase to stop at.
  const sample=(s,arg)=>{
    const o=(window.punchObserved??={maxY:0,allyHealth:[100]}),w=s.worms[0],hp=s.worms[1].hp;
    o.maxY=Math.max(o.maxY,w.y);
    if(o.allyHealth.at(-1)!==hp)o.allyHealth.push(hp);
    return arg==='fired'?s.shotCount===1:s.preparing===null;
  };
  await advanceUntil(page,sample,{arg:'fired',label:'Fire Punch release'});
  await expect(page.locator('#fire')).toBeDisabled();
  await advanceUntil(page,sample,{arg:'finished',label:'Fire Punch finish'});
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
