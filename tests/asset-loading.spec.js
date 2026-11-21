// Loading-screen checks need a cold page and cache: no shared page here.
import { test, expect } from "@playwright/test";

test('slow loading shows only the loading screen until current art is ready',async({page})=>{
  let release;
  const gate=new Promise(resolve=>release=resolve);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/sprites/wblink1.spr',async route=>{await gate;await route.continue();});
  await page.goto('/');
  await expect(page.locator('#asset-loading')).toBeVisible();
  await expect(page.getByRole('progressbar',{name:'Game loading progress'})).toHaveAttribute('max','12');
  await expect.poll(()=>page.locator('#asset-progress').evaluate(bar=>bar.value)).toBeGreaterThan(0);
  expect(await page.locator('#asset-progress').evaluate(bar=>bar.value)).toBeLessThan(12);
  await expect(page.locator('#app')).toBeHidden();
  await expect(page.locator('body')).toHaveClass(/assets-loading/);
  expect(await page.evaluate(()=>window.siege?.getState().assetsReady)).toBe(false);
  release();
  await expect(page.locator('#asset-loading')).toHaveCount(0,{timeout:20000});
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#app')).toBeHidden();
  await page.locator('[data-mode="ai"]').click();
  await page.locator('#start').click();
  await expect(page.locator('#app')).toBeVisible();
  expect(await page.evaluate(()=>window.siege.getState().worms.every(w=>w.originalSprite))).toBe(true);
  expect(errors).toEqual([]);
});

test('failed assets do not enable play or reveal fallback graphics',async({page})=>{
  await page.route('**/sprites/wblink1.spr',route=>route.abort());
  await page.goto('/');
  // Under parallel load the aborted fetch can take a while to surface.
  await expect(page.locator('#asset-loading')).toHaveAttribute('role','alert',{timeout:15000});
  await expect(page.locator('#asset-loading')).toContainText('Reload to retry');
  await expect(page.locator('#app')).toBeHidden();
  expect(await page.evaluate(()=>window.siege.getState().assetsReady)).toBe(false);
});
