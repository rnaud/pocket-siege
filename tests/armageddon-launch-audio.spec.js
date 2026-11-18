import impactSoundFixture from "./fixtures/armageddon/body-impact-sound.json" with { type: "json" };
import { nativeBodyContactMemory } from "../src/armageddon/body-response-memory.js";
import {readFileSync} from 'node:fs';
import bankData from '../src/armageddon/speech-bank-data.json' with {type:'json'};
import {originalSpeechClip,resolveOriginalSpeechBank} from '../src/armageddon/speech-resources.js';
import bodySoundFixture from "./fixtures/armageddon/body-sound.json" with { type: "json" };
import { nativeBodyStartSound, nativeBodySoundFinished, nativeBodyStopSound } from "../src/armageddon/body-sound.js";
import soundSlots from "../src/armageddon/sound-slots.json" with { type: "json" };
import fs from "node:fs";
import { createHash } from "node:crypto";
import { nativeSoundVolume, nativeSoundPan, nativeSoundFrequency } from "../src/armageddon/sound-mix.js";
import completionFixture from "./fixtures/armageddon/sound-completion.json" with { type: "json" };
import replayCleanup from "./fixtures/armageddon/replay-audio-cleanup.json" with { type: "json" };
import queueFixture from "./fixtures/armageddon/sound-queue.json" with { type: "json" };
import { NativeSoundQueue, nativeReplaySoundCleanup, nativeSoundChannel, NativeSoundHandles, nativeWormSoundCleanup } from "../src/armageddon/sound-queue.js";
import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/launch-audio.json" with { type: "json" };
import { nativeLaunchAudio } from "../src/armageddon/launch-audio.js";

test("weapon release audio and casing choices match all original records", { tag: "@logic" }, () => {
  const catalog=JSON.parse(readFileSync(new URL('../public/armageddon/voices.json',import.meta.url)));
  const slots=JSON.parse(readFileSync(new URL('../src/armageddon/speech-slots.json',import.meta.url))).slots;
  expect(bankData.banks).toEqual(Object.fromEntries(Object.entries(catalog).map(([bank,clips])=>[bank,Object.entries(slots).filter(([,entry])=>clips.includes(entry.clip)).map(([id])=>Number(id))])));
  expect(resolveOriginalSpeechBank('Danish-Pyrus')).toBe('danish~1');
  expect(resolveOriginalSpeechBank('Missing bank','Portuguese')).toBe('portug~1');
  expect(resolveOriginalSpeechBank('Missing bank','Missing fallback')).toBeNull();
  expect(originalSpeechClip(1,'Australian')).toBe('voices/austra~1/amazing.wav');
  expect(originalSpeechClip(999,'English')).toBeNull();
  for (const c of impactSoundFixture.cases) {
    const owner = 0x2000000, context = 0x2300000;
    const actorBytes = Buffer.alloc(0x10000), sceneBytes = Buffer.alloc(0x40000);
    const region = address => address >= context ? [sceneBytes, address-context] : [actorBytes, address-owner];
    const memory = {
      get(address) { const [bytes, offset] = region(address); return bytes.readUInt32LE(offset); },
      put(address, value) { const [bytes, offset] = region(address); bytes.writeUInt32LE(value >>> 0, offset); },
    };
    for (const [address, value] of c.words) memory.put(address, value);
    const state = () => createHash("sha256").update(actorBytes).update(sceneBytes).digest("hex");
    const calls = [];
    const invoke = (name, receiver, values) => {
      calls.push([name, receiver, values, state()]);
      if (name === "stop" && c.mutation) {
        memory.put(owner+0x38, context+0x20000); memory.put(owner+0xf4, 77);
      }
      if (name === "start") { memory.put(owner+0xf4, 88); memory.put(owner+0x9c, 54321); }
      if (name === "respond") memory.put(owner+0xa0, 98765);
      return name === "accept" ? c.accepted : name === "start" ? -9 : 1;
    };
    nativeBodyContactMemory(memory, owner, owner+0x4000, c.side, {
      startSound: (receiver, ...values) => invoke("start", receiver, values),
      stopSound: (receiver, ...values) => invoke("stop", receiver, values),
      acceptContact: (receiver, ...values) => invoke("accept", receiver, values),
      respondContact: (receiver, ...values) => invoke("respond", receiver, values),
    });
    expect({ calls, sha256: state() }).toEqual({ calls: c.calls, sha256: c.sha256 });
  }
  for (const c of bodySoundFixture.cases) {
    const calls = [];
    const backend = c.present ? Object.fromEntries(["start","finished","stop"].map(name => [name, (...args) => { calls.push([name,args]); return c.backendResult; }])) : null;
    const result = c.operation === "start" ? nativeBodyStartSound(c.suppressed,backend,c.request)
      : c.operation === "finished" ? nativeBodySoundFinished(backend,c.request[0]) : nativeBodyStopSound(backend,c.request[0]);
    expect({result,calls}).toEqual({result:c.result,calls:c.calls});
  }
  for (const c of completionFixture.cases) {
    const handles = new NativeSoundHandles(), calls = [];
    handles.channels.fill(c.channel);
    const result = handles.finished(c.handle, channel => {
      calls.push(channel); return { result:c.statusResult, flags:c.statusFlags };
    });
    expect({result,calls}).toEqual({result:c.result,calls:c.calls});
  }
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
  const requested = [],voices=[];
  page.on("request", request => {
    if(request.url().includes("/voices/"))voices.push(request.url().split("/voices/")[1]);
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
  await page.evaluate(async()=>{
    const {playNativeFireInputAudio,playNativeQueuedSound,playNativeHitVoice}=await import('/src/armageddon/audio.js');
    const {speechRequestId}=await import('/src/armageddon/speech-resources.js');
    const context=new AudioContext(),createSource=context.createBufferSource.bind(context);
    context.createBufferSource=()=>{const node=createSource(),start=node.start.bind(node);
      node.start=()=>{window.releasePlayback.push(node.buffer.duration);start();};return node;};
    playNativeFireInputAudio(context,{nativeSpeechBank:'Australian'},[{operation:'speech',request:[1,65536,65536,0]}],()=>{});
    playNativeQueuedSound(context,[speechRequestId(1,'Danish-Pyrus'),3,65536,65536,0]);
    playNativeHitVoice(context,{index:1},null,'Missing bank');
  });
  await expect.poll(()=>page.evaluate(()=>window.releasePlayback.length)).toBe(9);
  expect(voices.sort()).toEqual(['austra~1/amazing.wav','danish~1/amazing.wav','english/amazing.wav']);
  await page.locator('#team-voice-0').selectOption('austra~1');
  await page.locator('#team-voice-1').selectOption('danish~1');
  await page.reload();
  await expect(page.locator('#team-voice-0')).toHaveValue('austra~1');
  await expect(page.locator('#team-voice-1')).toHaveValue('danish~1');
  await expect.poll(()=>page.evaluate(()=>window.siege?.getState().assetsReady)).toBe(true);
  await page.locator('#mode').selectOption('local');await page.locator('#start').click();
  expect(await page.evaluate(()=>window.siege.getState().worms.map(w=>w.nativeSpeechBank).sort())).toEqual(['austra~1','austra~1','austra~1','danish~1','danish~1','danish~1']);
  const activeTeam=await page.evaluate(()=>window.siege.getState().team);
  await page.locator('#sound').click();await page.locator('#skip').click();
  const reactionBank=activeTeam===0?'danish~1':'austra~1';
  await expect.poll(()=>voices.includes(`${reactionBank}/coward.wav`)).toBe(true);



});
