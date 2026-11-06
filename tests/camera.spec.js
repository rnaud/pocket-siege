import { test, expect } from "@playwright/test";
import { chooseCameraTarget, cameraView, FULL_VIEW } from "../src/camera.js";
import { W, H } from "../src/physics.js";

const worm = (overrides = {}) => ({
  x: 400,
  y: 300,
  vx: 0,
  vy: 0,
  knocked: false,
  ...overrides,
});

test("camera stays full while aiming and frames the action in flight", () => {
  expect(
    chooseCameraTarget({
      phase: "aim",
      projectile: { x: 10, y: 10 },
      worms: [],
    }),
  ).toEqual({ zoom: 1, cx: W / 2, cy: H / 2 });
  const active = worm({ x: 180, y: 350 });
  const target = chooseCameraTarget({
    phase: "flight",
    projectile: { x: 700, y: 400 },
    worms: [active],
    active,
  });
  expect(target.cx).toBe(440);
  expect(target.zoom).toBeGreaterThan(1);
  expect(target.zoom).toBeLessThanOrEqual(1.35);
});

test("camera zooms out when the projectile is far from the shooter", () => {
  const active = worm({ x: 100, y: 350 });
  const near = chooseCameraTarget({
    phase: "flight",
    projectile: { x: 250, y: 380 },
    worms: [active],
    active,
  });
  const far = chooseCameraTarget({
    phase: "flight",
    projectile: { x: 1150, y: 380 },
    worms: [active],
    active,
  });
  expect(near.zoom).toBeGreaterThan(far.zoom);
  expect(far.zoom).toBeGreaterThanOrEqual(1);
});

test("camera follows the fastest knocked worm during settle", () => {
  const active = worm({ x: 400, y: 300 });
  const target = chooseCameraTarget({
    phase: "settle",
    projectile: null,
    worms: [
      worm({ x: 200, vx: 20, knocked: true }),
      worm({ x: 900, vx: 300, vy: 100, knocked: true }),
    ],
    active,
  });
  expect(target.cx).toBeGreaterThan(500);
  expect(target.zoom).toBeGreaterThan(1);
});

test("camera view clamps to the world and preserves the world aspect", () => {
  expect(cameraView(W / 2, H / 2, 1)).toEqual(FULL_VIEW);
  const corner = cameraView(0, 0, 1.32);
  expect(corner.x).toBe(0);
  expect(corner.y).toBe(0);
  expect(corner.w / corner.h).toBeCloseTo(W / H, 5);
  const far = cameraView(W, H, 1.5);
  expect(far.x).toBeCloseTo(W - W / 1.5, 5);
  expect(far.y).toBeCloseTo(H - H / 1.5, 5);
  expect(cameraView(W / 2, H / 2, 99).zoom).toBe(1.5);
});
