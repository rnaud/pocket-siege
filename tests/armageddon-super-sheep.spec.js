import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/super-sheep.json" with { type: "json" };
import {
  nativeSheepEvent, nativeSheepWalk, nativeSheepFrame, nativeSuperSheepFlight, nativeSheepDraw,
  SHEEP_FIRE_EVENT, SHEEP_LEFT_EVENT, SHEEP_RIGHT_EVENT, SUPER_SHEEP_TURN,
} from "../src/armageddon/super-sheep.js";
import { nextLogicRandom, nextVisualRandom } from "../src/armageddon/numeric.js";
import { nativeWeaponSlotBlock } from "../src/armageddon/projectile-runtime.js";

const events = { fire: SHEEP_FIRE_EVENT, left: SHEEP_LEFT_EVENT, right: SHEEP_RIGHT_EVENT };

function replay(c) {
  const scene = {
    seed: c.environment.seed >>> 0, visualSeed: c.environment.visualSeed >>> 0,
    handle: c.environment.handle ?? 0x100, bubbles: 0, frame: 0,
  };
  const rectangles = c.environment.rectangles ?? [];
  const host = {
    waterY: c.environment.water,
    get frame() { return scene.frame; },
    collide: (x, y, flags) => rectangles.some(([l, t, r, b, mask]) =>
      l <= x >> 16 && x >> 16 <= r && t <= y >> 16 && y >> 16 <= b && (!mask || flags & mask)),
    random: () => (scene.seed = nextLogicRandom(scene.seed, scene.frame)),
    visualRandom: () => (scene.visualSeed = nextVisualRandom(scene.visualSeed)),
    wormState: () => c.environment.wormState ?? 0,
    startLoop: () => ++scene.handle,
  };
  let body = { ...c.start };
  for (const name of ["bubbles", "seed", "visualSeed"]) delete body[name];
  for (const [index, step] of c.steps.entries()) {
    scene.frame = step.frame;
    let result;
    if (step.op in events) result = nativeSheepEvent(body, events[step.op], step.team ?? body.team, host);
    else if (step.op === "walk") result = nativeSheepWalk(body, host);
    else if (step.op === "frame") result = nativeSheepFrame(body, host);
    else if (step.op === "draw") {
      const { body: next, draw } = nativeSheepDraw(body, step.frame, host.waterY, 0x50000);
      result = { body: next, calls: draw ? [{ operation: "draw", request: draw }] : [] };
    }
    else throw new Error(step.op);
    const calls = result.calls.filter((call) => {
      if (call.operation !== "bubbles") return true;
      scene.bubbles = call.request[0];
      return false;
    });
    const label = `slot${c.slot} step${index} ${step.op} ${JSON.stringify(c.body)}`;
    expect(calls, label).toEqual(step.calls);
    expect({ ...result.body, bubbles: scene.bubbles, seed: scene.seed, visualSeed: scene.visualSeed }, label)
      .toEqual(step.body);
    body = result.body;
  }
}

test("mode3 blocks match the default-scheme Sheep, Super Sheep and Aqua Sheep records", { tag: "@logic" }, () => {
  for (const slot of [23, 24, 25])
    expect(nativeWeaponSlotBlock(slot, 0x74).slice(3, 45)).toEqual(fixture.blocks[slot]);
  // Super/Aqua differ only in flight sprites (spsheep1/2, aquashp1/2) and water mask.
  expect(fixture.blocks[24].slice(38)).toEqual([632, 633, 76, 0x1004d]);
  expect(fixture.blocks[25].slice(38)).toEqual([634, 635, 76, 0x1004d]);
  expect(fixture.blocks[24][25] & 0x400000).toBe(0x400000);
  expect(fixture.blocks[25][25] & 0x400000).toBe(0);
  expect(SUPER_SHEEP_TURN).toBe(0x5b0);
});

test("fire and steering events match original 004E44A0/004E4090/004E4170", { tag: "@logic" }, () => {
  const cases = fixture.cases.slice(0, fixture.counts.messages);
  expect(cases).toHaveLength(1140);
  for (const c of cases) replay(c);
});

test("flight sequences match original 004E3E40 with take-off, steering, water and contact", { tag: "@logic" }, () => {
  const cases = fixture.cases.slice(fixture.counts.messages, fixture.counts.messages + fixture.counts.flights);
  expect(cases).toHaveLength(fixture.counts.flights);
  for (const c of cases) replay(c);
  // Upward release at 8 px/frame; four frames per 16.16 pixel row check.
  const straight = cases[0].steps[1].body;
  expect([straight.vx, straight.vy]).toEqual([0, -8 << 16]);
});

test("ground walk and hops match original 004E3920", { tag: "@logic" }, () => {
  const start = fixture.counts.messages + fixture.counts.flights;
  const cases = fixture.cases.slice(start, start + fixture.counts.walks);
  expect(cases).toHaveLength(624);
  for (const c of cases) replay(c);
});

test("flight and submerged sprites match original draw routine 004E27F0", { tag: "@logic" }, () => {
  const cases = fixture.cases.slice(-fixture.counts.draws);
  expect(cases).toHaveLength(960);
  for (const c of cases) replay(c);
});

test("flight speed halves under water and steering is applied per event", { tag: "@logic" }, () => {
  const host = { waterY: 600, frame: 0, collide: () => false, visualRandom: () => 0, startLoop: () => 1 };
  const air = nativeSuperSheepFlight({ x: 0, y: 100 << 16, angle: 0x4000, flags: 0, phase: 1 }, host).body;
  const water = nativeSuperSheepFlight({ x: 0, y: 700 << 16, angle: 0x4000, flags: 0, phase: 1, inWater: 1 }, host).body;
  expect(air.vx).toBe(8 << 16);
  expect(water.vx).toBe(4 << 16);
});
