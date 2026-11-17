import crateHits from "./fixtures/armageddon/crate-hit.json" with { type: "json" };
import { nativeCrateHit } from "../src/armageddon/crate-hit.js";
import detonation from "./fixtures/armageddon/crate-detonation.json" with { type: "json" };
import { nativeCrateDetonation } from "../src/armageddon/crate-detonation.js";
import { test, expect } from "@playwright/test";
import { UTILITIES, UTILITY_KINDS, freshUtilities } from "../src/utilities.js";
import environment from './fixtures/armageddon/team-environment.json' with { type: 'json' };
import { nativeTeamEnvironment } from '../src/armageddon/team-environment.js';
import automatic from './fixtures/armageddon/automatic-utilities.json' with { type: 'json' };
import { nativeAutomaticUtilities } from '../src/armageddon/automatic-utilities.js';
import shower from './fixtures/armageddon/crate-shower.json' with { type: 'json' };
import { nativeCrateShowerTick } from '../src/armageddon/crate-shower.js';
import crateState from './fixtures/armageddon/crate-state.json' with { type: 'json' };
import { nativeCrateState, nativeCrateArt } from '../src/armageddon/crate-state.js';
import crateBody from './fixtures/armageddon/crate-body.json' with { type: 'json' };
import { nativeCratePlacement } from '../src/armageddon/crate-body.js';
import crateTick from './fixtures/armageddon/crate-tick.json' with { type: 'json' };
import { nativeCrateTick } from '../src/armageddon/crate-tick.js';
import crateContact from './fixtures/armageddon/crate-contact.json' with { type: 'json' };
import crateEvents from './fixtures/armageddon/crate-events.json' with { type: 'json' };
import { nativeCrateContact } from '../src/armageddon/crate-contact.js';
import { nativeCrateEvent } from '../src/armageddon/crate-events.js';
import pickup from './fixtures/armageddon/crate-pickup.json' with { type: 'json' };
import { nativePickupCandidate } from '../src/armageddon/crate-pickup.js';
import transfer from './fixtures/armageddon/crate-transfer.json' with { type: 'json' };
import { nativeCrateTransfer } from '../src/armageddon/crate-transfer.js';
import { addNativeAmmo } from '../src/armageddon/inventory.js';
import { nativeBodyBase } from '../src/armageddon/mine-body.js';
import { createNativeCrateBody, stepNativeCrateBody } from '../src/armageddon/crate-runtime.js';
import { nativeCollisionBitmapOverlap } from '../src/armageddon/collision-mask.js';
import shapes from '../src/armageddon/collision-shapes.json' with { type: 'json' };

