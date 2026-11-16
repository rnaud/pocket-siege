import { test, expect } from '@playwright/test';
import fixture from './fixtures/armageddon/bat.json' with {type:'json'};
import {nativeBatRequest} from '../src/armageddon/bat.js';
import {nativeAreaDamage} from '../src/armageddon/area-damage.js';

test('bat area request matches original executable for aim, facing and overflow', () => {
  expect(fixture.cases).toHaveLength(120);
  for (const r of fixture.cases)
    expect(nativeBatRequest(r.record,r.x,r.y,r.vx,r.vy,r.facing)).toEqual(r.request);
});

test('bat hits all eligible bodies ahead, excludes self and rear, emits impact per recipient', () => {
  const request = nativeBatRequest({'0x70':30,'0x74':125},100<<16,100<<16,46340,-46340,1);
  const bodies = [100,112,140,152,90].map((x,i) => ({x:x<<16,y:100<<16,type:2,self:i===0}));
  const calls = nativeAreaDamage(bodies,request);
  expect(calls.filter(c=>c.packet).map(c=>c.body)).toEqual([1,2]);
  expect(calls.filter(c=>c.sound)).toHaveLength(2);
  expect(calls.filter(c=>c.effect)).toHaveLength(2);
  for (const c of calls.filter(c=>c.packet)) {
    expect(c.packet[0]).toBe(6);
    expect(c.packet[5]).toBe(30);
    expect(c.packet[3]).toBe(579250);
    expect(c.packet[4]).toBe(-579250);
  }
});

test('live bat uses aimed native impulse, hits allies and enemies, and plays original impact art/audio', async ({ page }) => {
  const sounds = new Set();
  page.on('response', response => { if(response.ok() && response.url().endsWith('.wav')) sounds.add(response.url().split('/').pop()); });
  await page.goto('/');
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('#mode').selectOption('local');
  await page.locator('#start').click();
  const targets = await page.evaluate(() => { window.siege.debug.resetSeed(42); return window.siege.debug.stageMeleeTargets(); });
  await page.locator('#sound').click();
  await page.locator('#inventory-toggle').click();
  await page.locator('#special-toggle').click();
  await page.locator('[data-weapon="bat"]').click();
  await page.locator('#angle').fill('45');
  await page.locator('#angle').dispatchEvent('input');
  await page.evaluate(() => {
    window.batHits = null;
    const sample = () => {
      const s = window.siege.getState();
      if(s.shotCount) window.batHits = {worms:s.worms, particles:s.nativeParticles};
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.locator('#fire').click();
  await expect.poll(() => page.evaluate(() => window.batHits)).not.toBeNull();
  const hit = await page.evaluate(() => window.batHits);
  for(const index of [targets.ally, targets.enemy]) {
    expect(hit.worms[index].hp, JSON.stringify({targets, worms:hit.worms.map(w=>({hp:w.hp,x:w.x,y:w.y,vx:w.vx,vy:w.vy,knocked:w.knocked})),particles:hit.particles})).toBe(70);
    expect(hit.worms[index].vx).toBeGreaterThan(0);
    expect(hit.worms[index].vy).toBeGreaterThan(0);
  }
  expect(hit.worms[targets.shooter].hp).toBe(100);
  expect(hit.worms[targets.rear].hp).toBe(100);
  expect(hit.particles.filter(p=>p.sprite==='basehit')).toHaveLength(2);
  expect(await page.evaluate(() => window.siege.getState().ammo[0].bat)).toBe(2);
  await expect.poll(() => sounds.has('baseballbatrelease.wav')).toBe(true);
  await expect.poll(() => sounds.has('baseballbatimpact.wav')).toBe(true);
});
