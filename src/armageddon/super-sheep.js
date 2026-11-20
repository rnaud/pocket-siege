import { nativeSin, nativeCos } from "./trig.js";
import { fixedMultiply, fixedDivide } from "./numeric.js";
import { nativeWalkPosition } from "./walking-motion.js";
import { nativeDirectionTurn } from "./direction.js";

// Mode3 unit routines of the projectile actor (vtable00527090) shared by
// Sheep (slot23), Super Sheep (slot24) and Aqua Sheep (slot25). A record with
// a nonzero flight sprite (actor+0x36C, record0x118) can take off.
//
// Body fields mirror the native actor (16.16 fixed point, Y down):
//   x,y 0x90/0x94  vx,vy 0x9C/0xA0  spin 0xA4  flags 0x40  state 0x50
//   suspended 0x54  impulseScale 0x58  rest 0xB8  depth 0xB0  submerged 0xBC
//   contactX/Y 0xC0/0xC4  soundHandle 0xF4  team/worm 0x130/0x134
//   baseFlags 0x2D4  fireMode 0x32C  mode 0x330  walkFlags 0x334
//   flightFlags 0x338  walkSpeed 0x33C  climb 0x340  fallAngle/Speed/Sound
//   0x344..0x34C  hopAngle/Speed/Sound 0x350..0x358  flightSprite(2) 0x36C/0x370
//   releaseSound 0x374  flightLoop 0x378  timer 0x37C  firstFrame 0x388
//   inWater 0x38C  lastSound 0x390  phase 0x394 (0 walk, 1 flight, 2 grounded
//   again)  angle 0x398  direction 0x3C8  loopHandle 0x3D8  rotation 0x3DC.
//
// Host interface (all calls are also returned, in native order, in `calls`):
//   collide(x, y, flags) -> truthy: scene 0x7D4 vtable+0xC occupancy probe
//   random() -> uint32: 004EE960 logic RNG (host advances its own state)
//   visualRandom() -> uint32: 004EE930 cosmetic RNG
//   wormState(team, worm): 004C2D60
//   startLoop(request) -> handle: 004EDB90
//   waterY: scene 0x804 (pixels), frame: scene 0x7F0 completed frames.
// Output operations: event [20,0,id,0x124,team] (004B26A0), sound (004EDC90),
// loop (004EDB90), stopSound (004EDC30), particle (004EE7F0, 12 args),
// waterEntry (004F4FE0), probe, wormState and bubbles (scene0x1B8C0 = 50).

export const SHEEP_FIRE_EVENT = 0x414;
export const SHEEP_LEFT_EVENT = 0x415;
export const SHEEP_RIGHT_EVENT = 0x416;
export const SUPER_SHEEP_TURN = 0x5b0; // per0x415/0x416 event, 16-bit turns (8 degrees)
export const SUPER_SHEEP_AIR_SPEED = 8; // pixels per frame
export const SUPER_SHEEP_WATER_SPEED = 4;
const LOSE_FLIGHT_IN_WATER = 0x400000;
const SMOKE_SPRITE = 0x2a6; // kamismk
const LAUNCH_HOP_ANGLE = 0x1c71; // 40 degrees

function context(input, host) {
  const body = { ...input }, calls = [];
  const call = (operation, request, extra = {}) => { calls.push({ operation, request, ...extra }); };
  const probe = (x, y) => {
    const hit = host.collide(x, y, body.flags) ? 1 : 0;
    call("probe", [x, y, body.flags], { result: hit });
    return hit;
  };
  const tryMove = (x, y) => {
    if (probe(x, y)) return 0;
    body.x = x; body.y = y; body.rest = 0;
    return 1;
  };
  const event = (id) => call("event", [20, 0, id, 0x124, body.team]);
  const startLoop = (request) => {
    const result = host.startLoop(request);
    call("loop", request, { result });
    return result;
  };
  const stopSound = (handle) => call("stopSound", [handle]);
  // 004F4CB0: velocity impulse divided by mass; ignored while suspended.
  const impulse = (dx, dy, spin) => {
    if (body.suspended) return 0;
    body.vx = (body.vx + fixedDivide(dx, body.impulseScale)) | 0;
    body.vy = (body.vy + fixedDivide(dy, body.impulseScale)) | 0;
    body.spin = (body.spin + spin) | 0;
    return 1;
  };
  // 004F4260: one tracked unit voice at actor+0xF4.
  const voice = (id) => {
    if (body.soundHandle) stopSound(body.soundHandle);
    body.soundHandle = startLoop([id, 0, 0x10000, 0x10000, 0]);
  };
  return { body, calls, call, probe, tryMove, event, startLoop, stopSound, impulse, voice };
}

