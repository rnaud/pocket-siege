import { test, expect } from "./helpers/shared-page.js";
import fixture from './fixtures/armageddon/rope-length.json' with { type: 'json' };
import { nativeRopeLength } from '../src/armageddon/rope-length.js';
import bungee from './fixtures/armageddon/bungee-auto.json' with { type: 'json' };
import attachment from './fixtures/armageddon/bungee-attach.json' with { type: 'json' };
import spring from './fixtures/armageddon/bungee-tick.json' with { type: 'json' };
import { nativeAutoBungee, nativeAttachBungee, nativeBungeeTick } from '../src/armageddon/bungee.js';
import { createNativeRopeShot, tryNativeBungee, stepNativeRopeSwing } from '../src/armageddon/rope-runtime.js';

test('rope resizing matches native segment traversal, collision rejection and velocity scaling', { tag: '@logic' }, () => {
  expect(fixture.cases.map(row => nativeRopeLength(row.body, row.length, () => row.accepted)))
    .toEqual(fixture.cases.map(row => row.output));
  for (const row of bungee.cases) {
    let attempts = 0;
    const output = nativeAutoBungee(row.body, row.weapon, row.height, {
      tryPosition: body => {
        const accepted = body.type === 2 || attempts < row.clearSteps;
        attempts++;
        return accepted;
      },
    });
    expect(output).toEqual(row.output);
  }
  for (const row of attachment.cases) {
    expect(nativeAttachBungee(row.body, {
      tryPosition: () => row.accepted,
      constrain: () => row.attached,
      voice: () => 777,
      launchSetup: () => [101, -202, 303, -404],
    })).toEqual(row.output);
  }
  for (const row of spring.cases)
    expect(nativeBungeeTick(row.body, { resize: () => row.accepted })).toEqual(row.output);
  // Exercise the composition with real segment allocation, movement and
  // length changes; the executable fixtures above isolate each controller.
  const input = { ...createNativeRopeShot({ x: 200, y: 500, facing: 1, team: 0 }, 45, 650),
    state: 0x65, type: 2, minimumDrop: 200, bungeeLength: 0, field1f0: 0 };
  const interfaces = { collide: () => 0, solid: () => false, otherType: () => 1,
    voice: () => 777, launchSetup: () => [0, 0, 0, 0] };
  let body = tryNativeBungee(input, { weapon: { type: 4, subtype: 7 }, height: 650 }, interfaces).body;
  expect(body.constrained).toBe(1);
  expect(body.state).toBe(0x7c);
  expect(body.length).toBe(12 * 65536);
  const anchor = [body.anchorX, body.anchorY];
  for (let frame = 0; frame < 100; frame++)
    body = stepNativeRopeSwing(body, {}, { frame, index: 0, waterY: 1000, gravity: 0x3d70 }, interfaces);
  expect(body.length).toBeGreaterThan(300 * 65536);
  expect([body.anchorX, body.anchorY]).toEqual(anchor);
  expect(Number.isFinite(body.x + body.y + body.vx + body.vy)).toBe(true);
  body = stepNativeRopeSwing({ ...body, field104: 0 }, {},
    { frame: 100, index: 0, waterY: 1000, gravity: 0x3d70 }, interfaces);
  expect(body.state).toBe(0x65);
  expect(body.constrained).toBe(0);
});

test('the rope pass ticks the body without the worm-frame input', { tag: '@logic' }, () => {
  // 004CA750 runs the rope body tick before the worm frame applies 004DC730
  // input and the 004F8790 bungee to the moved body.
  const input = { ...createNativeRopeShot({ x: 200, y: 500, facing: 1, team: 0 }, 45, 650),
    state: 0x65, type: 2, minimumDrop: 200, bungeeLength: 0, field1f0: 0 };
  const interfaces = { collide: () => 0, solid: () => false, otherType: () => 1,
    voice: () => 777, launchSetup: () => [0, 0, 0, 0] };
  const body = tryNativeBungee(input, { weapon: { type: 4, subtype: 7 }, height: 650 }, interfaces).body;
  let moved = body, plain = body;
  for (let frame = 1; frame <= 20; frame++) {
    const environment = { frame, index: 2, waterY: 1000, gravity: 0x3d70 };
    moved = stepNativeRopeSwing(moved, { right: true }, { ...environment, physicsOnly: true }, interfaces);
    plain = stepNativeRopeSwing(plain, {}, { ...environment, physicsOnly: true }, interfaces);
  }
  // Controls do not reach the physics-only tick.
  expect(moved).toEqual(plain);
});
