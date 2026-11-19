import crateSchemes from './fixtures/armageddon/crate-scheme.json' with {type:'json'};
import { createNativeCrateScheme } from '../src/armageddon/crate-scheme.js';
import crateContentPool from './fixtures/armageddon/crate-content-pool.json' with { type: 'json' };
import { nativeCrateContentPool } from '../src/armageddon/crate-content-pool.js';
import crateShowerNearest from './fixtures/armageddon/crate-shower-nearest.json' with { type: 'json' };
import nearestBody from './fixtures/armageddon/nearest-body.json' with { type: 'json' };
import { nativeNearestBody } from '../src/armageddon/nearest-body.js';
import crateShowerPlacement from './fixtures/armageddon/crate-shower-placement.json' with { type: 'json' };
import { createHash } from 'node:crypto';
import crateSpawnSearch from './fixtures/armageddon/crate-spawn-search.json' with { type: 'json' };
import { nativeCrateSpawnSearch } from '../src/armageddon/crate-spawn-search.js';
import crateVisibility from './fixtures/armageddon/crate-visibility.json' with { type: 'json' };
import textImages from "./fixtures/armageddon/text-image.json" with { type: "json" };
import { nativeRenderTextImage } from "../src/armageddon/text-image.js";
import { NativeSpriteDrawQueue } from "../src/armageddon/sprite-draw-queue.js";
import crateDraw from "./fixtures/armageddon/crate-draw.json" with { type: "json" };
import { nativeDrawCrate, nativeCrateContentsVisible, nativeSpecialCrateContent } from "../src/armageddon/crate-draw.js";
import poisonSettlement from "./fixtures/armageddon/poison-settlement.json" with { type: "json" };
import { nativePoisonSettlement } from "../src/armageddon/poison-settlement.js";
import nuclearEffect from "./fixtures/armageddon/nuclear-effect.json" with { type: "json" };
import { nativeNuclearEffectStart, nativeNuclearEffectTick } from "../src/armageddon/nuclear-effect.js";
import waterRise from "./fixtures/armageddon/water-rise.json" with { type: "json" };
import { nativeWaterRiseStart, nativeWaterRiseTick } from "../src/armageddon/water-rise.js";
import suddenDeath from "./fixtures/armageddon/sudden-death.json" with { type: "json" };
import { nativeSuddenDeathActivation, nativeSuddenDeathHealth, nativeSuddenDeathRepeat } from "../src/armageddon/sudden-death.js";
import { nextLogicRandom } from "../src/armageddon/numeric.js";
import { nativePoisonAnnouncement } from "../src/armageddon/announcements.js";
import poison from "./fixtures/armageddon/worm-poison.json" with { type: "json" };
import { nativeWormPoisonInfect, nativeWormPoisonPickup, nativeWormPoisonDamage, nativeWormPoisonTurnReset } from "../src/armageddon/worm-poison.js";
import wormPickup from "./fixtures/armageddon/worm-pickup.json" with { type: "json" };
import { nativeWormPickupEvent, nativeWormPickupQuery, nativeWormPickupTick, nativeWormPickupContact } from "../src/armageddon/worm-pickup.js";
import barrelArt from "./fixtures/armageddon/barrel-art.json" with { type: "json" };
import { nativeBarrelArt } from "../src/armageddon/barrel-art.js";
import barrelContacts from "./fixtures/armageddon/barrel-contact.json" with { type: "json" };
import { nativeBarrelContact } from "../src/armageddon/barrel-contact.js";
import barrelBodies from "./fixtures/armageddon/barrel-body.json" with { type: "json" };
import { nativeBarrelBody } from "../src/armageddon/barrel-body.js";
import barrelTicks from "./fixtures/armageddon/barrel-tick.json" with { type: "json" };
import { nativeBarrelTick } from "../src/armageddon/barrel-tick.js";
import barrelHits from "./fixtures/armageddon/barrel-hit.json" with { type: "json" };
import { nativeBarrelHit } from "../src/armageddon/barrel-hit.js";
import barrelDetonation from "./fixtures/armageddon/barrel-detonation.json" with { type: "json" };
import { nativeBarrelDetonation } from "../src/armageddon/barrel-detonation.js";
import projectileFire from "./fixtures/armageddon/projectile-fire.json" with { type: "json" };
import { nativeProjectileFire } from "../src/armageddon/projectile-fire.js";
import flameEvents from "./fixtures/armageddon/flame-events.json" with { type: "json" };
import { nativeFlameEvent } from "../src/armageddon/flame-events.js";
import flameBlasts from "./fixtures/armageddon/flame-blast.json" with { type: "json" };
import { nativeFlameBlast } from "../src/armageddon/flame-blast.js";
import crateProjectile from "../src/armageddon/crate-projectile-data.json" with { type: "json" };
import schemeWeapons from "../src/armageddon/scheme-weapon-data.json" with { type: "json" };
import { attachNativeProjectileBlock } from "../src/armageddon/projectile-runtime.js";
import { stepNativeFlame } from "../src/armageddon/flame-runtime.js";
import flameArt from "./fixtures/armageddon/flame-art.json" with { type: "json" };
import { nativeFlameArt } from "../src/armageddon/flame-art.js";
import flameTicks from "./fixtures/armageddon/flame-tick.json" with { type: "json" };
import { nativeFlameTick } from "../src/armageddon/flame-tick.js";
import flameHits from "./fixtures/armageddon/flame-hit.json" with { type: "json" };
import { nativeFlameHit } from "../src/armageddon/flame-hit.js";
import flameSpread from "./fixtures/armageddon/flame-spread.json" with { type: "json" };
import { nativeFlameSpread, registerNativeFlame } from "../src/armageddon/flame-spread.js";
import flameMotion from "./fixtures/armageddon/flame-motion.json" with { type: "json" };
import { nativeFlameMotion } from "../src/armageddon/flame-motion.js";
import flameBodies from "./fixtures/armageddon/flame-body.json" with { type: "json" };
import { nativeFlameBody } from "../src/armageddon/flame-body.js";
import crateContents from "./fixtures/armageddon/crate-contents.json" with { type: "json" };
import { nativeCrateContents } from "../src/armageddon/crate-contents.js";
import crateHits from "./fixtures/armageddon/crate-hit.json" with { type: "json" };
import { nativeCrateHit, nativeCrateDirectHit } from "../src/armageddon/crate-hit.js";
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
import { nativeCrateTransfer, nativeCratePickupAudio, nativePickupCategory, nativeRecordPickup } from '../src/armageddon/crate-transfer.js';
import { nativeInventorySet } from '../src/armageddon/inventory.js';
import { nativeBodyBase } from '../src/armageddon/mine-body.js';
import { createNativeCrateBody, stepNativeCrateBody } from '../src/armageddon/crate-runtime.js';
import { nativeCollisionBitmapOverlap } from '../src/armageddon/collision-mask.js';
import shapes from '../src/armageddon/collision-shapes.json' with { type: 'json' };