// 004E4090: release the flight. Velocity is cleared and physics suspended;
// the flight routine then owns all motion.
function takeOff(c) {
  const { body } = c;
  body.vx = 0; body.vy = 0;
  body.angle = 0; body.rotation = 0; body.phase = 1;
  body.suspended = 1;
  if (body.team) c.event(0x437); // controller enables steering keys
  if (body.releaseSound) c.call("sound", [body.releaseSound, 5, 0x10000, 0x10000, 0]);
  if (body.flightLoop) {
    if (body.loopHandle) { c.stopSound(body.loopHandle); body.loopHandle = 0; }
    body.loopHandle = c.startLoop([body.flightLoop, 4, 0x10000, 0x10000, 0]);
  }
  body.flags = body.flightFlags | body.baseFlags;
}

// 004E4170: flight ends; the unit falls with a third of its velocity and
// resumes the ground routine facing the side its heading pointed to.
function loseFlight(c) {
  const { body } = c;
  body.vx = Math.trunc(body.vx / 3); body.vy = Math.trunc(body.vy / 3);
  body.phase = 2;
  body.suspended = 0;
  body.direction = (body.angle & 0xffff) < 0x8000 ? 1 : -1;
  if (body.team) c.event(0x438); // controller disables steering keys
  if (body.flightLoop && body.loopHandle) { c.stopSound(body.loopHandle); body.loopHandle = 0; }
  body.flags = body.baseFlags | body.walkFlags;
}

export function nativeSuperSheepTakeOff(input, host) {
  const c = context(input, host); takeOff(c); return { body: c.body, calls: c.calls };
}
export function nativeSuperSheepLoseFlight(input, host) {
  const c = context(input, host); loseFlight(c); return { body: c.body, calls: c.calls };
}

// 004E44A0 events0x414..0x416 for a mode3 actor. `team` is payload word0.
// 0x414 comes from the owning controller's fire key (00501FF0, enabled by
// event0x43A while fireMode is set); 0x415/0x416 are left/right keys polled
// every frame while event0x437 enabled steering.
export function nativeSheepEvent(input, eventId, team, host) {
  const c = context(input, host), { body } = c;
  const done = () => ({ body, calls: c.calls });
  if (eventId === SHEEP_LEFT_EVENT || eventId === SHEEP_RIGHT_EVENT) {
    if (team === body.team && body.phase === 1)
      body.angle = (body.angle + (eventId === SHEEP_RIGHT_EVENT ? SUPER_SHEEP_TURN : -SUPER_SHEEP_TURN)) | 0;
    return done();
  }
  if (eventId !== SHEEP_FIRE_EVENT || team !== body.team || body.submerged) return done();
  if (body.mode === 3 && body.flightSprite) {
    if (body.phase === 0) { takeOff(c); return done(); }
    if (body.phase === 1 && host.waterY > body.y >> 16) { loseFlight(c); return done(); }
  }
  if (body.fireMode === 1) body.state = 1;
  else if (body.fireMode === 2) {
    body.field314 = 0; body.fireMode = 0;
    body.timer = ((host.random() & 0xffff) % 500) | 0;
  }
  return done();
}

