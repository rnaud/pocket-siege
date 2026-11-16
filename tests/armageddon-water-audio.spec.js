import { test, expect } from "@playwright/test";
import fs from "node:fs";
import {
  nativeWaterSound,
  enqueueNativeSound,
} from "../src/armageddon/water-audio.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/water-audio.json", import.meta.url),
  ),
);
test("water audio callbacks match original requests, suppression and queue capacity", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(108);
  for (const v of fixture.cases) {
    const result = nativeWaterSound(
      { vx: v.velocity[0], vy: v.velocity[1], splashSuppress: v.suppress },
      v.skim,
    );
    const queue = Array.from({ length: v.count }, () => []);
    if (result.sound) enqueueNativeSound(queue, result.sound);
    expect(result.suppress).toBe(v.suppress_out);
    expect(queue.length).toBe(v.after);
    expect(queue.length > v.count ? queue.at(-1) : null).toEqual(v.sound);
  }
});

test("browser routes native water requests to decoded original samples and gain", async ({
  page,
}) => {
  const requested = [];
  page.on("request", (request) => {
    if (/\/(splash|splish)\.wav$/.test(request.url()))
      requested.push(request.url().split("/").pop());
  });
  await page.goto("/");
  // Exercise audio after startup decoding, within the adapter's 500 ms
  // freshness window; testing renderer preload contention is a separate case.
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.evaluate(async () => {
    const { playNativeWaterSound } = await import("/src/armageddon/audio.js");
    const context = new AudioContext();
    const source = context.createBufferSource.bind(context),
      gain = context.createGain.bind(context);
    const gains = [];
    window.waterAudio = [];
    context.createGain = () => {
      const node = gain();
      gains.push(node);
      return node;
    };
    context.createBufferSource = () => {
      const node = source(),
        start = node.start.bind(node);
      node.start = () => {
        window.waterAudio.push({
          duration: node.buffer.duration,
          gain: gains.at(-1).gain.value,
        });
        start();
      };
      return node;
    };
    playNativeWaterSound(context, [0x39, 0, 65536, 32768, 0]);
    playNativeWaterSound(context, [0x3a, 0, 65536, 65536, 0]);
  });
  await expect
    .poll(() => page.evaluate(() => window.waterAudio.length))
    .toBe(2);
  expect(requested.sort()).toEqual(["splash.wav", "splish.wav"]);
  const audio = await page.evaluate(() => window.waterAudio);
  expect(audio.every((v) => v.duration > 0)).toBe(true);
  const levels = audio.map((v) => v.gain).sort();
  expect(levels[0]).toBeCloseTo(0.175);
  expect(levels[1]).toBeCloseTo(0.35);
});