test("utility inventory exposes the movement and support kit", { tag: "@logic" }, () => {
  for (const row of poisonSettlement.cases) expect(nativePoisonSettlement(row.input)).toEqual(row.result);
  for (const row of environment.cases)
    expect(nativeTeamEnvironment(row.input, row.flags)).toEqual(row.output);
  for (const row of nuclearEffect.starts) {
    let random = row.seed;
    const result = nativeNuclearEffectStart(row.input, row.duration, () => (random = nextLogicRandom(random, row.frame)));
    expect({ ...result, random }).toEqual(row.result);
  }
  for (const row of nuclearEffect.cases)
    expect(nativeNuclearEffectTick(row.input, request => request[0] === 0x10004 ? 301 : 302)).toEqual(row.result);
  for (const row of waterRise.starts)
    expect({ body: nativeWaterRiseStart(row.input, row.record), calls: [] }).toEqual(row.result);
  for (const row of waterRise.ticks)
    expect(nativeWaterRiseTick(row.input)).toEqual(row.result);
  for (const row of suddenDeath.cases)
    expect(nativeSuddenDeathActivation(row.input)).toEqual(row.calls);
  for (const row of suddenDeath.repeats)
    expect(nativeSuddenDeathRepeat(row.input)).toEqual(row.result);
  for (const row of poison.health_cases)
    expect({ body: row.input, calls: nativeSuddenDeathHealth(row.hp, row.amount), random: 17 }).toEqual(row.result);
  for (const row of poison.cases) {
    let random = 17;
    const calls = row.operation === 'tick' ? nativeWormPoisonDamage(row.input, row.hp) : [];
    const body = row.operation === 'infect' ? nativeWormPoisonInfect(row.input, row.added, {
      report: record => calls.push({ operation: 'report', record }),
      announce: () => calls.push({ operation: 'announcement', message: nativePoisonAnnouncement('ALPHA', () => (random = nextLogicRandom(random, 3))) }),
    }) : row.operation === 'pickup' ? nativeWormPoisonPickup(row.input, row.record)
      : row.operation === 'reset' ? nativeWormPoisonTurnReset(row.input) : row.input;
    expect({ body, calls, random }).toEqual(row.result);
  }
  for (const row of transfer.stat_cases) {
    const keys = ['weaponCrates', 'utilityCrates', 'healthCrates', 'donorCrates'];
    const stats = Object.fromEntries(keys.map(key => [key, row.count]));
    nativeRecordPickup(stats, row.category);
    expect(keys.map(key => stats[key])).toEqual(row.output);
  }
  for (const row of transfer.audio_cases)
    expect(nativeCratePickupAudio(row.kind, row.team, () => 1234)).toEqual(row.calls);
  for (const row of transfer.cases) {
    expect(nativePickupCategory(row.record.kind)).toBe(row.category);
    const memory=new Uint8Array(0x2c14),view=new DataView(memory.buffer);
    for(const team of [1,2])view.setInt32(team*0x51c+8,row.banks[team-1],true);
    row.recipient.forEach((count,slot)=>nativeInventorySet(memory,1,slot,count));
    row.donor.forEach((count,slot)=>nativeInventorySet(memory,2,slot,count));
    const stock=team=>Array.from({length:71},(_,slot)=>view.getInt32(0x1eb8+(slot+row.banks[team-1]*0x8e)*4,true));
    let hp = row.hp;
    nativeCrateTransfer(row.record, 1, 1, {
      inventory:memory,
      health: () => hp,
      setHealth: (team, worm, value) => { hp = value; },
    });
    expect({ hp, recipient: stock(1), donor: stock(2) }).toEqual(row.output);
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
  for (const row of textImages.cases) {
    const state = { ...row.initial };
    for (const step of row.sequence) {
      const calls = [];
      const host = Object.fromEntries(['fill', 'clear', 'horizontal', 'vertical', 'pixel', 'copy', 'mask', 'initialize']
        .map(name => [name, (...args) => calls.push([name, ...args])]));
      host.allocate = bytes => { calls.push(['allocate', bytes]); return 0x2003000; };
      host.text = (...args) => {
        calls.push(['text', ...args]);
        return { width: row.measurement[0], height: row.measurement[1] };
      };
      expect(nativeRenderTextImage(state, step.request, host)).toEqual(step.result);
      expect(calls).toEqual(step.calls);
      expect(state).toEqual(step.state);
    }
  }
  for (const row of crateDraw.cases) {
    const calls = [], queue = new NativeSpriteDrawQueue();
    nativeDrawCrate(row.body, row.scene, {
      position: () => { calls.push(['position']); return row.body; },
      submerged: () => { calls.push(['submerged']); return row.body.submerged; },
      special: id => { calls.push(['special', id]); return row.special; },
      palette: id => { calls.push(['palette', id]); return 0x2000 + id; },
      name: id => { calls.push(['name', id]); return `Weapon ${id}`; },
      format: value => { calls.push(['format', value]); return String(value); },
      raster: (...args) => {
        calls.push(['raster', ...args]);
        return { image: 0x5000 + args[0], width: args[1].length * 8, height: 16 };
      },
      image: (...args) => { calls.push(['image', ...args]); queue.image(...args); },
      sprite: (...args) => { calls.push(['sprite', ...args]); queue.draw(...args); },
    });
    expect(calls).toEqual(row.calls);
    const rendered = [];
    queue.flush({ x: 0, y: 0, z: 0, distance: 65536 },
      (...args) => rendered.push(['sprite', ...args]),
      (...args) => rendered.push(['image', ...args]));
    expect(rendered).toEqual(row.rendered);
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
  expect(crateSchemes.cases.map(row=>createNativeCrateScheme(row.resource_id,row.scene)))
    .toEqual(crateSchemes.cases.map(row=>({pool:row.pool,used:[],ammo:row.ammo})));
  for (const row of crateContentPool.schemes)
    expect(createNativeCrateScheme(row.resource_id,{tall:row.tall}).pool).toEqual(row.pool);
  for (const row of crateContentPool.cases)
    expect(nativeCrateContentPool(row.initial,row.scene,slot=>row.descriptors[slot])).toEqual(row.output);
  for (const row of nearestBody.cases) {
    const calls=[];
    expect(nativeNearestBody(row.bodies,row.x,row.y,row.flags,{
      type:body=>{calls.push(['type',body.id]);return body.type;},
      position:body=>{calls.push(['position',body.id]);return body;},
    })).toBe(row.result);
    expect(calls).toEqual(row.calls);
  }
  for (const row of [...crateSpawnSearch.cases,...crateShowerPlacement.cases,...crateShowerNearest.cases]) {
    let rng=row.seed; const calls=[];
    const host={
      random:()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;calls.push(['random',rng]);return rng;},
      collide:(...args)=>{
        calls.push(['collide',...args]); const [,x,y]=args;
        return row.terrain===1 || (row.terrain===2 && y>=row.floor*65536) ||
          (row.terrain===3 && (y>=row.floor*65536 || y<=-64*65536)) ||
          (row.terrain===4 && x<960*65536 && y>=row.floor*65536);
      },
      nearest:(...args)=>{calls.push(['nearest',...args]);return row.distance===-1?null:row.distance;},
    };
    if (row.bodies) {
      delete host.nearest;
      host.bodies=[null,...row.bodies];
      host.type=body=>{calls.push(['type',body.id]);return body.type;};
      host.position=body=>{calls.push(['position',body.id]);return body;};
    }
    if ('count' in row.result) {
      const result=nativeCrateShowerTick({count:5,timer:0,pool:[1,6,11],used:[]},{
        ...host,bottom:row.bottom,tall:row.tall,nextRandom:host.random,
        parent:(...args)=>{calls.push(['parent',...args]);return 0x1234;},
        busy:()=>calls.push(['busy']),ammo:slot=>slot+2,
        allocate:size=>{calls.push(['allocate',size]);return 0x2004000;},
        create:(allocation,parent,record,mode)=>calls.push(['create',parent,mode,record.x,record.y,record.kind,record.ammo,record.weapon]),
      });
      expect(result).toEqual(row.result);
    } else {
      const result=nativeCrateSpawnSearch(row.bottom,row.tall,row.grounded,true,host);
      expect({success:result.success,x:result.x,y:result.y}).toEqual(row.result);
    }
    expect(calls.length).toBe(row.call_count);
    expect(createHash('sha256').update(JSON.stringify(calls)).digest('hex')).toBe(row.calls_sha256);
  }
  for (const row of crateVisibility.cases)
    expect(nativeCrateContentsVisible(row.team,row.visible,row.controller,row.flags)).toBe(row.result);
  for (const row of crateVisibility.special)
    expect(nativeSpecialCrateContent(row.slot)).toBe(row.result);
  for (const row of automatic.cases) {
    const result = nativeAutomaticUtilities(row.input, row.available, row.bits);
    expect(result.body).toEqual(row.output);
    expect(row.counts.map((count, i) => result.cleared.includes(67 + i) ? 0 : count)).toEqual(row.after);
  }
  for (const row of [...shower.cases,...shower.schemes]) {
    const events = [];
    let busy = 0;
    const result = nativeCrateShowerTick(row.input, {
      parent: (...args) => { events.push(['parent', ...args]); return 0x1234; },
      busy: () => { events.push(['busy']); busy = 12; },
      place: (...args) => { events.push(['place', ...args]); return row.placement ? { x: 123 * 65536, y: -45 * 65536 } : null; },
      nextRandom: () => { events.push(['random']); return row.random; },
      ammo: row.input.ammo ? undefined : weapon => weapon + 2,
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
    "laser",
    "invisibility",
    "bridgekit",
  ]);
  expect(loadout.rope).toBe(Infinity);
  expect(loadout.jetpack).toBe(1);
  expect(loadout.freeze).toBe(1);
  expect(loadout.fastwalk).toBe(0);
  expect(loadout.lowgravity).toBe(0);
  expect(loadout.laser).toBe(1);
  expect(loadout.invisibility).toBe(1);
  expect(loadout.bridgekit).toBe(1);
  expect(loadout.doubledamage).toBe(0);
  expect(loadout.doubletime).toBe(0);
  expect(UTILITIES.teleport.label).toBe("Teleport");
  {
    const pool = Array(200).fill(null);
    let counter = 0, frame = 0, created = 0, burns = 0, hits = 0;
    const random = () => 32768;
    const spawn = record => {
      const result = nativeFlameBody(record, frame, counter, random);
      counter = result.nextCounter;
      const actor = { body: result.body, record: result.record };
      registerNativeFlame(pool, actor, frame, old => { pool[old.slot] = null; });
      created++;
    };
    spawn([0, 0, 524288, -524288, 0, 4, 1, 3000, 100, 5, 0]);
    const target = { type: 2, x: 30 * 65536, y: 19 * 65536 };
    for (; frame < 2000 && pool.some(Boolean); frame++) {
      for (const actor of [...pool]) {
        if (!actor || pool[actor.slot] !== actor) continue;
        const tick = stepNativeFlame(actor.body, actor.record,
          { frame, gravity: 0x3d70, wind: 0, water: 100 }, {
            collide: (x, y) => y >= 20,
            candidates: () => [target],
            logicRandom: random, visualRandom: random,
            parent: () => 23, allocate: () => true,
            flame: (allocation, parent, record) => spawn(record),
            hit: (victim, event, size, packet) => {
              expect(victim).toBe(target); expect(event).toBe(0x433);
              expect(packet[5]).toBe(1); hits++;
            },
            burn: () => burns++, busy: () => {}, camera: () => {},
            smoke: () => {}, sound: () => {}, delete: () => {},
          });
        actor.body = tick.body; actor.record = tick.record;
        if (tick.deleted) pool[actor.slot] = null;
        else {
          const art = nativeFlameArt(actor.body);
          actor.body = art.body;
          expect(Number.isFinite(art.request[5])).toBe(true);
        }
      }
    }
    expect(created).toBeGreaterThan(1);
    expect(burns).toBeGreaterThan(0);
    expect(hits).toBeGreaterThan(0);
    expect(pool.filter(Boolean)).toHaveLength(0);
  }
  for (const row of barrelArt.cases)
    expect(nativeBarrelArt(row.body, row.frame, row.rank)).toEqual(row.request);
  for (const row of barrelContacts.cases) {
    const calls = [];
    nativeBarrelContact(row, row.side, row.suppress, {
      sound: request => calls.push({ operation: "sound", request }),
      receive: side => { calls.push({ operation: "receive", side }); return row.accepted; },
      bounce: side => calls.push({ operation: "bounce", side }),
    });
    expect(calls).toEqual(row.calls);
  }
  for (const row of barrelBodies.cases) {
    const queries = [];
    const body = nativeBarrelBody(row.x, row.y, row.settle, row.water, row.friction, (x, y, b) => {
      const hit = b.flags === 2 ? row.reject : Number(row.floor !== null && y >= row.floor * 65536);
      queries.push([x, y, b.flags, hit]); return hit;
    });
    expect(body).toEqual(row.body);
    expect(queries).toEqual(row.queries);
  }
  for (const row of barrelTicks.cases) {
    const events = [];
    const result = nativeBarrelTick(row.input, row.bottom, {
      motion: body => { events.push(["motion"]); return body; },
      moving: body => body.moving,
      camera: request => events.push(["camera", ...request]),
      busy: () => events.push(["busy"]),
      visualRandom: () => { events.push(["random"]); return 6; },
      bubble: request => events.push(["bubble", ...request]),
      detonate: () => events.push(["detonate"]),
      delete: mode => events.push(["delete", mode]),
    });
    expect(result.body).toEqual(row.output);
    expect(events).toEqual(row.events);
    expect(result.deleted).toBe(row.events.some(event => event[0] === "delete"));
  }
  for (const row of barrelHits.cases) {
    const packet = [...row.packet];
    expect(nativeBarrelHit(row.input, row.event, packet)).toEqual(row.output);
    expect(packet[5]).toBe(row.report);
  }
  for (const row of barrelDetonation.cases) {
    const events = []; let ordinal = 0;
    nativeBarrelDetonation(row.x, row.y, {
      parent: (category, id) => { events.push(["parent", category, id]); return category; },
      blast: packet => events.push(["blast", ...packet]),
      allocate: size => { const accepted = (row.allocationMask >> ordinal++) & 1;
        events.push(["allocate", size, accepted]); return accepted; },
      flame: (allocation, parent, record) => events.push(["flame", parent, record]),
      sound: packet => events.push(["sound", ...packet]),
    });
    expect(events).toEqual(row.events);
  }
  for (const row of projectileFire.cases) {
    const events = [];
    nativeProjectileFire(row.input, row.x, row.y, {
      parent: (category, id) => { events.push(["parent", category, id]); return category; },
      allocate: size => { events.push(["allocate", size]); return row.accepted; },
      flame: (allocation, parent, record) => events.push(["flame", parent, record]),
      sound: request => events.push(["sound", ...request]),
    });
    expect(events).toEqual(row.events);
  }
  for (const row of flameEvents.cases) {
    const record = Array(11).fill(0); record[10] = row.input.persistent;
    expect(nativeFlameEvent(row.input, record, row.event)).toEqual(row.output);
  }
  for (const row of flameBlasts.cases)
    expect(nativeFlameBlast(row.input, row.packet, row.extent)).toEqual(row.output);
  for (const row of flameArt.cases) {
    const result = nativeFlameArt(row.input);
    expect(result.body).toEqual(row.output);
    expect([result.request]).toEqual(row.events);
  }
  for (const row of flameTicks.cases) {
    const events = [];
    const result = nativeFlameTick(row.input, row.record, row, {
      busy: () => events.push(['busy']),
      motion: body => { events.push(['motion']); return { body, result: row.moving }; },
      hit: body => { events.push(['hit']); return body; },
      spread: record => { events.push(['spread', [...record]]); record[0] = (record[0] + 65536) | 0; return record; },
      visualRandom: () => { events.push(['visual']); return 123456; },
      logicRandom: () => { events.push(['logic']); return 54321; },
      smoke: request => events.push(['smoke', request]),
      camera: request => events.push(['camera', ...request]),
      sound: request => events.push(['sound', ...request]),
      delete: flag => events.push(['delete', flag]),
      burn: (...args) => events.push(['burn', ...args]),
    });
    expect(result).toEqual({ body: row.output, record: row.outputRecord,
      deleted: row.events.some(event => event[0] === 'delete') });
    expect(events).toEqual(row.events);
  }
  for (const row of flameHits.cases) {
    const events = []; let visualIndex = 0;
    const result = nativeFlameHit(row.input, row.candidates, {
      hit: (target, ...args) => events.push(['hit', row.candidates.indexOf(target), ...args]),
      logicRandom: () => { events.push(['logic']); return 255; },
      visualRandom: () => { events.push(['visual']); return [0, 65535, 123456][visualIndex++]; },
      smoke: request => events.push(['smoke', request]),
      busy: () => events.push(['busy']),
    });
    expect(result).toEqual(row.output);
    expect(events).toEqual(row.events);
  }
  for (const row of flameSpread.spread) {
    const events = []; let probes = 0;
    const result = nativeFlameSpread(row.record, {
      parent: (...args) => { events.push(['parent', ...args]); return 23; },
      random: () => { events.push(['random']); return row.random; },
      collide: (...args) => { events.push(['probe', ...args]); return probes++ < row.clearance; },
      allocate: size => { events.push(['allocate', size, row.allocated]); return row.allocated; },
      flame: (allocation, parent, record) => events.push(['flame', parent, record]),
    });
    expect(result).toEqual(row.output);
    expect(events).toEqual(row.events);
  }
  for (const row of flameSpread.pool) {
    const pool = row.stamps.map((created, index) => index === row.hole ? null : { created, index });
    const events = [], body = {};
    expect(registerNativeFlame(pool, body, row.frame,
      (old, flag) => events.push(['delete', old.index, flag]))).toBe(row.slot);
    expect(body).toEqual({ slot: row.slot, created: row.created });
    expect(pool.flatMap((entry, i) => entry === body ? [i] : [])).toEqual(row.ownerSlots);
    expect(events).toEqual(row.events);
  }
  for (const row of flameMotion.cases) {
    const events = []; let randomIndex = 0;
    const result = nativeFlameMotion(row.input, {
      collide: (x, y) => { events.push(['probe', x, y]); return Number({
        clear: false, solid: true, floor: y >= 1, wall: x >= 2, ceiling: y <= -2,
      }[row.terrain]); },
      busy: () => events.push(['busy']),
      wind: () => { events.push(['wind']); return row.wind; },
      gravity: () => { events.push(['gravity']); return row.gravity; },
      random: () => { events.push(['random']); return row.randoms[randomIndex++]; },
    });
    expect(result).toEqual({ body: row.output, result: row.result });
    expect(events).toEqual(row.events);
  }
  for (const row of flameBodies.cases) {
    let randomIndex = 0;
    const result = nativeFlameBody(row.record, row.frame, row.counter,
      () => row.randoms[randomIndex++]);
    expect(result).toEqual({ body: row.output, record: row.copied, nextCounter: row.nextCounter });
    expect(randomIndex).toBe(2);
  }
  const sheepBlock = schemeWeapons.schemes.find(s => s.resource_id === 195).weapons[23].slice(11, 105);
  // The copied crate block precedes the later sheep scheme offset override.
  sheepBlock[25] = 0; sheepBlock[3] = 126; sheepBlock[4] = 0;
  expect(crateProjectile.block).toEqual(sheepBlock);
  for (const row of crateContents.cases) {
    const events = [];
    const result = nativeCrateContents({ x: 123456, y: -765432 }, row.weapon,
      row.allContents, row, {
        random: () => { events.push(['random']); return row.random; },
        parent: (...args) => { events.push(['parent', ...args]); return 25; },
        allocate: size => { events.push(['allocate', size, row.allocated]); return row.allocated; },
        projectile: (allocation, ...args) => events.push(['projectile', ...args]),
        sound: request => events.push(['sound', ...request]),
      });
    expect(events).toEqual(row.events);
    expect(result).toEqual({ pool: row.outputPool, used: row.outputUsed });
    const creation = row.events.find(event => event[0] === 'projectile');
    if (creation) {
      const payload = creation[3], projectile = {};
      expect(attachNativeProjectileBlock(projectile, 800, crateProjectile.block, payload)).toBe(true);
      expect(projectile.nativePayload).toEqual(payload);
      expect(projectile.nativeBody.x).toBe(payload[2]);
      expect(projectile.nativeBody.y).toBe(payload[3]);
      expect(projectile.nativeBody.vx).toBe(payload[4]);
      expect(projectile.nativeBody.vy).toBe(payload[5]);
      expect(projectile.nativeBody.mode).toBe(3);
      expect(projectile.nativeBody.facing).toBe(payload[4] < 0 ? -1 : 1);
      expect(projectile.nativeDetonation.damage).toBe(75);
      expect(projectile.nativeTimer.remaining).toBe(20000);
      expect(projectile.nativeRelease).toBeUndefined();
    }
  }
  for (const row of wormPickup.contacts) {
    const calls = [];
    const intercept = nativeWormPickupContact(row.input, row.otherType,
      (...args) => { calls.push(args); return row.query_result; });
    expect({ calls, intercept }).toEqual({ calls: row.calls, intercept: row.intercept });
  }
  for (const row of wormPickup.cases) {
    const calls = [];
    const body = nativeWormPickupTick(row.input, (...args) => { calls.push(args); return 0; });
    expect({ body, calls }).toEqual(row.result);
  }
  for (const row of wormPickup.events)
    expect({ body: nativeWormPickupEvent(row.input, row.record), calls: [] }).toEqual(row.result);
  for (const row of wormPickup.queries) {
    const calls = [];
    const value = nativeWormPickupQuery(row.input, (...args) => { calls.push(args); return row.query_result; });
    expect({ body: row.input, calls, value }).toEqual(row.result);
  }
  for (const row of crateHits.direct_cases) {
    expect(nativeCrateDirectHit(row.input)).toEqual(row.output);
    expect(row.packet_out).toEqual(row.packet);
  }
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
      flame: (allocation, parent, record) => events.push(['flame', parent, record]),
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

test("crate shower drops native supply crates", async ({ page }) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.setUtility(0, "crateshower", 1));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().utilities.crateshower))
    .toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().crates.length), {
      timeout: 30000,
    })
    .toBeGreaterThanOrEqual(5);
});