// 004E3E40: one flight frame. Heading 0 points up; positive turns clockwise.
export function nativeSuperSheepFlight(input, host) {
  const c = context(input, host), { body } = c;
  let x = body.x, y = body.y;
  const scale = host.waterY > y >> 16 ? SUPER_SHEEP_AIR_SPEED : SUPER_SHEEP_WATER_SPEED;
  const vx = Math.imul(nativeSin(body.angle), scale);
  const vy = -Math.imul(nativeCos(body.angle), scale) | 0;
  body.vx = vx; body.vy = vy;
  x = (x + vx) | 0; y = (y + vy) | 0;
  // Terrain or any object accepted by the flight mask ends the flight here.
  if (!c.tryMove(x, y)) body.state = 1;
  if (host.waterY <= y >> 16) {
    if (body.flags & LOSE_FLIGHT_IN_WATER) loseFlight(c);
    else if (!body.inWater) {
      c.call("waterEntry", []); // 004E2220 -> 004F4FE0 while inWater is clear
      body.inWater = 1;
      if (body.flightLoop) {
        if (body.loopHandle) { c.stopSound(body.loopHandle); body.loopHandle = 0; }
        body.loopHandle = c.startLoop([0x10020, 4, 0x10000, 0x10000, 0]);
      }
    }
  } else {
    if (body.inWater && body.flightLoop) {
      if (body.loopHandle) { c.stopSound(body.loopHandle); body.loopHandle = 0; }
      body.loopHandle = c.startLoop([body.flightLoop, 4, 0x10000, 0x10000, 0]);
    }
    body.inWater = 0;
  }
  c.call("event", [20, 0, 0x3f8, 0x124, 1]);
  if (host.waterY <= y >> 16) {
    c.call("bubbles", [50]);
    return { body, calls: c.calls };
  }
  const r1 = host.visualRandom(), r2 = host.visualRandom(), r3 = host.visualRandom(), r4 = host.visualRandom();
  c.call("particle", [0x80000, (x + (r4 & 0xffff) * 4) | 0, (y + (r3 & 0xffff) * 4) | 0, 0,
    (r2 & 0xffff) - 0x8000, (r1 & 0xffff) - 0x8000, 0, 0, SMOKE_SPRITE, 0, 0x10000, 0x51e]);
  return { body, calls: c.calls };
}

// Shared hop: angle in degrees from vertical, speed percent of 5..7 px/frame.
function hop(c, host, degrees, percent, sound) {
  const { body } = c;
  const speed = Math.floor((Math.imul(((host.random() & 0xffff) * 2 + 0x50000) | 0, percent) >>> 0) / 100);
  const angle = Math.trunc((degrees << 16) / 360);
  const dx = fixedMultiply(nativeSin(angle), speed), dy = fixedMultiply(nativeCos(angle), speed);
  c.impulse(Math.imul(body.direction, dx), -dy | 0, 0);
  if (sound && ((host.frame - body.lastSound) | 0) > 25) {
    c.voice(sound);
    body.lastSound = host.frame;
  }
}

