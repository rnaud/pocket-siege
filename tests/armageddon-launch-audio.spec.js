import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/launch-audio.json" with { type: "json" };
import { nativeLaunchAudio } from "../src/armageddon/launch-audio.js";

test("weapon release audio and casing choices match all original records", () => {
  expect(fixture.cases).toHaveLength(1278);
  for (const [i,c] of fixture.cases.entries())
    expect(nativeLaunchAudio(c.fields,c.body,(_,slot) => 1000+slot), `case ${i}`).toEqual({ calls:c.calls,casing:c.casing });
});


test("browser decodes native projectile release samples without an early holy chant", async ({ page }) => {
  const requested = [];
  page.on("request", request => {
    if (/\/(throwrelease|rocketrelease|holygrenade)\.wav$/.test(request.url()))
      requested.push(request.url().split("/").pop());
  });
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => window.siege?.getState().assetsReady)).toBe(true);
  await page.evaluate(async () => {
    const { attachNativeProjectile } = await import("/src/armageddon/projectile-runtime.js");
    const { playNativeProjectileReleaseSound } = await import("/src/armageddon/audio.js");
    const context = new AudioContext();
    const createSource = context.createBufferSource.bind(context);
    window.releasePlayback = [];
    context.createBufferSource = () => {
      const node = createSource(), start = node.start.bind(node);
      node.start = () => { window.releasePlayback.push(node.buffer.duration); start(); };
      return node;
    };
    window.releaseIds = [];
    for (const kind of ["rocket", "homing", "mortar", "grenade", "cluster", "holy"]) {
      const p = { kind, x: 200, y: 400, vx: 0, vy: 0, fuse: 3, bounce: 0.55 };
      attachNativeProjectile(p, 650);
      window.releaseIds.push(p.nativeRelease.calls.filter(e => e.operation === "sound").map(e => e.request[0]));
      playNativeProjectileReleaseSound(context, p.nativeRelease);
    }
  });
  await expect.poll(() => page.evaluate(() => window.releasePlayback.length)).toBe(6);
  expect(await page.evaluate(() => window.releaseIds)).toEqual([[75], [75], [75], [73], [73], [73]]);
  expect(await page.evaluate(() => window.releasePlayback.every(duration => duration > 0))).toBe(true);
  expect(requested.sort()).toEqual(["rocketrelease.wav", "throwrelease.wav"]);
});
