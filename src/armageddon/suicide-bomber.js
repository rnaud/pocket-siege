import { fixedMultiply } from "./numeric.js";

// Suicide Bomber (weapon kind 4, subtype 5): the 004FCB20 launch puts the
// worm in state 0x75. Positions are native 16.16, y down.

// 004F7BE0, entering state 0x75: the wkambmr animation (sprite 0x8E).
export function nativeSuicideBomberStart() {
  return [{ operation: "clear" }, { operation: "queue", sprite: 0x8e }];
}

// 004F7C10, one state 0x75 frame. Until the animation reaches 1.0 nothing
// happens. Then twenty gas clouds (004D37D0) are placed within ±8 px with the
// logic random stream, carrying weapon +0x70 poison; the worm force-takes its
// health (004D8440), says farewell unless its team is marked, explodes with
// {1, x, y, 100, weapon +0x74, 1}, enters 0x89 and its task is deleted.
// `create(x, y, amount)` builds each cloud as it is placed, since the
// constructor draws from the same random stream. Returns 1 while waiting.
export function nativeSuicideBomberTick(record, worm, random, create) {
  if (worm.progress < 0x10000) return { result: 1, calls: [] };
  const calls = [];
  for (let i = 0; i < 20; i++) {
    const dx = (((random() >>> 0) & 0xffff) - 0x8000) | 0;
    const dy = (((random() >>> 0) & 0xffff) - 0x8000) | 0;
    const request = [(worm.x + dx * 16) | 0, (worm.y + dy * 16) | 0, record["0x70"] | 0];
    calls.push({ operation: "gas", request });
    create?.(...request);
  }
  if (worm.health) calls.push({ operation: "accounting", request: [worm.health, 1, 1] });
  if (!worm.marked) calls.push({ operation: "announcement" });
  calls.push(
    { operation: "blast", packet: [1, worm.x | 0, worm.y | 0, 100, record["0x74"] | 0, 1] },
    { operation: "state", state: 0x89 },
    { operation: "delete", value: 1 },
  );
  return { result: 0, calls };
}

// 004D37D0: a poison gas cloud (task type 0x19) with a lifetime speed of
// a draw order from the frame counter, the
// gassgrn sprite and a poison radius growing from 1 to 23 px (+12).
// The speed is 0x3D7 + (rand & 0xFFFF) / 200: about 20 to 25 seconds.
export function nativeGasCloud(x, y, amount, random, frame) {
  return {
    x: x | 0, y: y | 0, vx: 0, vy: 0, progress: 0,
    speed: (Math.floor(((random() >>> 0) & 0xffff) / 200) + 0x3d7) | 0,
    sprite: 0x1000344, minRadius: 1, maxRadius: 0x17,
    order: ((frame & 0x3ff) + 0x70000) | 0,
    damping: 0xf333, lift: -0x2666, amount: amount | 0,
  };
}

// 004D3AB0 event 0x3EA: move, rise, drift with the wind plus half a random
// jitter, damp, and age; at 1.0 the cloud is deleted. Every eleventh scene
// frame 004D39D0 sends 0x439 {amount} to each registry object of types 2..5
// within the Manhattan radius (pixels). Clouds keep the scene busy (50).
// `targets` are {type, x, y} in registry order.
export function nativeGasCloudTick(input, { wind, frame, random, targets = [] }) {
  const body = { ...input }, calls = [];
  body.x = (body.x + body.vx) | 0;
  body.y = (body.y + body.vy) | 0;
  body.vy = (body.vy + body.lift) | 0;
  const jx = (wind + ((random() >>> 0) & 0xffff) - 0x8000) | 0;
  const jy = (((random() >>> 0) & 0xffff) - 0x8000) | 0;
  body.vx = fixedMultiply((body.vx + Math.trunc(jx / 2)) | 0, body.damping);
  body.vy = fixedMultiply((body.vy + Math.trunc(jy / 2)) | 0, body.damping);
  body.progress = (body.progress + body.speed) | 0;
  if ((body.progress & 0xffff0000) >= 0x10000) {
    calls.push({ operation: "delete", value: 1 });
    return { body, calls, busy: 0 };
  }
  if ((frame | 0) % 11 === 0) {
    const radius = (((Math.imul(body.maxRadius - body.minRadius, body.progress) >> 16) + body.minRadius) | 0) + 12;
    targets.forEach((target, index) => {
      if (!((1 << (target.type & 31)) & 0x3c)) return;
      const distance = Math.abs(((body.x - target.x) | 0) >> 16) + Math.abs(((body.y - target.y) | 0) >> 16);
      if (distance <= radius) calls.push({ operation: "poison", target: index, event: 0x439, amount: body.amount });
    });
  }
  return { body, calls, busy: 50 };
}

// 004D3AB0 event 0x3EB: the sprite request (order, x, y, 0, sprite, progress).
export function nativeGasCloudDraw(body) {
  return [body.order, body.x, body.y, 0, body.sprite, body.progress];
}
