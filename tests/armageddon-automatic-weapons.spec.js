import { test, expect } from "@playwright/test";
import { nativeHitscanWeapon } from "../src/armageddon/hitscan-art.js";
import { advanceUntil } from "./helpers/scenario-page.js";

// Bursts fire one bullet per frame and their looping sound starts
// asynchronously, so bursts run in real frames (waitForFunction checks every
// frame instead of expect.poll's back-off); turn changes and idle checks
// advance logic frames.

async function start(page, kind) {
  await page.addInitScript(() => {
    window.weaponLoops = [];
    const proto = (window.AudioContext || window.webkitAudioContext).prototype;
    const create = proto.createBufferSource;
    proto.createBufferSource = function () {
      const node = create.call(this), start = node.start.bind(node), stop = node.stop.bind(node);
      const state = { stopped: false };
      node.start = (...args) => { if (node.loop) window.weaponLoops.push(state); return start(...args); };
      node.stop = (...args) => { state.stopped = true; return stop(...args); };
      return node;
    };
  });
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await page.evaluate(async kind => { await window.siege.debug.resetSeed(42); window.siege.debug.setAmmo(0, kind, 1); }, kind);
  await page.locator("#sound").click();
  await page.locator("#inventory-toggle").click();

  await page.locator(`[data-weapon="${kind}"]`).click();
  await page.locator("#angle").fill("90");
  await page.locator("#angle").dispatchEvent("input");
}

for (const [kind, total, spread, mode] of [["uzi", 10, 15, 5], ["minigun", 20, 25, 3]]) {
  test(`${kind} uses original burst and bullet fields`, { tag: "@logic" }, () => {
    expect(nativeHitscanWeapon(kind)).toMatchObject({
      total, interval: 0, record: { "0x7c": spread },
      resolution: { mode, damage: 5, push: 100, variance: 0 },
    });
  });
  test(`${kind} completes one burst and stops its firing loop`, async ({ page }) => {
    await start(page, kind);
    await page.locator("#fire").click();
    await expect(page.locator("#fire")).toBeDisabled();
    await page.waitForFunction((total) => {
      const state = window.siege.getState();
      return state.shotCount === total && state.preparing === null;
    }, total);
    expect(await page.evaluate(kind => window.siege.getState().ammo[0][kind], kind)).toBe(0);
    expect(await page.evaluate(() => window.weaponLoops)).toEqual([{ stopped: true }]);
  });
  test(`${kind} cancels remaining bullets and loop after damage`, async ({ page }) => {
    await start(page, kind);
    // Cancellation/turn progression is independent of the initial supply drop.
    await page.evaluate(() => {
      window.siege.debug.setCrateKind("grenade");
      window.siege.debug.collectCrate();
    });
    await page.evaluate(() => {
      const interrupt = () => {
        if (window.siege.getState().shotCount >= 1) { window.siege.debug.hit(0, 1); window.interrupted = true; }
        else requestAnimationFrame(interrupt);
      };
      requestAnimationFrame(interrupt);
    });
    await page.locator("#fire").click();
    await page.waitForFunction(() => window.interrupted);
    await advanceUntil(page, (s) => s.team === 1, { step: 5, label: "next team" });
    // 400 ms more of play fires nothing.
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(20));
    expect(await page.evaluate(() => window.siege.getState().shotCount)).toBe(1);
    expect(await page.evaluate(kind => window.siege.getState().ammo[0][kind], kind)).toBe(0);
    expect(await page.evaluate(() => window.weaponLoops.every(loop => loop.stopped))).toBe(true);
  });
}

test("pausing an automatic burst stops audio and resumes remaining bullets", async ({ page }) => {
  await start(page, "uzi");
  await page.evaluate(() => {
    const pauseDuringBurst = () => {
      if (window.siege.getState().shotCount >= 1 && window.weaponLoops.length)
        document.querySelector('#help').click();
      else requestAnimationFrame(pauseDuringBurst);
    };
    requestAnimationFrame(pauseDuringBurst);
  });
  await page.locator("#fire").click();
  await page.waitForFunction(() => window.weaponLoops.length === 1);
  await expect(page.locator("#menu")).toBeVisible();
  const paused = await page.evaluate(() => window.siege.getState().shotCount);
  expect(paused).toBeLessThan(10);
  // 400 ms of frames while the menu is open fire nothing.
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(20));
  expect(await page.evaluate(() => window.siege.getState().shotCount)).toBe(paused);
  expect(await page.evaluate(() => window.weaponLoops)).toEqual([{ stopped: true }]);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => {
    const state = window.siege.getState();
    return state.shotCount === 10 && state.preparing === null;
  });
  expect(await page.evaluate(() => window.weaponLoops)).toEqual([{ stopped: true }, { stopped: true }]);
});

test("bullet knockback follows original burst ordinal rather than full strength", { tag: "@logic" }, () => {
  for (const [kind, total] of [["handgun", 6], ["uzi", 10], ["minigun", 20], ["shotgun", 1]]) {
    expect(nativeHitscanWeapon(kind).resolution).toMatchObject({ impulseNumerator: 1, impulseDenominator: total });
    for (let ordinal = 1; ordinal <= total; ordinal++) {
      expect(nativeHitscanWeapon(kind, { ordinal, total }).resolution).toMatchObject({ impulseNumerator: ordinal, impulseDenominator: total });
    }
  }
});
