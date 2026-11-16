import { test, expect } from "@playwright/test";
import {
  attachNativeJumpFlight,
  stepNativeJumpFlight,
} from "../src/armageddon/worm-flight.js";
const environment = { height: 650, waterLevel: 0 };
const worm = () => ({
  x: 40,
  y: 11,
  vx: 0,
  vy: 0,
  facing: 1,
  team: 0,
  ground: true,
});

test("composed jump flight preserves native impulse and exact force integration", () => {
  const w = worm();
  const impulse = attachNativeJumpFlight(w, environment, 1);
  expect(impulse).toEqual([147465, -255384, 0]);
  for (let tick = 1; tick <= 10; tick++) {
    stepNativeJumpFlight(w, { ...environment, frame: tick }, () => 0);
    expect(w.nativeFlight.vx).toBe(impulse[0]);
    expect(w.nativeFlight.vy).toBe(impulse[1] + tick * 0x3d70);
    expect(w.nativeFlight.x).toBe(40 * 65536 + tick * impulse[0]);
    expect(w.nativeFlight.y).toBe(
      639 * 65536 + tick * impulse[1] + ((tick * (tick + 1)) / 2) * 0x3d70,
    );
  }
});

test("native flight lands with impact velocity retained before stopping", () => {
  for (const [direction, backflip] of [
    [1, 0],
    [-1, 0],
    [0, 0],
    [0, 1],
  ]) {
    const w = worm();
    attachNativeJumpFlight(w, environment, direction, backflip);
    let result;
    for (let tick = 0; tick < 100 && w.nativeFlight; tick++)
      result = stepNativeJumpFlight(
        w,
        { ...environment, frame: tick },
        (x, y) => (y <= 10 ? 1 : 0),
      );
    expect(result.landed).toBe(true);
    expect(result.landingSpeed).toBeGreaterThan(100);
    expect(w.nativeFlight).toBeNull();
    expect(w.ground).toBe(true);
    expect(w.vx).toBe(0);
    expect(w.vy).toBe(0);
    expect(w.y).toBeGreaterThan(10);
    expect(w.y).toBeLessThanOrEqual(11);
  }
});

test("native flight hits ceilings and walls without tunneling", () => {
  const up = worm();
  attachNativeJumpFlight(up, environment, 0, 1);
  let ceiling = false,
    draws = 0;
  for (let tick = 0; tick < 50 && up.nativeFlight; tick++) {
    const result = stepNativeJumpFlight(
      up,
      {
        ...environment,
        frame: tick,
        random: () => {
          draws++;
          return 257;
        },
      },
      (x, y) => (y >= 30 || y <= 10 ? 1 : 0),
    );
    ceiling ||= result.events.some((event) => event.operation === "voice");
    expect(up.y).toBeLessThan(30);
  }
  expect(ceiling).toBe(true);
  expect(draws).toBe(1);
  expect(up.ground).toBe(true);
  const right = worm();
  attachNativeJumpFlight(right, environment, 1);
  let reflected = false;
  for (let tick = 0; tick < 50 && right.nativeFlight; tick++) {
    stepNativeJumpFlight(right, { ...environment, frame: tick }, (x, y) =>
      x >= 55 || y <= 10 ? 1 : 0,
    );
    reflected ||= right.vx < 0;
    expect(right.x).toBeLessThan(55);
  }
  expect(reflected).toBe(true);
  expect(right.ground).toBe(true);
});