test("laser sight draws the native aim ray until it is toggled off", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="laser"]').click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().utilities.laser))
    .toBe(0);
  await expect.poll(() => page.evaluate(() => window.siege.getState().laserSight)).toBe(true);
  const line = page.locator(".laser-sight");
  await expect
    .poll(() => line.evaluate((el) => el.style.display))
    .toBe("");
  const lineState = await line.evaluate((el) => ({
    x1: Number(el.getAttribute("x1")), y1: Number(el.getAttribute("y1")),
    x2: Number(el.getAttribute("x2")), y2: Number(el.getAttribute("y2")),
    stroke: getComputedStyle(el).stroke,
  }));
  expect(Object.values(lineState).slice(0, 4).every(Number.isFinite)).toBe(true);
  expect(lineState.stroke).toBe("rgb(255, 75, 75)");
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="laser"]').click();
  await expect.poll(() => line.evaluate((el) => el.style.display)).toBe("none");
});

test("invisibility cloaks the active squad until the next turn", async ({ page }) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="invisibility"]').click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().invisibleTeam))
    .toBe(0);
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.utilities.invisibility).toBe(0);
  expect(state.worms.filter((worm) => worm.team === 0).every((worm) => worm.invisible)).toBe(true);
});

test("bridge kit spends its own inventory on native placement", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="bridgekit"]').click();
  const before = await page.evaluate(() => window.siege.getState());
  await page.evaluate(() => {
    const state = window.siege.getState(), worm = state.worms[state.current], camera = state.camera;
    const arena = document.querySelector("#arena"), box = arena.getBoundingClientRect();
    arena.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0,
      clientX: box.x + (worm.x + 80 - camera.x) / camera.w * box.width,
      clientY: box.y + (1 - (worm.y + 100 - camera.y) / camera.h) * box.height }));
  });
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.girders.length).toBeGreaterThan(0);
  expect(state.utilities.bridgekit).toBe(0);
  expect(state.phase).toBe("settle");
  expect(before.utilities.bridgekit).toBe(1);
});
