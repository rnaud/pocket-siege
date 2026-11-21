import { test, expect } from "./helpers/shared-page.js";
import fs from "node:fs";
import {
  nativePreparation,
  nativePreparationTick,
} from "../src/armageddon/preparation.js";
import { fastForward, advance } from "./helpers/misc-fast-forward.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/preparation.json", import.meta.url),
  ),
);
test("preparation queues and release timing match original x86", { tag: "@logic" }, () => {
  expect(fixture.vectors).toHaveLength(480);
  expect(fixture.ticks).toHaveLength(3195);
  expect(fixture.reload_sound).toEqual({
    descriptor: "0055F2F0",
    id: 0x51,
    filename: "ShotgunReload.wav",
  });
  for (const v of fixture.vectors)
    expect(
      nativePreparation(v.fields, v.previous_sprite, v.progress, {
        random: v.random,
        voice: (slot) => 1000 + slot,
        control: 7,
      }),
      JSON.stringify(v),
    ).toEqual(v.result);
  for (const v of fixture.ticks)
    expect(
      nativePreparationTick(v.fields, {
        sprite: v.sprite,
        progress: v.progress,
        delay: v.delay,
        cue: 1,
        control: 7,
        burst: 0,
      }),
      JSON.stringify(v),
    ).toEqual(v.result);
});

test("shotgun preparation releases once after 46 simulation ticks", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const art = await import("/src/armageddon/art.js");
    await art.loadOriginalArt();
    const w = { hp: 100, frozen: 0 };
    art.startOriginalPreparation(w, "shotgun", 45);
    const trace = [];
    for (let tick = 1; tick <= 46; tick++) {
      const result = art.stepOriginalPreparation(w);
      trace.push({
        tick,
        released: result.released,
        sounds: result.sounds,
        sprite: w.originalPlayer.current.id,
        delay: result.delay,
      });
    }
    return trace;
  });
  expect(result.filter((t) => t.released).map((t) => t.tick)).toEqual([46]);
  expect(
    result.filter((t) => t.sounds.includes(0x51)).map((t) => t.tick),
  ).toEqual([1]);
  expect(result[0].sprite).toBe(0x1fd);
  expect(result[21].sprite).toBe(0x1fa);
});

async function prepareShotgun(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  // Custom keeps the host kit; Classic duel starts with the original default kit.
  await page.selectOption("#scheme", "custom");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#inventory-toggle").click();

  await page.locator('[data-weapon="shotgun"]').click();
  // Keep the first shot clear of terrain so self-damage cannot end the turn
  // before this test deliberately interrupts the second preparation.
  await page.locator("#angle").fill("90");
}

test("live shotgun waits to spend ammo and release damage; interruption cancels it", async ({
  page,
}) => {
  const audio = new Set();
  page.on("response", (response) => {
    if (response.ok() && response.url().endsWith(".wav"))
      audio.add(response.url().split("/").pop());
  });
  await prepareShotgun(page);
  await page.locator("#sound").click();
  await page.locator("#fire").click();
  const before = await page.evaluate(() => {
    const s = window.siege.getState();
    return {
      preparing: s.preparing?.weapon,
      shots: s.shotCount,
      ammo: s.ammo[0].shotgun,
    };
  });
  expect(before).toEqual({ preparing: "shotgun", shots: 0, ammo: 3 });
  await expect(page.locator("#fire")).toBeDisabled();
  await page.locator("#help").click();
  const paused = await page.evaluate(() => window.siege.getState().preparing);
  // Stepping 10 logic ticks while help is open must not progress preparation.
  await advance(page, 10);
  expect(await page.evaluate(() => window.siege.getState().preparing)).toEqual(
    paused,
  );
  await page.locator(".close-help").click();
  await fastForward(page, (s) => s.shotCount === 1);
  expect(
    await page.evaluate(() => window.siege.getState().ammo[0].shotgun),
  ).toBe(2);
  await expect.poll(() => audio.has("shotgunreload.wav")).toBe(true);
  await expect(page.locator("#fire")).toBeEnabled();
  expect(await page.evaluate(() => window.siege.getState().team)).toBe(0);
  expect(await page.evaluate(() => window.siege.getState().shotgunRemaining)).toBe(1);
  // Start and interrupt in one browser task, before a slow CI round trip can
  // let the 46-tick preparation finish.
  await page.evaluate(() => {
    document.querySelector("#fire").addEventListener("pointerup", () => {
      const state = window.siege.getState();
      window.interruptedPreparation = {
        preparing: state.preparing?.weapon, shots: state.shotCount,
      };
      window.siege.debug.hit(state.team, 1);
    }, { once: true });
  });
  await page.locator("#fire").click();
  const interrupted = await page.evaluate(() => window.interruptedPreparation);
  expect(interrupted).toEqual({ preparing: "shotgun", shots: 1 });
  await fastForward(page, (s) => !s.preparing);
  // The cancelled 46-tick preparation would have released within 50 ticks.
  await advance(page, 50);
  expect(await page.evaluate(() => window.siege.getState().shotCount)).toBe(1);
  expect(
    await page.evaluate(() => window.siege.getState().shotgunRemaining),
  ).toBe(0);
  expect(
    await page.evaluate(() => window.siege.getState().ammo[0].shotgun),
  ).toBe(2);
});
