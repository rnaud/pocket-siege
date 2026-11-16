import { nativeWaterSound, enqueueNativeSound } from "./water-audio.js";
import records from "./scheme-weapon-data.json" with { type: "json" };
import { WEAPON_SLOTS } from "./delays.js";
import {
  nativeProjectileSelection,
  nativeProjectileBody,
} from "./projectile-body.js";
import { nativeLaunchVelocity } from "./power.js";
import { nativeSin, nativeCos } from "./trig.js";
import {
  nativeSimpleBodyTick,
  nativeSimpleBounce,
  nativeBodyAwake,
} from "./motion.js";
const fixed = (value) => Math.round(value * 65536) | 0;
const kinds = new Set([
  "rocket",
  "homing",
  "mortar",
  "grenade",
  "cluster",
  "holy",
]);
// Resource 195 is the native loader's default scheme (00470A20). Browser
// presets remain modifiers around this baseline until scheme UI is ported.
const baseline = records.schemes.find((s) => s.resource_id === 195).weapons;
const cache = new Map();
function weaponRecord(kind) {
  if (!kinds.has(kind)) return null;
  if (!cache.has(kind))
    cache.set(
      kind,
      Object.fromEntries(
        baseline[WEAPON_SLOTS[kind]].map((v, i) => [
          "0x" + (0x48 + i * 4).toString(16),
          v,
        ]),
      ),
    );
  return cache.get(kind);
}
export function nativeProjectileLaunch(kind, angle, power) {
  const record = weaponRecord(kind);
  if (!record) return null;
  const turn = Math.round((angle * 65536) / 360);
  const [vx, vy] = nativeLaunchVelocity(
    record,
    nativeCos(turn),
    -nativeSin(turn),
    fixed(Math.max(0, Math.min(100, power)) / 100),
  );
  return { vx: (vx / 65536) * 50, vy: (-vy / 65536) * 50 };
}
export function attachNativeProjectile(p, height) {
  const record = weaponRecord(p.kind);
  if (!record) return false;
  const block = Array.from(
    { length: 94 },
    (_, i) => record["0x" + (0x74 + i * 4).toString(16)],
  );
  const payload = {
    owner: p.owner ?? 0,
    x: fixed(p.x),
    y: fixed(height - p.y),
    vx: fixed(p.vx / 50),
    vy: fixed(-p.vy / 50),
    repeat: 0,
    timer: Math.round(p.fuse * 50),
    bounce: Math.round(p.bounce * 100),
  };
  const selected = nativeProjectileSelection(block, payload);
  p.nativeBody = nativeProjectileBody(
    {
      restitutionY: 0,
      tangent: Math.trunc((96 * 65536) / 100),
      radius: 0x100000,
      waterDrag: 0xcccc,
      skimScale: 65536,
      angle: 0,
      angularVelocity: 0,
      suspended: 0,
      submerged: 0,
      contact: 0,
      moving: 0,
    },
    selected.config,
    payload,
    96,
  );
  return true;
}
export function stepNativeProjectile(
  p,
  {
    height,
    waterLevel,
    wind = 0,
    gravityScale = 1,
    frame = 0,
    bounces = false,
  },
  collide,
) {
  const sounds = [];
  const waterSound = (body, skim) => {
    const event = nativeWaterSound(body, skim);
    body.splashSuppress = event.suppress;
    if (event.sound) enqueueNativeSound(sounds, event.sound);
  };
  let firstHit = 0,
    contacts = 0;
  const body = {
    ...p.nativeBody,
    x: fixed(p.x),
    y: fixed(height - p.y),
    vx: fixed(p.vx / 50),
    vy: fixed(-p.vy / 50),
  };
  p.nativeBody = nativeSimpleBodyTick(
    body,
    {
      frame,
      index: 0,
      waterY: Math.floor(height - waterLevel),
      gravity: Math.round(0x3d70 * gravityScale),
      wind: fixed(wind / 2500),
    },
    {
      awake: nativeBodyAwake,
      skim: (body) => waterSound(body, true),
      waterChanged: (body) => waterSound(body, false),
      collide: (x, y) => collide(x / 65536, height - y / 65536),
      bounce: (body, hit, side) => {
        firstHit ||= hit;
        contacts++;
        if (bounces)
          Object.assign(
            body,
            nativeSimpleBounce(body, { vx: 0, vy: 0 }, side).body,
          );
        else {
          body.vx = 0;
          body.vy = 0;
        }
      },
    },
  );
  p.x = p.nativeBody.x / 65536;
  p.y = height - p.nativeBody.y / 65536;
  p.vx = (p.nativeBody.vx / 65536) * 50;
  p.vy = (-p.nativeBody.vy / 65536) * 50;
  return { hit: firstHit, contacts, sounds };
}
