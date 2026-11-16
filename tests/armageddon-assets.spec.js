import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { decodeSprite, spriteFrameRGBA } from '../src/armageddon/sprite.js';

test('every original animation decodes with valid palette indices and opaque pixels', { tag: "@logic" }, () => {
  const root = new URL('../public/armageddon/', import.meta.url);
  const names = JSON.parse(fs.readFileSync(new URL('sprites.json',root)));
  expect(names).toHaveLength(770);
  let frames = 0;
  for (const name of names) {
    const sprite = decodeSprite(fs.readFileSync(new URL(`sprites/${name}.spr`,root)));
    expect(sprite.frames.length, name).toBeGreaterThan(0);
    for (const frame of sprite.frames) {
      for (const color of frame.pixels) {
        if (color >= sprite.palette.length / 4) throw new Error(`${name}: palette index ${color}`);
      }
    }
    const rgba = spriteFrameRGBA(sprite,0);
    expect(rgba.length).toBe(sprite.width * sprite.height * 4);
    frames += sprite.frames.length;
  }
  expect(frames).toBeGreaterThan(14000);
});

test('asset library plays and scrubs original animation and loads sound banks', async ({page}) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/armageddon.html');
  await expect(page.locator('#details')).toContainText('wbrth1');
  await page.locator('#pause').click();
  await page.locator('#sprite').selectOption('wwalk');
  await expect(page.locator('#details')).toContainText('wwalk');
  await page.locator('#frame').fill('8');
  await expect(page.locator('#details')).toContainText('FRAME 9 / 15');
  await page.locator('#bank').selectOption('english');
  await page.locator('#sound').selectOption('jump1.wav');
  await expect.poll(() => page.locator('#audio').evaluate(a => Number.isFinite(a.duration) && a.duration > 0)).toBe(true);
  expect(errors).toEqual([]);
});

test('game loads original worm animation without asset errors', async ({page}) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.siege?.getState().assetsReady)).toBe(true);
  expect(await page.evaluate(() => window.siege.getState().originalArtError)).toBeNull();
  await page.locator('#mode').selectOption('local');
  await page.locator('#start').click();
  await page.screenshot({path:'test-results/armageddon-game.png'});
});
