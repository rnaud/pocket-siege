import { test, expect } from '@playwright/test';
import ticks from './fixtures/armageddon/axe.json' with {type:'json'};
import receivers from './fixtures/armageddon/axe-receiver.json' with {type:'json'};
import {nativeAxeTick} from '../src/armageddon/axe.js';
import {nativeDirectHitResponse} from '../src/armageddon/direct-hit-response.js';
import {fastForward, advance} from './helpers/misc-fast-forward.js';

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
  await page.locator('[data-mode="local"]').click();
  await page.locator('#map-layout').selectOption('fern');
  await page.locator('#start').click();
  const targets = await page.evaluate(async () => { await window.siege.debug.resetSeed(42); return window.siege.debug.stageMeleeTargets(); });
  await page.locator('#inventory-toggle').click();

  await page.locator('[data-weapon="axe"]').click();
  return targets;
}

test('live Axe plays all three stages and halves eligible targets only once', async ({ page }) => {
  const sounds = new Set();
  page.on('response', r => { if (r.ok() && r.url().endsWith('.wav')) sounds.add(r.url().split('/').pop()); });
  const targets = await prepare(page);
  await page.locator('#sound').click();
  await expect(page.locator('#angle')).toBeDisabled();
  // Fast-forward the swing while still rendering, sampling every displayed pose.
  const running = fastForward(page, s => s.shotCount === 1 && !s.preparing,
    { sample: s => ({ sprite: s.worms[0].originalSprite, shots: s.shotCount,
      fireDisabled: document.querySelector('#fire').disabled }) });
  await page.locator('#fire').click();
  const run = await running;
  const axeFrames = [...new Set(run.samples.map(s => s.sprite))];
  expect(run.samples.some(s => s.shots === 1 && s.fireDisabled)).toBe(true);
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.ammo[0].axe).toBe(1);
  expect(state.worms[targets.ally].hp).toBe(50);
  expect(state.worms[targets.enemy].hp).toBe(50);
  expect(state.worms[targets.shooter].hp).toBe(100);
  expect(state.worms[targets.rear].hp).toBe(100);
  expect(axeFrames).toEqual(expect.arrayContaining(['waxelk2','waxeswn','waxebak']));
  await expect.poll(() => sounds.has('vikingaxerelease.wav') && sounds.has('vikingaxeimpact.wav')).toBe(true);
});

test('hurt interrupts Axe after ammo is spent and prevents later swing hits', async ({ page }) => {
  const targets = await prepare(page);
  await page.locator('#fire').click();
  await expect.poll(() => page.evaluate(() => window.siege.getState().shotCount)).toBe(1);
  await page.evaluate(() => window.siege.debug.hit(0,1));
  await fastForward(page, s => !s.preparing);
  // The swing's remaining hit windows would have passed within 60 ticks.
  await advance(page, 60);
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.ammo[0].axe).toBe(1);
  expect(state.worms[targets.enemy].hp).toBe(100);
  expect(state.shotCount).toBe(1);
});
