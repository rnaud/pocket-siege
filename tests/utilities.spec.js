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

test("utility inventory exposes the movement and support kit", { tag: "@logic" }, () => {
  for (const row of environment.cases)
    expect(nativeTeamEnvironment(row.input, row.flags)).toEqual(row.output);
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
});