test("utility inventory exposes the movement and support kit", { tag: "@logic" }, () => {
  for (const row of environment.cases)
    expect(nativeTeamEnvironment(row.input, row.flags)).toEqual(row.output);
  for (const row of transfer.cases) {
    const stocks = { 1: [...row.recipient], 2: [...row.donor] };
    let hp = row.hp;
    nativeCrateTransfer(row.record, 1, 1, {
      addAmmo: (team, slot, amount) => { stocks[team][slot] = addNativeAmmo(stocks[team][slot], amount); },
      setAmmo: (team, slot, value) => { stocks[team][slot] = value; },
      health: () => hp,
      setHealth: (team, worm, value) => { hp = value; },
    });
    expect({ hp, recipient: stocks[1], donor: stocks[2] }).toEqual(row.output);
  }
  for (const row of pickup.cases) {
    const queries = [], actor = { ...row.actor, type: 11 };
    const candidates = row.candidates.map(c => c.self ? actor : { ...c });
    const result = nativePickupCandidate(actor, candidates, row.radius, candidate => {
      const index = candidates.indexOf(candidate);
      queries.push(index);
      return row.candidates[index].query ? { kind: row.candidates[index].kind } : null;
    });
    expect(result ? candidates.indexOf(result) : -1).toBe(row.selected);
    expect(queries).toEqual(row.queries);
  }
  for (const row of crateEvents.cases)
    expect(nativeCrateEvent(row.input, row.event)).toEqual(row.output);
  for (const row of crateContact.cases) {
    const calls = [];
    nativeCrateContact(row, row.side, row.suppress, {
      sound: request => calls.push({ operation: 'sound', request }),
      receive: side => { calls.push({ operation: 'receive', side }); return row.accepted; },
      bounce: side => calls.push({ operation: 'bounce', side }),
    });
    expect(calls).toEqual(row.calls);
  }
  for (const row of crateState.cases) {
    expect(nativeCrateState(row.input, row.state)).toEqual(row.output);
    expect(nativeCrateArt(row.input)).toEqual(row.art);
  }
  for (const row of crateBody.cases) {
    const base = nativeBodyBase(row.friction, 11, 6);
    for (const [key, value] of Object.entries(base)) expect(value).toBe(row.before[key]);
    const events = [];
    let queries = 0;
    const result = nativeCratePlacement(row.before, row, row.mode, row.bottom, {
      shape: (body, shape) => { events.push(['shape', shape]); body.shape = shape; },
      collide: (x, y, body) => {
        events.push(['probe', x, y, body.flags]);
        const hit = body.flags === 2 ? queries < row.reject : y >= 3 * 65536;
        queries++;
        return hit;
      },
      sound: request => events.push(['sound', ...request]),
      effect: request => events.push(['effect', ...request]),
      remove: body => events.push(['remove', body.type]),
      register: body => events.push(['register', body.type]),
    });
    expect(result).toEqual(row.after);
    expect(events).toEqual(row.events);
  }
  for (const row of crateTick.cases) {
    const events = [];
    let busy = 0;
    const result = nativeCrateTick(row.input, row.bottom, {
      motion: body => { events.push(['motion']); return body; },
      moving: body => body.moving,
      camera: request => events.push(['camera', ...request]),
      busy: () => { events.push(['busy']); busy = 12; },
      state: state => events.push(['state', state]),
      detonate: () => events.push(['detonate']),
      delete: flag => events.push(['delete', flag]),
      collide: (x, y) => { events.push(['probe', x, y]); return y >= row.input.y + row.clearance * 65536; },
      visualRandom: () => { events.push(['random']); return 6; },
      bubble: request => events.push(['bubble', ...request]),
    });
    expect(result.body).toEqual(row.output);
    expect(result.missionStatus).toBe(row.missionStatus);
    expect(result.deleted).toBe(row.events.some(event => event[0] === 'delete'));
    expect(events).toEqual(row.events);
    expect(busy).toBe(row.busy);
  }
  for (const row of automatic.cases) {
    const result = nativeAutomaticUtilities(row.input, row.available, row.bits);
    expect(result.body).toEqual(row.output);
    expect(row.counts.map((count, i) => result.cleared.includes(67 + i) ? 0 : count)).toEqual(row.after);
  }
  for (const row of shower.cases) {
    const events = [];
    let busy = 0;
    const result = nativeCrateShowerTick(row.input, {
      parent: (...args) => { events.push(['parent', ...args]); return 0x1234; },
      busy: () => { events.push(['busy']); busy = 12; },
      place: (...args) => { events.push(['place', ...args]); return row.placement ? { x: 123 * 65536, y: -45 * 65536 } : null; },
      nextRandom: () => { events.push(['random']); return row.random; },
      ammo: weapon => weapon + 2,
      allocate: size => { events.push(['allocate', size]); return row.allocate; },
      create: (allocation, parent, record, mode) => events.push(['create', parent, mode, record.x, record.y, record.kind, record.ammo, record.weapon]),
    });
    expect(result).toEqual(row.output);
    expect(events).toEqual(row.events);
    expect(busy).toBe(row.busy);
  }
  const loadout = freshUtilities();
  expect(UTILITY_KINDS).toEqual([
    "bungee",
    "rope",
    "jetpack",
    "parachute",
    "teleport",
    "girder",
    "freeze",
    "fastwalk",
    "lowgravity",
  ]);
  expect(loadout.rope).toBe(Infinity);
  expect(loadout.jetpack).toBe(1);
  expect(loadout.freeze).toBe(1);
  expect(loadout.fastwalk).toBe(0);
  expect(loadout.lowgravity).toBe(0);
  expect(loadout.doubledamage).toBe(0);
  expect(loadout.doubletime).toBe(0);
  expect(UTILITIES.teleport.label).toBe("Teleport");
  for (const row of crateHits.cases) {
    const packet = [...row.packet];
    expect(nativeCrateHit(row.input, packet, row.extentFactor)).toEqual(row.output);
    expect(packet[5]).toBe(row.report);
  }
  for (const row of detonation.cases) {
    const events = [];
    let allocationIndex = 0;
    const result = nativeCrateDetonation(row.input, row.inventory, {
      parent: (...args) => { events.push(['parent', ...args]); return args[0]; },
      blast: request => events.push(['blast', ...request]),
      allocate: size => {
        const accepted = (row.allocationMask >> allocationIndex++) & 1;
        events.push(['allocate', size, accepted]); return accepted;
      },
      debris: (allocation, parent, record) => events.push(['debris', parent, record]),
      sound: request => events.push(['sound', ...request]),
      contents: (...args) => events.push(['contents', ...args]),
      broadcast: (...args) => events.push(['broadcast', ...args]),
    });
    expect(events).toEqual(row.events);
    expect(result.body).toEqual({ ...row.input, destroyed: row.destroyed });
    expect(result.missionStatus).toBe(row.missionStatus);
  }
  const collide = (x, y, body) => nativeCollisionBitmapOverlap(
    shapes.shapes[body.shape], x >> 16, y >> 16,
    { width: 1000, height: 1000, left: 0, top: 0, solid: (x, y) => y >= 500 },
  );
  const hooks = {
    shape: (body, shape) => { body.shape = shape; }, collide,
    sound: () => {}, effect: () => {}, remove: () => {}, register: () => {},
    other: () => ({ type: 1, vx: 0, vy: 0 }), receive: () => 0,
    impactSound: () => {}, camera: () => {}, busy: () => {}, delete: () => {},
    detonate: () => {}, visualRandom: () => 0, bubble: () => {},
  };
  let body = createNativeCrateBody({ kind: 1, x: 100 * 65536, y: 0 }, 1, 800, 96, hooks);
  for (let frame = 0; frame < 600; frame++) {
    const result = stepNativeCrateBody(body, {
      frame, index: 0, gravity: 0x3d70, wind: 0, waterY: 750, bottom: 800,
    }, hooks);
    body = result.body;
    expect(result.deleted).toBe(false);
    if (frame === 49) expect([body.state, body.y, body.vy]).toEqual([100, 0, 0]);
    if (frame === 50) expect([body.state, body.y]).toEqual([101, 0]);
  }
  expect(body.state).toBe(104);
  expect(body.vy).toBe(0);
  expect(collide(body.x, body.y, body)).toBe(0);
  expect(collide(body.x, body.y + 65536, body)).toBe(1);
});
