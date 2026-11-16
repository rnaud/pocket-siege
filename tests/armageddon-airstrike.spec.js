import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/airstrike.json" with { type: "json" };
import { nativeAirstrikeInitial, nativeAirstrikeTick } from "../src/armageddon/airstrike.js";

test("airstrike approach and missile payloads match the original aircraft task", () => {
  expect(fixture.initial).toHaveLength(16);
  expect(fixture.cases).toHaveLength(1920);
  for (const c of fixture.initial)
    expect(nativeAirstrikeInitial(c.body,c.gravity)).toMatchObject({x:c.x,y:c.y,threshold:c.threshold});
  for (const [i,c] of fixture.cases.entries()) {
    const payload=[123,2,0,0,0,0,c.config.targetX,c.config.targetY,0,55,3000];
    expect(nativeAirstrikeTick(c.before,c.config,payload), `case ${i}`).toEqual({body:c.after,calls:c.calls});
  }
});


import { createNativeAirstrike, stepNativeAirstrike } from "../src/armageddon/projectile-runtime.js";
test("live airstrike adapter releases five original missile bodies on consecutive ticks", () => {
  for (const direction of [-1,1]) {
    const strike=createNativeAirstrike(600,300,direction,0,650);
    expect(strike.sprite).toBe(673);
    expect(strike.sound).toBe(52);
    const missiles=[], ticks=[];
    let removed=false;
    for(let tick=0;tick<200 && !removed;tick++) {
      const result=stepNativeAirstrike(strike,650);
      missiles.push(...result.missiles);
      if(result.missiles.length) ticks.push(tick);
      removed=result.removed;
    }
    expect(removed).toBe(true);
    expect(missiles).toHaveLength(5);
    expect(ticks.slice(1)).toEqual(ticks.slice(0,-1).map(t=>t+1));
    for(const p of missiles) {
      expect(p.nativeBody.sprite).toBe(649);
      expect(p.nativeTimer.remaining).toBe(9000);
      expect(p.vx).toBe(direction*200);
      expect(p.vy).toBeCloseTo(0);
      expect(p.nativeDetonation).toMatchObject({damage:30,push:115,offset:50});
    }
  }
});

test("live aircraft releases original missiles and resolves its strike", async({page})=>{
  await page.goto("/");
  await page.waitForFunction(()=>window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(()=>window.siege.debug.resetSeed(42));
  await page.locator("#inventory-toggle").click();
  await page.locator("#special-toggle").click();
  await page.locator('[data-weapon="airstrike"]').click();
  await page.locator("#fire").click();
  const box=await page.locator("#arena").boundingBox();
  await page.mouse.click(box.x+box.width*.5,box.y+box.height*.55);
  const strike=await page.evaluate(()=>window.siege.getState().airstrikes[0]);
  expect(strike.sprite).toBe("airjetg");
  await expect.poll(()=>page.evaluate(()=>window.siege.getState().bombs.length)).toBe(5);
  const missiles=await page.evaluate(()=>window.siege.getState().bombs);
  expect(missiles.every(b=>b.sprite==="airmisl" && b.nativeDamage===30)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.siege.getState().bombs.length),{timeout:15000}).toBe(0);
  expect(await page.evaluate(()=>window.siege.getState().explosions)).toBeGreaterThan(0);
  await expect.poll(()=>page.evaluate(()=>window.siege.getState().airstrikes.length)).toBe(0);
});
