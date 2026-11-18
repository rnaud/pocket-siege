import { nativeSurfaceSlope } from "./surface-slope.js";
import { nativeSlopeTurn } from "./direction.js";
import schemes from "./scheme-runtime-data.json" with { type: "json" };
export const NATIVE_MINE_FRICTION = schemes.schemes.find(
  (s) => s.resource_id === 195,
).bytes[0x11ba0 - schemes.context_offset];

// Shared numeric fields from004F4000(context,type,shape).
export function nativeBodyBase(friction, type, shape) {
  return {
    type,
    state: 0,
    shape,
    complex: 0,
    mass: 65536,
    impulseScale: 65536,
    accumulated: 0,
    enabled: 0,
    suspended: 0,
    sleeping: 0,
    submerged: 0,
    contact: 0,
    moving: 0,
    x: 0,
    y: -0x4000000,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    radius: 0x100000,
    flags: 0,
    gravityScale: 65536,
    windScale: 0,
    drag: 65536,
    skimScale: 65536,
    waterDrag: 0xcccc,
    restitutionX: 0,
    restitutionY: 0,
    tangent: Math.trunc(((friction & 255) << 16) / 100),
  };
}
export const nativeMineBase = friction => nativeBodyBase(friction, 10, 2);
//004E9512..004E96B4: placement uses only terrain mask2. Rejection retains
// the base sentinel position; the original constructor does not delete it.
export function nativeMineBody(base, payload, arm, friction, collide) {
  const body = { ...base, flags: 2 };
  if (!collide(payload.x, payload.y, body)) {
    body.x = payload.x;
    body.y = payload.y;
    body.sleeping = 0;
  }
  const sum = (payload.x + payload.y) | 0;
  body.vx = payload.vx;
  body.vy = payload.vy;
  body.flags = 0x421846;
  body.tangent = 0;
  body.mass = 65536;
  body.complex = 0;
  body.enabled = 1;
  body.waterDrag = 0xcccc + Math.trunc((Math.trunc(sum / 256) & 65535) / 20);
  body.restitutionX = body.restitutionY = 0x9999;
  if (arm <= 0) {
    body.tangent = Math.trunc(((friction & 255) << 16) / 100);
    body.complex = 1;
  }
  return body;
}

//004E96B4..004E9746. Probe one pixel below the requested spawn, not the
// current body location: rejected initial placement retains the base sentinel.
// Surface slope is queried at the first blocked/water-bound coordinate.
export function nativeSettleMineBody(previous,payload,water,collide,slope=(x,y,limit,body)=>nativeSurfaceSlope(body,x,y,limit,collide)) {
  const body={...previous};
  const x=payload.x|0;let y=(payload.y+65536)|0;
  while((y>>16)<water) {
    if(collide(x,y,body))break;
    body.x=x;body.y=y;body.sleeping=0;y=(y+65536)|0;
  }
  const value=slope(x,y,4,body);
  if(value!==null)body.angle=nativeSlopeTurn(value)&65535;
  return body;
}
