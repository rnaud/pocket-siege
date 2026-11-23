import { test, expect } from "./helpers/shared-page.js";
import {
  attachNativeJumpFlight,
  attachNativeParachuteFlight,
  stepNativeJumpFlight,
  nativeStandingSupport,
  nativeAirborneBody,
} from "../src/armageddon/worm-flight.js";
import { nativeSimpleBodyTick, nativeBodyAwake } from "../src/armageddon/motion.js";
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

test("composed jump flight preserves native impulse and exact force integration", { tag: "@logic" }, () => {
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

test("native flight lands with impact velocity retained before stopping", { tag: "@logic" }, () => {
  for (const [direction, backflip, parachute] of [
    [1, 0],
    [-1, 0],
    [0, 0],
    [0, 1],
    [1, 0, true],
  ]) {
    const w = worm();
    attachNativeJumpFlight(w, environment, direction, backflip);
    if(parachute)attachNativeParachuteFlight(w,{...environment,windPercent:100});
    w.nativeFlight.field250=23;
    let result;
    for (let tick = 0; tick < 100 && w.nativeFlight; tick++)
      result = stepNativeJumpFlight(
        w,
        { ...environment, frame: tick },
        (x, y) => (y <= 10 ? 1 : 0),
      );
    expect(result.landed).toBe(true);
    expect(result.body.field250).toBe(0);
    expect(result.body.windScale).toBe(0);
    expect(result.body.type).toBe(2);
    expect(result.body.complex).toBe(1);
    if(parachute){expect(result.landingSpeed).toBeGreaterThan(0);expect(result.landingSpeed).toBeLessThan(100);}
    else expect(result.landingSpeed).toBeGreaterThan(100);
    expect(w.nativeFlight).toBeNull();
    expect(w.ground).toBe(true);
    expect(w.vx).toBe(0);
    expect(w.vy).toBe(0);
    expect(w.y).toBeGreaterThan(10);
    expect(w.y).toBeLessThanOrEqual(11);
  }
});

test("native flight hits ceilings and walls without tunneling", { tag: "@logic" }, () => {
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

  // A type2 receiver above the jumper follows the native body/stomp branch,
  // not the terrain ceiling voice branch. Publish its changed category before
  // the sweep probes again, and do not consume a ceiling random draw.
  const incoming = worm();
  attachNativeJumpFlight(incoming, environment, 0, 1);
  let receiver = { worm: true, type: 2, state: 0x65, x: 40 * 65536,
    y: 600 * 65536, vx: 0, vy: 0, mass: 65536, tangent: 0 };
  let bodyDraws = 0;
  const bodyEvents = [];
  for (let frame = 0; frame < 10; frame++) {
    const result = stepNativeJumpFlight(incoming, {
      ...environment, frame,
      random: () => { bodyDraws++; return 0; },
      collisionBody: () => receiver,
      updateCollisionBody: (hit, body) => {
        expect(hit).toBe(2);
        receiver = { ...body, type: body.state === 0x80 ? 3 : 2 };
      },
    }, (x, y, body) => {
      expect(body.shape).toBe(3);
      return y >= 30 && receiver.type === 2 ? 2 : 0;
    });
    bodyEvents.push(...result.events);
  }
  expect(bodyDraws).toBe(0);
  expect(receiver.state).toBe(0x80);
  expect(receiver.vy).not.toBe(0);
  expect(bodyEvents.filter(event => event.receiverHit === 2)).toEqual([
    { operation: "state", target: 0x80, receiverHit: 2 },
  ]);
});

test("Fire Punch rises with native forces and exits directly to recoil on ground contact", { tag: "@logic" }, async () => {
  const { attachNativeFirePunchFlight, stepNativeFirePunchFlight } = await import('../src/armageddon/worm-flight.js');
  const w = worm();
  const record = { '0x70':30, '0x74':45, '0x78':100 };
  attachNativeFirePunchFlight(w, environment, 100);
  w.nativeFlight.field250=23;
  expect(w.nativeFlight.flags & 4).toBe(0);
  expect(w.nativeFlight.type).toBe(3);
  expect(w.nativeFlight.complex).toBe(1);
  let sprite = 432, draws = 0, hitTicks = 0, switched = false, finished = false;
  for (let tick = 1; tick <= 100 && !finished; tick++) {
    const result = stepNativeFirePunchFlight(w, {
      ...environment, frame: tick, random: () => { draws++; return 0; },
    }, (x,y) => y <= 10 ? 1 : 0, sprite, record);
    const area = result.calls.filter(call => call.operation === 'area');
    hitTicks += area.length;
    if (tick <= 10) {
      expect(w.nativeFlight.vy).toBe(-0x60000 + tick * 0x3d70);
      expect(w.nativeFlight.y).toBe(639 * 65536 - tick * 0x60000 + tick * (tick + 1) / 2 * 0x3d70);
    }
    for (const call of result.calls) {
      if (call.operation === 'queue') { sprite = call.sprite; switched = true; }
      if (call.operation === 'state') expect(call.value).toBe(0x6a);
    }
    if (switched) expect(area).toHaveLength(0);
    if(result.finished){
      expect(result.body.state).toBe(0x6a);
      expect(result.body.flags&4).toBe(4);
      expect(result.body.field250).toBe(0);
    }
    expect(result.events.some(event => event.operation === 'state' && event.target === 0x7a)).toBe(false);
    finished = result.finished;
  }
  expect(hitTicks).toBeGreaterThan(10);
  expect(draws).toBe(hitTicks * 4);
  expect(switched).toBe(true);
  expect(finished).toBe(true);
  expect(w.ground).toBe(true);
  expect(w.nativeFlight).toBeNull();
  expect(w.y).toBeGreaterThan(10);
  expect(w.y).toBeLessThanOrEqual(11);
});

test("a standing worm falls exactly when the shared body tick would move it", { tag: "@logic" }, () => {
  // Support is the floor at native y 650 - 11 + 1 px; frames cover the
  // 13-frame sleep recheck at index 2.
  let checked = 0;
  for (const floor of [true, false]) for (const vx of [0, 25]) for (const sleep of [0, 1])
    for (let frame = 0; frame < 26; frame++) {
      const w = { ...worm(), vx, nativeStandingSleep: sleep };
      const collide = (x, y) => Number(floor && y >= (650 - 11 + 1) * 65536);
      const support = nativeStandingSupport(w, { height: 650, frame, index: 2 }, collide);
      const body = nativeSimpleBodyTick({ ...nativeAirborneBody(w, 650, 96), sleeping: sleep },
        { frame, index: 2, waterY: 650, gravity: 0x3d70, wind: 0 },
        { awake: nativeBodyAwake, collide, bounce: () => {} });
      expect(support.fall).toBe(Boolean(body.moving || body.vx || body.vy));
      if (!support.fall) expect(support.sleeping).toBe(body.sleeping);
      checked++;
    }
  expect(checked).toBe(208);
});

test("host worm position and velocity carry native 16.16 values without loss", { tag: "@logic" }, () => {
  // Bodies are built from w.x, H - w.y and w.vx/w.vy (px/s at 50 Hz); every
  // native value written back that way rebuilds exactly.
  let seed = 7;
  const next = () => (seed = (Math.imul(seed, 1103515245) + 12345) | 0);
  let mismatches = 0;
  for (let i = 0; i < 20000; i++) {
    const vx = next() >> 10, vy = next() >> 10, x = (next() >>> 6) & 0x3ffffff, y = (next() >>> 6) & 0x1ffffff;
    const w = { ...worm(), x: x / 65536, y: 650 - y / 65536, vx: (vx / 65536) * 50, vy: -(vy / 65536) * 50 };
    const body = nativeAirborneBody(w, 650, 96);
    if (body.x !== x || body.y !== y || body.vx !== vx || body.vy !== vy) mismatches++;
  }
  expect(mismatches).toBe(0);
});

test("a suspended standing body neither wakes nor falls, as the shared tick skips it", { tag: "@logic" }, () => {
  const w = { ...worm(), nativeStandingSleep: 0 };
  const support = nativeStandingSupport(w, { height: 650, frame: 0, index: 0, suspended: 1 }, () => 0);
  const body = nativeSimpleBodyTick({ ...nativeAirborneBody(w, 650, 96), suspended: 1 },
    { frame: 0, index: 0, waterY: 650, gravity: 0x3d70, wind: 0 },
    { awake: nativeBodyAwake, collide: () => 0, bounce: () => {} });
  expect(support).toEqual({ sleeping: 0, fall: false });
  expect([body.y, body.vy, body.moving]).toEqual([nativeAirborneBody(w, 650, 96).y, 0, 0]);
});

test("a jump flight moved by the physics pass matches the composed flight step", { tag: "@logic" }, () => {
  // 004CA750 ticks the body before the worm's 0x3EA state logic; landing on
  // a floor must give the same body, events and result either way.
  const composed = worm(), split = worm();
  attachNativeJumpFlight(composed, environment, 1);
  attachNativeJumpFlight(split, environment, 1);
  const floor = (x, y) => Number(y < 5);
  for (let tick = 1; tick <= 120 && composed.nativeFlight; tick++) {
    const env = { ...environment, frame: tick, index: 2, waterLevel: -100 };
    const a = stepNativeJumpFlight(composed, env, floor);
    stepNativeJumpFlight(split, { ...env, physicsOnly: true }, floor);
    const b = stepNativeJumpFlight(split, { ...env, moved: true }, floor);
    expect(b).toEqual(a);
    expect([split.x, split.y, split.vx, split.vy, split.ground]).toEqual(
      [composed.x, composed.y, composed.vx, composed.vy, composed.ground]);
  }
  expect(composed.ground).toBe(true);
});
