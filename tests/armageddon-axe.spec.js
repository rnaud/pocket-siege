import { test, expect } from '@playwright/test';
import ticks from './fixtures/armageddon/axe.json' with {type:'json'};
import receivers from './fixtures/armageddon/axe-receiver.json' with {type:'json'};
import {nativeAxeTick} from '../src/armageddon/axe.js';
import {nativeDirectHitResponse} from '../src/armageddon/direct-hit-response.js';

test('Axe animation thresholds, queues and hit windows match original executable', { tag: "@logic" }, () => {
  expect(ticks.cases).toHaveLength(288);
  for (const r of ticks.cases) expect(nativeAxeTick(r.body)).toEqual(r.calls);
});
test('Axe percentage damage matches original receiver including 1HP and immunity', { tag: "@logic" }, () => {
  expect(receivers.cases).toHaveLength(1120);
  for (const r of receivers.cases) expect(nativeDirectHitResponse({
    state:r.state,fieldB0:r.flag,seen:r.seen,vx:-30000,vy:500000,x:100000,y:200000,
    accumulated:7,kind6:0,delay:9,kind1:0,hits:2,health:r.hp,
  },[10,300000,400000,1234,5678,r.damage],13)).toEqual({result:r.result,output:r.output});
});

async function prepare(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('#mode').selectOption('local');
  await page.locator('#start').click();
  const targets = await page.evaluate(() => { window.siege.debug.resetSeed(42); return window.siege.debug.stageMeleeTargets(); });
  await page.locator('#inventory-toggle').click();
  await page.locator('#special-toggle').click();
  await page.locator('[data-weapon="axe"]').click();
  return targets;
}

test('live Axe plays all three stages and halves eligible targets only once', async ({ page }) => {
  const sounds = new Set();
  page.on('response', r => { if (r.ok() && r.url().endsWith('.wav')) sounds.add(r.url().split('/').pop()); });
  const targets = await prepare(page);
  await page.locator('#sound').click();
  await expect(page.locator('#angle')).toBeDisabled();
  await page.evaluate(() => {
    window.axeFrames = [];
    const sample = () => {
      const s = window.siege.getState();
      const sprite = s.worms[0].originalSprite;
      if (!window.axeFrames.includes(sprite)) window.axeFrames.push(sprite);
      if (!s.shotCount || s.preparing) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.locator('#fire').click();
  await expect.poll(() => page.evaluate(() => window.siege.getState().shotCount)).toBe(1);
  await expect(page.locator('#fire')).toBeDisabled();
  await expect.poll(() => page.evaluate(() => window.siege.getState().preparing)).toBeNull();
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.ammo[0].axe).toBe(1);
  expect(state.worms[targets.ally].hp).toBe(50);
  expect(state.worms[targets.enemy].hp).toBe(50);
  expect(state.worms[targets.shooter].hp).toBe(100);
  expect(state.worms[targets.rear].hp).toBe(100);
  expect(await page.evaluate(() => window.axeFrames)).toEqual(expect.arrayContaining(['waxelk2','waxeswn','waxebak']));
  await expect.poll(() => sounds.has('vikingaxerelease.wav') && sounds.has('vikingaxeimpact.wav')).toBe(true);
});

test('hurt interrupts Axe after ammo is spent and prevents later swing hits', async ({ page }) => {
  const targets = await prepare(page);
  await page.locator('#fire').click();
  await expect.poll(() => page.evaluate(() => window.siege.getState().shotCount)).toBe(1);
  await page.evaluate(() => window.siege.debug.hit(0,1));
  await expect.poll(() => page.evaluate(() => window.siege.getState().preparing)).toBeNull();
  await page.waitForTimeout(1200);
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.ammo[0].axe).toBe(1);
  expect(state.worms[targets.enemy].hp).toBe(100);
  expect(state.shotCount).toBe(1);
});
