import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-water-audio.json" with { type: "json" };
import {
  nativeWaterSound,
  enqueueNativeSound,
} from "../src/armageddon/water-audio.js";

test("mine splash and skim requests match original callbacks and sound queue", () => {
  expect(fixture.cases).toHaveLength(36);
  for (const [i, c] of fixture.cases.entries()) {
    const event = nativeWaterSound(
      { vx: c.velocity[0], vy: c.velocity[1] },
      c.skim,
    );
    const queue = Array.from({ length: c.count }, () => []);
    enqueueNativeSound(queue, event.sound);
    expect(queue.length, `count ${i}`).toBe(c.after);
    expect(queue[c.count] ?? null, `request ${i}`).toEqual(c.sound);
  }
});