// 004E3920: ground frame for every mode3 unit (Sheep family) outside flight.
export function nativeSheepWalk(input, host) {
  const c = context(input, host), { body } = c;
  const done = () => ({ body, calls: c.calls });
  if (body.firstFrame && body.team) {
    const state = host.wormState(body.team, body.worm);
    c.call("wormState", [body.team, body.worm]);
    if (state === 0x79) {
      // Release hop while the owner is still in its firing state.
      const speed = Math.floor((0x7d0000 + 50 * (host.random() & 0xffff)) / 100);
      const dx = fixedMultiply(nativeSin(LAUNCH_HOP_ANGLE), speed);
      const dy = fixedMultiply(nativeCos(LAUNCH_HOP_ANGLE), speed);
      c.impulse(Math.imul(body.direction, dx), -dy | 0, 0);
      return done();
    }
  }
  if (body.depth || body.submerged) return done();
  if (body.vx || body.vy || body.submerged || body.contactX || body.contactY) return done();
  let x = body.x, y = body.y;
  const oldY = y;
  const dx = Math.imul(Math.trunc((body.walkSpeed << 17) / 100), body.direction);
  const walk = nativeWalkPosition(x, y, dx, body.climb, (px, py) => c.probe(px, py));
  const result = walk.result;
  x = walk.x; y = walk.y;
  if (result !== 0) c.tryMove(x, y);
  let blocked = 0;
  if (result === -1) {
    if (body.fallAngle < 0) { body.state = 1; return done(); }
    if (body.fallAngle > 0 && body.hopAngle !== 1) {
      hop(c, host, body.fallAngle, body.fallSpeed, body.fallSound);
      return done();
    }
    if (body.hopAngle >= 0) blocked = 1;
  }
  if (result === 0) {
    if (body.hopAngle >= 0) body.direction = -body.direction | 0;
    blocked = 1;
  }
  if (y >> 16 >= host.waterY) { y = ((host.waterY - 1) << 16) | 0; blocked = 1; }
  if (body.hopAngle > 0) {
    if (Math.abs((y - oldY) | 0) >= 0x40000) blocked = 1;
    if (!c.tryMove((x + (Math.imul(15, body.direction) << 18)) | 0, (y - 0x80000) | 0) ||
        !c.tryMove((x + (Math.imul(15, body.direction) << 17)) | 0, y)) blocked = 1;
    if (blocked && !c.tryMove(x, (y - 0x300000) | 0)) blocked = 0;
  }
  // Probes above may have moved the body; restore with the terrain-only mask.
  const flags = body.flags;
  body.flags = 2;
  c.tryMove(x, y);
  body.flags = flags;
  if (blocked && body.hopAngle) {
    if (body.hopAngle < 0) { body.state = 1; return done(); }
    hop(c, host, body.hopAngle, body.hopSpeed, body.hopSound);
  }
  return done();
}

// 004E48B8..004E48F4: mode3 frame dispatch after the shared body update.
export function nativeSheepFrame(input, host) {
  return input.phase === 1 ? nativeSuperSheepFlight(input, host) : nativeSheepWalk(input, host);
}

// 004AAFD0 water-bank remaps reached by mode3 sheep sprites (sheepwlk ->
// water/sheep, aquashp1/2 -> water/aquashp1/2). Super Sheep spsheep1/2 have
// no water variant and pass through unchanged.
const WATER_SPRITES = { 626: 705, 634: 748, 635: 749 };
export const nativeSheepWaterSprite = (id) =>
  ((id & 0xffff0000) | (WATER_SPRITES[id & 0xffff] ?? (id & 0xffff))) | 0;

// 004E27F0 (event0x3EB) mode3 branches 004E2958..004E2A70. `layer` is the
// native esi value (0x50000 + 2 * presentation slot depth); the draw request is
// [layer + 1, x, y, 0, sprite, frameOrRotation]. Returns null for walking
// phases above water, which use the shared projectile art (004E2A7D adds the
// record's -10 px draw offset before 004E2A95).
export function nativeSheepDraw(input, frame, waterY, layer) {
  const body = { ...input };
  if (body.submerged) {
    let sprite = nativeSheepWaterSprite(body.sprite);
    if (body.direction < 0) sprite |= 0x40000;
    return { body, draw: [layer + 1, body.x, body.y, 0, sprite, Math.trunc((frame << 16) / 50)] };
  }
  if (body.mode !== 3 || body.phase !== 1) return { body, draw: null };
  // 0049C030 leaves the 16-bit heading zero-extended in eax.
  if (body.vx || body.vy) body.rotation = nativeDirectionTurn(body.vx, -body.vy | 0) & 0xffff;
  let sprite = Math.trunc(frame / 5) & 1 ? body.flightSprite : body.flightSprite2;
  if (waterY <= body.y >> 16) sprite = nativeSheepWaterSprite(sprite);
  return { body, draw: [layer + 1, body.x, body.y, 0, sprite, body.rotation] };
}
