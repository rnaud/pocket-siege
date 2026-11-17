import soundSlots from "../src/armageddon/sound-slots.json" with { type: "json" };
import fs from "node:fs";
import { createHash } from "node:crypto";
import { nativeSoundVolume, nativeSoundPan, nativeSoundFrequency } from "../src/armageddon/sound-mix.js";
import replayCleanup from "./fixtures/armageddon/replay-audio-cleanup.json" with { type: "json" };
import queueFixture from "./fixtures/armageddon/sound-queue.json" with { type: "json" };
import { NativeSoundQueue, nativeReplaySoundCleanup, nativeSoundChannel, NativeSoundHandles, nativeWormSoundCleanup } from "../src/armageddon/sound-queue.js";
import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/launch-audio.json" with { type: "json" };
import { nativeLaunchAudio } from "../src/armageddon/launch-audio.js";

test("weapon release audio and casing choices match all original records", { tag: "@logic" }, () => {
  for (const c of replayCleanup.cases) {
    const channels = structuredClone(c.channels), calls = [];
    const index = buffer => c.channels.findIndex(row => row[5] === buffer);
    const result = nativeReplaySoundCleanup(channels, {
      query(buffer) { const i = index(buffer); calls.push(["query", i]); return { result:c.statuses[i][0], flags:c.statuses[i][1] }; },
      release(buffer) { calls.push(["release", index(buffer)]); },
    });
    expect({result,channels,calls}).toEqual({result:c.result,channels:c.after,calls:c.calls});
  }
  for (const c of queueFixture.cleanupCases)
    expect(nativeWormSoundCleanup(c.state, c.action, c.voice, handle => handle === 11 ? c.actionDone : c.voiceDone)).toEqual(c.result);
  let handles;
  for (const c of queueFixture.handleCases) {
    if (c.reset) handles = new NativeSoundHandles();
    const calls = [];
    const result = c.operation === "allocate" ? handles.allocate(c.value)
      : c.operation === "invalidate" ? (handles.invalidate(c.value), null)
      : handles.release(c.value, channel => calls.push(["stop", channel], ["release", channel]));
    expect(result).toBe(c.result);
    expect(calls).toEqual(c.calls);
    expect({ channels: handles.channels, free: handles.free, used: handles.used })
      .toEqual({ channels: c.channels, free: c.free, used: c.used });
  }
  expect(Object.keys(soundSlots.slots)).toHaveLength(123);
  for (const entry of Object.values(soundSlots.slots)) {
    const bytes = fs.readFileSync(`public/armageddon/sounds/${entry.clip}`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(entry.sha256);
  }
  for (const c of queueFixture.mixCases) {
    expect(c.calls).toEqual([
      ["position", 0], ["frequency", nativeSoundFrequency(c.frequency, c.pitch, c.speed)],
      ["volume", nativeSoundVolume(c.volume, c.master, c.flags)],
      ["pan", nativeSoundPan(c.pan)], ["play", 0, 0, Number(Boolean(c.flags & 0x10000))],
    ]);
    expect(c.updates).toEqual([["volume", nativeSoundVolume(c.volume, c.master, c.flags, false)]]);
  }
  for (const c of queueFixture.channelCases) {
    const channels = c.priorities.map(priority => priority === null ? null : { priority });
    expect(nativeSoundChannel(channels, c.incoming)).toBe(c.result);
    const replaced = c.result >= 0 && channels[c.result] !== null;
    expect(c.calls).toEqual(replaced ? [["stop", c.result], ["release", c.result]] : []);
    expect(c.occupied).toEqual(channels.map((channel, i) => Boolean(channel) && !(replaced && i === c.result)));
    expect(c.handles).toEqual(channels.map((_, i) => replaced && c.tracked && i === c.result ? 4294967295 : i));
  }
  for (const c of queueFixture.cases) {
    const queue = new NativeSoundQueue(), calls = [];
    expect(c.inputs.map(request => queue.enqueue(request))).toEqual(c.accepted);
    expect(queue.requests).toEqual(c.stored);
    queue.flush(c.present ? request => calls.push(request) : null, c.disabled);
    expect(calls).toEqual(c.calls);
    expect(queue.requests.length).toBe(c.remaining);
  }
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
    const { playNativeProjectileReleaseSound, playNativeQueuedSound } = await import("/src/armageddon/audio.js");
    const { NativeSoundQueue } = await import("/src/armageddon/sound-queue.js");
    const queue = new NativeSoundQueue();
    const context = new AudioContext();
    const createSource = context.createBufferSource.bind(context);
    window.releasePlayback = [];
    context.createBufferSource = () => {
      const node = createSource(), start = node.start.bind(node);
      node.start = () => { window.releasePlayback.push(node.buffer.duration); start(); };
      return node;
    };
    window.releaseIds = [];
    window.releaseStops = 0;
    const owner = { nativeActionPlayback: { stop() { window.releaseStops++; } } };
    for (const kind of ["rocket", "homing", "mortar", "grenade", "cluster", "holy"]) {
      const p = { kind, x: 200, y: 400, vx: 0, vy: 0, fuse: 3, bounce: 0.55 };
      attachNativeProjectile(p, 650);
      window.releaseIds.push(p.nativeRelease.calls.filter(e => e.operation === "sound").map(e => e.request[0]));
      playNativeProjectileReleaseSound(context, p.nativeRelease, request => queue.enqueue(request), owner);
    }
    window.releaseBeforeFlush = window.releasePlayback.length;
    window.releaseQueued = queue.requests.map(request => request[0]);
    queue.flush(request => playNativeQueuedSound(context, request));
  });
  expect(await page.evaluate(() => window.releaseStops)).toBe(1);
  expect(await page.evaluate(() => window.releaseBeforeFlush)).toBe(0);
  expect(await page.evaluate(() => window.releaseQueued)).toEqual([75, 75, 75, 73, 73, 73]);
  await expect.poll(() => page.evaluate(() => window.releasePlayback.length)).toBe(6);
  expect(await page.evaluate(() => window.releaseIds)).toEqual([[75], [75], [75], [73], [73], [73]]);
  expect(await page.evaluate(() => window.releasePlayback.every(duration => duration > 0))).toBe(true);
  expect(requested.sort()).toEqual(["rocketrelease.wav", "throwrelease.wav"]);
});
