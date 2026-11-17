import { nativeAxeTick } from "./axe.js";
import { nativeWormBubbles } from "./worm-water.js";
import { nativeRecoveryEntry, nativeRecoveryTick } from "./recovery.js";
import { nativeBodyRotation } from "./motion.js";
import { nativeHurtEntry } from "./hurt-entry.js";
import { nativeDeathCue, nativeDeathEntry } from "./death-cue.js";
import { nativeWalkingTick, nativeWalkingSprite } from "./walking-art.js";
import { H } from "../physics.js";
import { nativeFlightSprite, nativeFlightProgress } from "./flight-art.js";
import { nativeJetpackInitialFuel, nativeJetpackInput, nativeJetpackTick } from "./jetpack.js";
import { fixedDivide } from "./numeric.js";
import {
  nativeTeleportTick,
  nativeTeleportRenderProgress,
} from "./teleport.js";
import {
  nativeWormJumpLandingEntry,
  nativeWormJumpLandingTick,
} from "./worm-state.js";
import {
  NativeAnimationPlayer,
  animationMetadata,
  nativeSpriteFrame,
} from "./animation.js";
import { nativeWeaponAnimation } from "./weapon-animation.js";
import { nativeWeaponEquip } from "./equip.js";
import { nativePostFire, nativeRecoilTick } from "./recoil.js";
import { nativePreparation, nativePreparationTick } from "./preparation.js";
import weaponFields from "./weapon-art-fields.json";
import { WEAPON_SLOTS } from "./delays.js";
import { nativeRopeAnimation } from "./rope-animation.js";
import { nativeFreezeAnimation } from "./freeze.js";
import spriteIds from "./sprite-ids.json";
import waterSpriteIds from "./water-sprite-ids.json";
import * as THREE from "three";
import { decodeSprite, spriteFrameRGBA } from "./sprite.js";

const spriteIdByName = new Map(
  Object.entries(spriteIds.sprites).map(([id, sprite]) => [sprite.name, +id]),
);
const freezeEntry = spriteIds.sprites[0x23c].name;
const freezeIdle = spriteIds.sprites[0x248].name;
const weaponSprites = Object.fromEntries(
  Object.entries(WEAPON_SLOTS).map(([kind, id]) => [
    kind,
    nativeWeaponAnimation(weaponFields[id]),
  ]),
);
const names = [
  ...new Set([
    ...["r", "b", "g", "y", "p", "c"].flatMap((color) => [
      `marker${color}`,
      `crshair${color}`,
      `arrowdn${color}`,
      `arrowsd${color}`,
      `spangle${color}`,
    ]),
    ...[1, 2, 3, 4, 5, 6].map((style) => `grave${style}`),
    "circle25",
    "circle50",
    "circle75",
    "circl100",
    "elipse25",
    "elipse50",
    "elipse75",
    "elips100",
    "shotcase",
    "uzicase",
    "shothit",
    "basehit", "firehit", "kamismk", "wpncup", "wpnctop", "wpncbak", "wpnclnk", "wfirbl1", "wfirbl2", "fireball",
    "wormhit1",
    "wormhit2",
    "uzihit",
    "smklt25",
    "smklt50",
    "smklt75",
    "smklt100",
    "smkdrk20",
    "smkdrk30",
    "smkdrk40",
    "blob",
    "missile",
    "mortar",
    "hmissil1",
    "pigeonr0", "pigeonr1", "pigeonr2", "pigeonr3",
    "hmissil2",
    "bullet", "feather", "mexhaust",
    "grenade",
    "cluster",
    "banana",
    "hgrenade",
    "hexhaust",
    "skdsmoke",
    "exfoom",
    "expow",
    "expoot",
    "exbiff",
    "wcrate0",
    "wcrate1",
    "wcrate2",
    "mcrate0",
    "mcrate1",
    "mcrate2",
    "ucrate0",
    "ucrate1",
    "ucrate2",
    "mineoff",
    "mineon",
    "oildrum1",
    "flame1",
    ...Array.from({ length: 10 }, (_, i) => spriteIds.sprites[0x2f9 + i].name),
    spriteIds.sprites[626].name,
    "dynamite",
    "airmisl",
    "airjetg",
    "postbox",
    "letter1",
    "clustlet",
    "petrolbm",
    ...Object.values(weaponSprites)
      .filter(Boolean)
      .map((id) => spriteIds.sprites[id].name),
    ...Object.values(WEAPON_SLOTS).flatMap((id) =>
      nativeWeaponEquip(weaponFields[id], 0x65, 0x8000, id)
        .calls.filter((call) => call.operation === "queue" && call.sprite_id)
        .map((call) => spriteIds.sprites[call.sprite_id].name),
    ),
    ...Object.values(WEAPON_SLOTS).flatMap((id) =>
      nativePostFire(weaponFields[id], 0x8000)
        .calls.filter((call) => call.operation === "queue")
        .map((call) => spriteIds.sprites[call.sprite_id].name),
    ),
    freezeEntry,
    spriteIds.sprites[0x242].name,
    freezeIdle,
    "wbrth1",
    "wblink1",
    "wwalk",
    "wwalku",
    "wwalkd",
    "wjump",
    "wflyup",
    "wflylnk",
    "wflydn",
    "wbackflp",
    "wfall",
    "wland1",
    "wland2",
    spriteIds.sprites[0x82].name,
    spriteIds.sprites[0x1aa].name,
    "wsldlk1",
    "wsldlk2",
    "wtwang",
    "wroll",
    "wslide",
    "wfly1",
    "wfly2",
    "wfly3",
    "wwinner",
    "wdie",
    "wbaz",
    "wshotg",
    "wprod",
    "waxelk2", "waxeswn", "waxebak", "wdrill", "wbloww",
    "wshotf",
    "wshotp",
    "wparacht",
    "wparalnk",
    "wteldsv",
    "wbatrope",
    "wbungee",
    "ropecuff",
    "ropetip",
    "wjetfly1",
    "wjetfly2",
    "wjetfly3",
    "wjetfly4",
    "wjetflmb",
    "wjetflmd",
  ]),
];
const animations = new Map();
async function loadSpriteBytes(name, url) {
  let failure;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, attempt ? { cache: "reload" } : undefined);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.arrayBuffer();
    } catch (error) {
      failure = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
  throw new Error(`Cannot load ${name}: ${failure.message}`);
}
export async function loadOriginalArt() {
  const pending = [...names, ...Object.values(waterSpriteIds.sprites).map(
    ({ name }) => `water/${name}`,
  )];
  let cursor = 0, failed = false;
  // Keep the hundreds of original sprite requests from flooding the browser
  // and CDN. One transient response must not permanently reject game boot.
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (!failed && cursor < pending.length) {
      const name = pending[cursor++];
      try {
        const url = `${import.meta.env.BASE_URL}armageddon/${name.startsWith("water/") ? `media/water/blue/water/${name.slice(6)}` : `sprites/${name}`}.spr`;
        const sprite = decodeSprite(await loadSpriteBytes(name, url));
        animations.set(name, { sprite, metadata: animationMetadata(sprite), textures: [] });
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }));
}

function texture(name, index) {
  const animation = animations.get(name);
  if (!animation) return null;
  const { sprite, textures } = animation;
  index = Math.max(0, Math.min(sprite.frames.length - 1, index));
  if (!textures[index]) {
    const canvas = document.createElement("canvas");
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    canvas
      .getContext("2d")
      .putImageData(
        new ImageData(
          spriteFrameRGBA(sprite, index),
          sprite.width,
          sprite.height,
        ),
        0,
        0,
      );
    const map = new THREE.CanvasTexture(canvas);
    map.magFilter = map.minFilter = THREE.NearestFilter;
    map.generateMipmaps = false;
    map.colorSpace = THREE.SRGBColorSpace;
    textures[index] = map;
  }
  return textures[index];
}
function aimProgress(angle) {
  const pitch = Math.asin(Math.sin((angle * Math.PI) / 180));
  return Math.round((pitch / Math.PI + 0.5) * 0xffff);
}

export const projectileSprites = {
  rocket: "missile",
  mortar: "mortar",
  homing: "hmissil1",
  pigeon: "pigeonr0",
  magic: "bullet",
  grenade: "grenade",
  sticky: "grenade",
  cluster: "cluster",
  banana: "banana",
  holy: "hgrenade",
  napalm: "petrolbm",
};
export function createNativeProjectileVisual(render) {
  const name = spriteIds.sprites[render?.sprite]?.name;
  return name ? createOriginalVisual(name) : null;
}

export function originalVisual(name, index = 0) {
  const animation = animations.get(name);
  if (!animation) return null;
  return {
    map: texture(name, index),
    width: animation.sprite.width,
    height: animation.sprite.height,
    count: animation.sprite.frames.length,
    rate: animation.metadata.rate / 65536,
    flags: animation.sprite.metadata[2],
    bottom: animation.sprite.frames[0].bottom,
  };
}

// A reusable native-size sprite with an explicit foot anchor. Frame selection
// honors the original loop/ping-pong flags; only the host event driver is new.
export function createOriginalObject(name, footOffset = 0) {
  const frame = originalVisual(name);
  if (!frame) return null;
  const group = new THREE.Group();
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
  );
  group.add(plane);
  group.userData.originalPlane = plane;
  group.userData.footOffset = footOffset;
  updateOriginalObject(group, name, 0);
  return group;
}

export function updateOriginalObject(group, name, age, progress = null) {
  const plane = group.userData.originalPlane;
  const frame = originalVisual(name);
  if (!plane || !frame) return false;
  const ticks = Math.max(0, Math.round(age * 50));
  let playback = group.userData.originalPlayback;
  if (!playback || playback.name !== name || ticks < playback.ticks) {
    const player = new NativeAnimationPlayer();
    player.enqueue(spriteIdByName.get(name), animations.get(name).metadata);
    playback = group.userData.originalPlayback = { name, player, ticks: 0 };
  }
  while (playback.ticks < ticks) {
    playback.player.advance();
    playback.ticks++;
  }
  const position = progress ?? playback.player.current.progress;
  const index = nativeSpriteFrame(frame.count, frame.flags, position);
  plane.material.map = texture(name, index);
  plane.scale.set(frame.width, frame.height, 1);
  plane.position.y =
    frame.bottom - frame.height / 2 + group.userData.footOffset;
  group.userData.originalSprite = name;
  group.userData.originalFrame = index;
  return true;
}

export function createOriginalVisual(name) {
  const frame = originalVisual(name);
  if (!frame) return null;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(frame.width, frame.height),
    new THREE.MeshBasicMaterial({
      map: frame.map,
      transparent: true,
      depthWrite: false,
    }),
  );
  mesh.userData.originalSprite = name;
  return mesh;
}

export function updateOriginalProjectile(
  mesh,
  kind,
  vx,
  vy,
  age,
  submerged = false,
  guidanceActive = true,
  nativeRender = null,
) {
  const base = nativeRender ? spriteIds.sprites[nativeRender.sprite]?.name : kind === "homing" && !guidanceActive ? "hmissil2" : projectileSprites[kind];
  const allowed = kind === "pigeon" ? [0,1,2,3].flatMap(i => [`pigeonr${i}`, `water/pigeonr${i}`]) : kind === "homing" ? ["hmissil1", "hmissil2", "water/hmissil1", "water/hmissil2"] : [base, `water/${base}`];
  if (!base || !allowed.includes(mesh.userData.originalSprite))
    return false;
  const name = submerged ? `water/${base}` : base;
  const animation = animations.get(name);
  if (!animation) return false;
  let index;
  if (nativeRender) {
    // Original render queue uses zero progress for submerged projectiles.
    index = nativeSpriteFrame(animation.sprite.frames.length,
      animation.sprite.metadata[2], submerged ? 0 : nativeRender.progress);
    mesh.userData.waterPlayback = null;
  } else if (submerged) {
    // The water bank has its own frame counts/rates: most sinking objects
    // are one-frame poses, while the homing missile has a timed strip.
    let playback = mesh.userData.waterPlayback;
    const tick = Math.max(0, Math.round(age * 50));
    if (
      !playback ||
      mesh.userData.originalSprite !== name ||
      tick < playback.tick
    ) {
      const player = new NativeAnimationPlayer();
      const id = +Object.keys(waterSpriteIds.sprites).find(
        (id) => waterSpriteIds.sprites[id].name === base,
      );
      player.enqueue(id, animation.metadata);
      playback = mesh.userData.waterPlayback = { player, tick };
    }
    while (playback.tick < tick) {
      playback.player.advance();
      playback.tick++;
    }
    index = nativeSpriteFrame(
      animation.sprite.frames.length,
      animation.sprite.metadata[2],
      playback.player.current.progress,
    );
  } else {
    const directed = ["rocket", "mortar", "homing"].includes(kind);
    // The shipped 32-direction strips start pointing up and turn clockwise.
    const turn = directed ? Math.atan2(vx, vy) / (Math.PI * 2) : age * 0.8;
    index = ((Math.round(turn * 32) % 32) + 32) % 32;
    mesh.userData.waterPlayback = null;
  }
  mesh.material.map = texture(name, index);
  if (kind === "pigeon") mesh.scale.set(
    animation.sprite.width / mesh.geometry.parameters.width * (nativeRender?.facing ?? (vx < 0 ? -1 : 1)),
    animation.sprite.height / mesh.geometry.parameters.height, 1);
  mesh.userData.originalSprite = name;
  mesh.userData.originalFrame = index;
  mesh.rotation.z = 0;
  return true;
}

function applyAnimationCalls(player, calls) {
  for (const call of calls) {
    if (call.operation === "clear") player.clear();
    else if (call.operation === "setProgress")
      player.setProgress(call.progress);
    else
      player.enqueue(
        call.sprite_id,
        animations.get(spriteIds.sprites[call.sprite_id].name).metadata,
        call.progress,
      );
  }
}

// State77 queues sprite13 and launches only after its native progress gate.
export function startOriginalJumpPreparation(worm, direction, backflip) {
  const name = spriteIds.sprites[0x13].name;
  if (!animations.has(name)) return false;
  const player = new NativeAnimationPlayer();
  player.enqueue(0x13, animations.get(name).metadata);
  worm.originalJumpPreparation = { player, direction, backflip };
  worm.originalLanding = null;
  return true;
}
export function stepOriginalJumpPreparation(worm) {
  const pending = worm.originalJumpPreparation;
  if (!pending) return null;
  if (worm.hp <= 0 || worm.frozen || worm.knocked || worm.hurt > 0.35 ||
      worm.originalPreparation || worm.originalRecoil) {
    worm.originalJumpPreparation = null;
    return null;
  }
  if ((pending.player.current.progress & 0xffff0000) >= 65536) {
    worm.originalJumpPreparation = null;
    return { direction: pending.direction, backflip: pending.backflip };
  }
  pending.player.advance();
  return null;
}

// State79 airborne entry after the preparation impulse.
export function startOriginalJump(worm, backflip = false, direction = 0, onEntry = () => {}) {
  const result = nativeWormJumpLandingEntry(
    {
      state: 0x77,
      team: worm.team,
      field2b0: direction,
      field2b4: backflip ? 1 : 0,
      soundHandle: 0,
    },
    0x79,
    { soundHandle: 0, voiceId: 0 },
  );
  const calls = result.calls.filter((call) =>
    ["clear", "queue"].includes(call.operation),
  );
  if (
    calls.some(
      (call) =>
        call.operation === "queue" &&
        !animations.has(spriteIds.sprites[call.sprite_id].name),
    )
  )
    return false;
  const player = new NativeAnimationPlayer();
  applyAnimationCalls(player, calls);
  worm.originalJump = player;
  worm.originalLanding = null;
  onEntry(result.calls);
  return true;
}

export function stepOriginalJump(worm) {
  const player = worm.originalJump;
  if (!player) return;
  if (
    worm.hp <= 0 ||
    worm.frozen ||
    worm.knocked ||
    worm.hurt > 0.35 ||
    worm.ground ||
    worm.originalPreparation ||
    worm.originalRecoil
  ) {
    worm.originalJump = null;
    return;
  }
  const result = nativeWormJumpLandingTick(
    0x79,
    player.current.id,
    player.current.progress,
    Math.round((-worm.vy * 65536) / 50) | 0,
  );
  applyAnimationCalls(player, result.calls);
  player.advance();
}

// 004F8C50 clears the animator and queues the opening link then the canopy.
export function startOriginalParachute(worm) {
  if (!animations.has("wparalnk")) return false;
  const player = new NativeAnimationPlayer();
  for (const id of [0x80, 0x81])
    player.enqueue(id, animations.get(spriteIds.sprites[id].name).metadata);
  worm.originalParachute = player;
  worm.originalJump = null;
  worm.originalLanding = null;
  return true;
}
export function stepOriginalParachute(worm) {
  if (!worm.originalParachute) return;
  if (worm.hp <= 0 || worm.frozen || worm.knocked || worm.hurt > 0.35) {
    worm.originalParachute = null;
    return;
  }
  worm.originalParachute.advance();
}

// Browser landing adapter. Physics still supplies impact speed in pixels/second;
// native velocity is signed 16.16 pixels per 50 Hz tick, positive downward.
export function startOriginalLanding(worm, speed, previousState = 0x65) {
  const result = nativeWormJumpLandingEntry(
    {
      state: previousState,
      vy: Math.round((speed * 65536) / 50) | 0,
      soundHandle: 0,
      field19c: 0,
    },
    0x7a,
    {
      previousSprite:
        worm.originalJump?.current.id || worm.originalPlayer?.current.id || 0,
      soundHandle: 0,
    },
  );
  const queue = result.calls.filter((call) => call.operation === "queue");
  if (
    queue.some(
      (call) => !animations.has(spriteIds.sprites[call.sprite_id].name),
    )
  )
    return false;
  const player = new NativeAnimationPlayer();
  applyAnimationCalls(
    player,
    result.calls.filter((call) => ["clear", "queue"].includes(call.operation)),
  );
  worm.originalLanding = player;
  worm.originalJump = null;
  return result.calls.find((call) => call.operation === "sound").request;
}

// Advance independently of rendering, once per simulation tick.
export function stepOriginalLanding(worm) {
  const player = worm.originalLanding;
  if (!player) return;
  if (
    worm.hp <= 0 ||
    worm.frozen ||
    worm.knocked ||
    worm.hurt > 0.35 ||
    !worm.ground ||
    worm.moving ||
    worm.originalPreparation ||
    worm.originalRecoil
  ) {
    worm.originalLanding = null;
    return;
  }
  player.advance();
  if (
    nativeWormJumpLandingTick(
      0x7a,
      player.current.id,
      player.current.progress,
      0,
    ).target !== null
  )
    worm.originalLanding = null;
}

export function startOriginalBlowtorch(worm) {
  const player = new NativeAnimationPlayer();
  player.enqueue(125, animations.get("wbloww").metadata);
  worm.originalBlowtorch = { player };
  worm.originalRecoil = worm.originalPreparation = worm.originalJump = worm.originalLanding = null;
  worm.originalAnimationKey = null;
}
export function finishOriginalBlowtorch(worm, calls) {
  const player = worm.originalBlowtorch.player;
  for (const call of calls) {
    if (call.operation === "clear") player.clear();
    if (call.operation === "queueControlled") player.enqueue(call.sprite, animations.get(spriteIds.sprites[call.sprite].name).metadata, call.progress);
  }
  worm.originalPlayer = player;
  worm.originalBlowtorch = null;
  worm.originalAnimationKey = null;
}

export function startOriginalDrill(worm) {
  const player = new NativeAnimationPlayer();
  player.enqueue(157, animations.get("wdrill").metadata);
  worm.originalDrill = { player };
  worm.originalRecoil = worm.originalPreparation = worm.originalJump = worm.originalLanding = null;
  worm.originalAnimationKey = null;
}

export function startOriginalFirePunch(worm) {
  const player = new NativeAnimationPlayer();
  player.enqueue(432, animations.get("wpncup").metadata);
  worm.originalFirePunch = { player };
  worm.originalRecoil = worm.originalPreparation = worm.originalJump = worm.originalLanding = null;
  worm.originalAnimationKey = null;
}
export function updateOriginalFirePunch(worm, calls) {
  const player = worm.originalFirePunch.player;
  for (const call of calls) {
    if (call.operation === "clear") player.clear();
    if (call.operation === "queue") player.enqueue(call.sprite, animations.get(spriteIds.sprites[call.sprite].name).metadata);
  }
  player.advance();
}

export function startOriginalAxe(worm) {
  const player = new NativeAnimationPlayer();
  player.enqueue(0x197, animations.get("waxelk2").metadata);
  worm.originalAxe = { player };
  worm.originalRecoil = null;
  worm.originalPreparation = null;
  worm.originalAnimationKey = null;
}
export function stepOriginalAxe(worm, percent, height) {
  const player = worm.originalAxe.player;
  player.advance();
  const calls = nativeAxeTick({ sprite:player.current.id, progress:player.current.progress,
    x:Math.round(worm.x*65536), y:Math.round((height-worm.y)*65536), facing:worm.facing, percent });
  for (const call of calls) {
    if (call.operation === "clear") player.clear();
    if (call.operation === "queue") player.enqueue(call.sprite, animations.get(spriteIds.sprites[call.sprite].name).metadata);
    if (call.operation === "state") worm.originalAxe = null;
  }
  return calls;
}

export function startOriginalPreparation(worm, weapon, angle) {
  if (!["shotgun", "handgun", "uzi", "minigun", "prod", "bat", "axe", "firepunch", "dragonball", "drill", "blowtorch"].includes(weapon)) return false;
  const player = (worm.originalPlayer ??= new NativeAnimationPlayer());
  const record = weaponFields[WEAPON_SLOTS[weapon]];
  const state = nativePreparation(
    record,
    player.current.id,
    aimProgress(angle),
    { voice: slot => slot | 0x10000 },
  );
  applyAnimationCalls(player, state.calls);
  worm.originalPreparation = { record, ...state };
  worm.originalRecoil = null;
  worm.originalAnimationKey = null;
  worm.originalEquipped = true;
  return true;
}

// Called once per simulation tick, independently of render rate.
export function stepOriginalPreparation(worm) {
  const state = worm.originalPreparation;
  if (!state) return null;
  const player = worm.originalPlayer;
  player.advance();
  const result = nativePreparationTick(state.record, {
    ...state,
    sprite: player.current.id,
    progress: player.current.progress,
  });
  applyAnimationCalls(player, result.calls);
  Object.assign(state, result);
  if (result.released) worm.originalPreparation = null;
  return result;
}

// Browser action adapter: native preparation/firing event scheduling is still unported.
export function startOriginalRecoil(worm, weapon, angle, frame) {
  const id = WEAPON_SLOTS[weapon];
  if (!id || !animations.has(spriteIds.sprites[weaponSprites[weapon]]?.name))
    return;
  const record = weaponFields[id];
  const progress = aimProgress(angle);
  const result = nativePostFire(record, progress);
  const player = (worm.originalPlayer = new NativeAnimationPlayer());
  const enqueue = (id, value) =>
    player.enqueue(
      id,
      animations.get(spriteIds.sprites[id].name).metadata,
      value,
    );
  // 004F67E0 first ensures the selected weapon strip and aim progress are present.
  enqueue(weaponSprites[weapon], progress);
  for (const call of result.calls) {
    if (call.operation === "clear") player.clear();
    else enqueue(call.sprite_id, call.progress);
  }
  worm.originalRecoil = { record, delay: result.delay, frame };
  worm.originalAnimationKey = null;
  worm.originalEquipped = true;
}

// 004D7730 state 0x87 selects wfdrown after freeze (0x88), wdrown otherwise.
// The browser still owns water-entry detection and the drowning lifetime.
export function startOriginalDrowning(worm) {
  const id = worm.frozen ? 12 : 11;
  const name = `water/${waterSpriteIds.sprites[id].name}`;
  const animation = animations.get(name);
  if (!animation) return;
  const player = new NativeAnimationPlayer();
  player.enqueue(id, animation.metadata);
  worm.originalDrowning = { name, player, bubbleProgress: 0 };
}
export function stepOriginalDrowning(worm, { height = H, random = () => 0, emit = () => {} } = {}) {
  const drowning = worm.originalDrowning;
  if (!drowning) return false;
  drowning.player.advance();
  const result = nativeWormBubbles({
    state: 0x87, bubbleProgress: drowning.bubbleProgress,
    x: Math.round((worm.x ?? 0) * 65536),
    y: Math.round((height - (worm.y ?? 0)) * 65536),
    facing: worm.facing ?? 1,
  }, 0, random);
  drowning.bubbleProgress = result.body.bubbleProgress;
  for (const call of result.calls) emit(call.request);
  return result.calls.length > 0;
}

// Browser constraint angle is adapted to the original downward-positive body angle.
export function setOriginalRope(worm, angle) {
  worm.originalRope = worm.nativeRopeBody?.state === 0x7c
    ? { progress: worm.nativeRopeBody.bungeeProgress || 0 }
    : nativeRopeAnimation(worm.facing, angle);
  worm.originalJump = null;
  worm.originalLanding = null;
  worm.originalParachute = null;
}

// 004F7FD0 clears and queues 0x18e; host target selection supplies coordinates.
export function startOriginalTeleport(worm, x, y) {
  const animation = animations.get("wteldsv");
  if (!animation) return false;
  const player = new NativeAnimationPlayer();
  player.enqueue(0x18e, animation.metadata);
  worm.originalTeleport = { player, progress: 0, x, y };
  worm.originalJump = worm.originalLanding = worm.originalParachute = null;
  return true;
}
export function stepOriginalTeleport(worm) {
  const state = worm.originalTeleport;
  if (!state) return null;
  if (worm.hp <= 0 || worm.frozen || worm.knocked) {
    worm.originalTeleport = null;
    return null;
  }
  state.player.advance();
  const next = nativeTeleportTick(state.progress);
  state.progress = next.progress;
  if (next.relocate) {
    worm.x = state.x;
    worm.y = state.y;
    worm.renderY = state.y;
    worm.vx = worm.vy = 0;
    worm.ground = false;
  }
  if (next.target !== null) worm.originalTeleport = null;
  return next;
}

export function stopOriginalJetpack(worm) {
  worm.originalJetpack?.map.dispose();
  worm.originalJetpack = null;
}
export function stepOriginalJetpack(worm, steering, thrust) {
  let state = worm.originalJetpack;
  if (!state) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 100;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.minFilter = map.magFilter = THREE.NearestFilter;
    map.generateMipmaps = false;
    state = worm.originalJetpack = {
      lean: worm.facing * 0x38000,
      side: 0,
      down: 0,
      fuel: nativeJetpackInitialFuel,
      map,
    };
    worm.originalJump = worm.originalLanding = worm.originalParachute = null;
  }
  const input = nativeJetpackInput({ ...state, facing: worm.facing },
    { left: steering < 0, right: steering > 0, up: thrust > 0 }, 0);
  const next = nativeJetpackTick({
    facing: input.facing,
    lean: state.lean,
    side: input.side,
    down: input.down,
    fuel: state.fuel,
  });
  Object.assign(state, next);
  const ctx = state.map.image.getContext("2d");
  ctx.clearRect(0, 0, 100, 100);
  ctx.imageSmoothingEnabled = false;
  const draw = (name, index, dx, dy, flip) => {
    ctx.save();
    ctx.translate(50 + dx, 50 + dy);
    ctx.scale(flip ? -1 : 1, 1);
    ctx.drawImage(texture(name, index).image, -30, -30);
    ctx.restore();
  };
  // 004DC2C0 offsets both flame layers in the native downward-positive grid.
  state.name = spriteIds.sprites[state.sprite].name;
  draw(state.name, 0, 0, 0, state.lean >= 0);
  state.sideFrame = nativeSpriteFrame(6, 1, state.side);
  state.downFrame = nativeSpriteFrame(6, 1, state.down);
  draw(
    "wjetflmb",
    state.sideFrame,
    Math.floor(-fixedDivide(state.lean * 14, 0x38000) / 65536),
    3,
    state.lean > 0,
  );
  draw(
    "wjetflmd",
    state.downFrame,
    Math.floor(-fixedDivide(state.lean * 7, 0x38000) / 65536),
    16,
    false,
  );
  state.map.needsUpdate = true;
  return state;
}

export function stepOriginalWalking(worm) {
  if (
    !worm.moving ||
    !worm.ground ||
    worm.knocked ||
    worm.hp <= 0 ||
    worm.frozen ||
    worm.hurt > 0.35
  ) {
    worm.originalWalking = null;
    worm.nativeWalkingBody = null;
    worm.nativeWalkingTime = 0;
    return;
  }
  const facing = worm.walkDirection || worm.facing;
  let state = worm.originalWalking;
  if (!state || state.facing !== facing) state = { progress: 0, facing };
  Object.assign(state, worm.nativeWalkingBody
    ? { progress: worm.nativeWalkingBody.progress, cycle: worm.nativeWalkingBody.cycle }
    : nativeWalkingTick(state.progress));
  state.sprite = nativeWalkingSprite(-Math.sign(worm.walkRise || 0));
  worm.originalWalking = state;
}

// 004D7730 state 0x84 queues sprite 10. 004DDBD0 waits until its
// controlled progress crosses 0x10000 before the death completion path.
export function startOriginalDeath(worm) {
  const animation = animations.get("wdie");
  if (!animation) return false;
  const entry = nativeDeathEntry({
    vx: worm.vx ?? 0, vy: worm.vy ?? 0,
    angularVelocity: 0, suspended: 0, spoken: worm.originalDeathSpoken ?? 0,
  });
  worm.vx = entry.body.vx; worm.vy = entry.body.vy;
  for (const body of [worm.nativeHurtBody, worm.nativeFlight, worm.nativeRopeBody])
    if (body) Object.assign(body, { state: 0x84, vx: 0, vy: 0, angularVelocity: 0, suspended: 1 });
  const player = new NativeAnimationPlayer();
  for (const call of entry.calls) {
    if (call.operation === 'clear') player.clear();
    else player.enqueue(call.sprite_id, animation.metadata, call.progress);
  }
  worm.originalDeath = player;
  worm.originalJumpPreparation = null;
  worm.originalDeathSpoken = entry.body.spoken;
  worm.originalDeathVoice = null;
  worm.originalJump = worm.originalLanding = worm.originalRecoil = worm.originalAxe = worm.originalFirePunch = null;
  worm.originalPreparation = null;
  return true;
}
export function stepOriginalDeath(worm, random = () => 0) {
  const player = worm.originalDeath;
  if (!player) return false;
  player.advance();
  const cue = nativeDeathCue(
    10,
    player.current.progress,
    worm.originalDeathSpoken,
    random,
  );
  worm.originalDeathSpoken = cue.spoken;
  worm.originalDeathVoice = cue.sound;
  return cue.complete;
}

export function startOriginalHurt(worm, state) {
  const entry = nativeHurtEntry(
    state,
    worm.nativeHurtBody?.angle ?? worm.nativeFlight?.angle ?? 0,
  );
  if (!entry) return;
  worm.originalJumpPreparation = null;
  worm.originalAxe = null;
  worm.originalFirePunch = null;
  worm.originalHurt = {
    state,
    angle: entry.angle,
    sprite: entry.calls[1].sprite_id,
  };
  if (worm.nativeFlight) worm.nativeFlight.angle = entry.angle;
  if (worm.nativeHurtBody) {
    worm.nativeHurtBody.state = state;
    worm.nativeHurtBody.angle = entry.angle;
  }
  worm.originalRecovery = null;
}

// One original 50 Hz rotation step. Translation/collision still come from
// the host body until its native hurt-contact path is connected.
export function stepOriginalHurt(worm) {
  const hurt = worm.originalHurt;
  if (!hurt || worm.frozen || (!worm.knocked && !(worm.hurt > 0.35))) return;
  const rotation = nativeBodyRotation({
    radius: worm.nativeFlight?.radius ?? 0x100000,
    angle: worm.nativeFlight?.angle ?? hurt.angle,
    angularVelocity: hurt.angularVelocity ?? 0,
    vx: Math.round((worm.vx * 65536) / 50) | 0,
    vy: Math.round((-worm.vy * 65536) / 50) | 0,
  });
  Object.assign(hurt, rotation);
  if (worm.nativeFlight) Object.assign(worm.nativeFlight, rotation);
}

export function startOriginalRecovery(
  worm,
  previous,
  maxVy,
  flag,
  random = () => 0,
) {
  const entry = nativeRecoveryEntry(
    previous,
    maxVy,
    flag,
    0,
    flag ? random() : 0,
  );
  const player = new NativeAnimationPlayer();
  applyAnimationCalls(
    player,
    entry.calls.filter((call) => ["clear", "queue"].includes(call.operation)),
  );
  worm.originalRecovery = { player, flag };
  worm.originalHurt = null;
  return entry.calls;
}

export function stepOriginalRecovery(worm) {
  const recovery = worm.originalRecovery;
  if (!recovery) return [];
  recovery.player.advance();
  const result = nativeRecoveryTick(
    recovery.player.current.progress,
    recovery.flag,
    0,
  );
  recovery.flag = result.flag;
  if (result.calls.some((call) => call.operation === "state"))
    worm.originalRecovery = null;
  return result.calls;
}

export function originalWormFrame(worm, pose, frame, angle, weapon, active) {
  if (worm.originalJetpack && worm.hp > 0 && !worm.frozen) {
    const state = worm.originalJetpack;
    return {
      map: state.map,
      name: state.name,
      index: 0,
      facing: -1,
      aimed: false,
      equipped: false,
    };
  }
  if (worm.originalTeleport && worm.hp > 0) {
    const animation = animations.get("wteldsv");
    const index = nativeSpriteFrame(
      animation.sprite.frames.length,
      animation.sprite.metadata[2],
      nativeTeleportRenderProgress(worm.originalTeleport.progress),
    );
    return {
      map: texture("wteldsv", index),
      name: "wteldsv",
      index,
      aimed: false,
      equipped: false,
    };
  }
  if (worm.originalRope && worm.hp > 0 && !worm.frozen && !worm.knocked) {
    const name = worm.nativeRopeBody?.state === 0x7c ? "wbungee" : "wbatrope";
    const animation = animations.get(name);
    if (animation) {
      const index = nativeSpriteFrame(
        animation.sprite.frames.length,
        animation.sprite.metadata[2],
        worm.originalRope.progress,
      );
      return {
        map: texture(name, index),
        name,
        index,
        aimed: false,
        equipped: false,
      };
    }
  }

  if (
    worm.originalParachute &&
    worm.hp > 0 &&
    !worm.frozen &&
    !worm.knocked &&
    !worm.ground
  ) {
    const player = worm.originalParachute;
    const name = spriteIds.sprites[player.current.id].name;
    const sprite = animations.get(name).sprite;
    const index = nativeSpriteFrame(
      sprite.frames.length,
      sprite.metadata[2],
      player.current.progress,
    );
    return {
      map: texture(name, index),
      name,
      index,
      aimed: false,
      equipped: false,
    };
  }

  if (worm.drowned && worm.originalDrowning) {
    const { name, player } = worm.originalDrowning;
    const sprite = animations.get(name).sprite;
    const index = nativeSpriteFrame(
      sprite.frames.length,
      sprite.metadata[2],
      player.current.progress,
    );
    return {
      map: texture(name, index),
      name,
      index,
      aimed: false,
      equipped: false,
    };
  }

  // An explicit native jump queue takes precedence over the host panic pose.
  if (worm.originalDeath && !worm.drowned) {
    const animation = animations.get("wdie");
    const index = nativeSpriteFrame(
      animation.sprite.frames.length,
      animation.sprite.metadata[2],
      worm.originalDeath.current.progress,
    );
    return {
      map: texture("wdie", index),
      name: "wdie",
      index,
      aimed: false,
      equipped: false,
    };
  }

  if (worm.originalRecovery?.player.current.id && !worm.frozen && (worm.hp > 0 || worm.deathPending)) {
    const current = worm.originalRecovery.player.current;
    const name = spriteIds.sprites[current.id].name;
    const sprite = animations.get(name).sprite;
    const index = nativeSpriteFrame(
      sprite.frames.length,
      sprite.metadata[2],
      current.progress,
    );
    return {
      map: texture(name, index),
      name,
      index,
      aimed: false,
      equipped: false,
    };
  }

  const preparingJump = worm.originalJumpPreparation;
  const jumping = preparingJump?.player ?? worm.originalJump;
  if (
    jumping &&
    worm.hp > 0 &&
    !worm.frozen &&
    !worm.knocked &&
    !(worm.hurt > 0.35) &&
    (preparingJump || !worm.ground) &&
    !worm.originalPreparation &&
    !worm.originalRecoil && !worm.originalAxe && !worm.originalFirePunch && !worm.originalDrill && !worm.originalBlowtorch
  ) {
    const name = spriteIds.sprites[jumping.current.id].name;
    const sprite = animations.get(name).sprite;
    const index = nativeSpriteFrame(
      sprite.frames.length,
      sprite.metadata[2],
      jumping.current.progress,
    );
    return {
      map: texture(name, index),
      name,
      index,
      aimed: false,
      equipped: false,
    };
  }

  if (
    (worm.hp > 0 || worm.deathPending) &&
    !worm.frozen &&
    (worm.originalHurt?.state === 0x73 || worm.knocked ||
      pose === "hurt" ||
      pose === "panic" ||
      (worm.deathPending && !worm.ground))
  ) {
    if (
      worm.originalHurt?.state === 0x73 || worm.originalHurt?.state === 0x80 ||
      worm.originalHurt?.state === 0x7f
    ) {
      const hurt = worm.originalHurt;
      const name = spriteIds.sprites[hurt.sprite].name;
      const animation = animations.get(name);
      // 004DDBD0 state 0x80: rolling pose follows the low word of body angle, mirrored
      // by facing.
      const progress =
        (hurt.state === 0x73 || hurt.state === 0x80)
          ? Math.imul(
              (worm.nativeFlight?.angle ?? hurt.angle) & 65535,
              worm.facing,
            )
          : 0;
      const index = nativeSpriteFrame(
        animation.sprite.frames.length,
        animation.sprite.metadata[2],
        progress,
      );
      return {
        map: texture(name, index),
        name,
        index,
        aimed: false,
        equipped: false,
      };
    }
    // Host velocities are per second and upward-positive; native bodies use
    // downward-positive fixed point per 50 Hz tick.
    const vx = Math.round(((worm.vx || 0) * 65536) / 50) | 0;
    const vy = Math.round((-(worm.vy || 0) * 65536) / 50) | 0;
    const id = nativeFlightSprite(
      Math.round(worm.x * 65536),
      Math.round((H - worm.y) * 65536),
    );
    const name = spriteIds.sprites[id].name;
    const animation = animations.get(name);
    if (animation) {
      worm.originalFlightProgress = nativeFlightProgress(
        vx,
        vy,
        worm.originalFlightProgress ?? 0,
      );
      const index = nativeSpriteFrame(
        animation.sprite.frames.length,
        animation.sprite.metadata[2],
        worm.originalFlightProgress,
      );
      const facing = vx < -0x6666 ? -1 : vx > 0x6666 ? 1 : worm.facing;
      return {
        map: texture(name, index),
        name,
        index,
        facing,
        aimed: false,
        equipped: false,
      };
    }
  }

  if (worm.originalWalking && pose.startsWith("walk")) {
    const state = worm.originalWalking;
    const name = spriteIds.sprites[state.sprite].name;
    const animation = animations.get(name);
    if (animation) {
      const index = nativeSpriteFrame(
        animation.sprite.frames.length,
        animation.sprite.metadata[2],
        state.progress,
      );
      return {
        map: texture(name, index),
        name,
        index,
        facing: state.facing,
        aimed: false,
        equipped: false,
      };
    }
  }

  const landing = worm.originalLanding;
  if (
    landing &&
    worm.hp > 0 &&
    !worm.frozen &&
    !worm.knocked &&
    !(worm.hurt > 0.35) &&
    worm.ground &&
    !worm.moving &&
    !worm.originalPreparation &&
    !worm.originalRecoil && !worm.originalAxe && !worm.originalFirePunch && !worm.originalDrill && !worm.originalBlowtorch
  ) {
    const name = spriteIds.sprites[landing.current.id].name;
    const sprite = animations.get(name).sprite;
    const index = nativeSpriteFrame(
      sprite.frames.length,
      sprite.metadata[2],
      landing.current.progress,
    );
    return {
      map: texture(name, index),
      name,
      index,
      aimed: false,
      equipped: false,
    };
  }

  if (worm.originalPreparation || worm.originalAxe || worm.originalFirePunch || worm.originalDrill || worm.originalBlowtorch) {
    const player = worm.originalBlowtorch?.player ?? worm.originalDrill?.player ?? worm.originalFirePunch?.player ?? worm.originalAxe?.player ?? worm.originalPlayer;
    const name = spriteIds.sprites[player.current.id].name;
    const sprite = animations.get(name).sprite;
    const index = nativeSpriteFrame(
      sprite.frames.length,
      sprite.metadata[2],
      player.current.progress,
    );
    return {
      map: texture(name, index),
      name,
      index,
      aimed: false,
      equipped: true,
    };
  }
  const recoil = worm.originalRecoil;
  if (
    recoil &&
    worm.hp > 0 &&
    !worm.frozen &&
    !worm.knocked &&
    !(worm.hurt > 0.35)
  ) {
    const player = worm.originalPlayer;
    while (recoil.frame < frame && worm.originalRecoil) {
      player.advance();
      const next = nativeRecoilTick(
        recoil.record,
        recoil.delay,
        player.current.progress,
        0,
      );
      recoil.delay = next.delay;
      recoil.frame++;
      if (next.target !== null) worm.originalRecoil = null;
    }
    if (worm.originalRecoil) {
      const name = spriteIds.sprites[player.current.id].name;
      const sprite = animations.get(name).sprite;
      const index = nativeSpriteFrame(
        sprite.frames.length,
        sprite.metadata[2],
        player.current.progress,
      );
      return {
        map: texture(name, index),
        name,
        index,
        aimed: false,
        equipped: true,
      };
    }
  } else if (recoil) worm.originalRecoil = null;
  let name =
    {
      idle: "wbrth1",
      blink: "wblink1",
      jump: "wjump",
      fall: "wfall",
      land: "wland1",
      hurt: "wfly1",
      panic: "wfly1",
      victory: "wwinner",
      recoil: "wbrth1",
      aim: "wbrth1",
    }[pose] || "wwalk";
  let equipped = false;
  if (active && pose === "aim" && weaponSprites[weapon]) {
    name = spriteIds.sprites[weaponSprites[weapon]].name;
    equipped = true;
  }
  // Zero HP waits for the controller's death dispatch; only originalDeath
  // selects wdie above. Damage reveal and other deaths may still be in progress.
  const frozen = worm.frozen > 0 && worm.hp > 0;
  const key = frozen ? "frozen" : name;
  let player = worm.originalPlayer;
  if (!player) player = worm.originalPlayer = new NativeAnimationPlayer();
  if (worm.originalAnimationKey !== key) {
    const previousId = player.current.id;
    const wasEquipped = worm.originalEquipped;
    player.clear();
    const queue = frozen
      ? nativeFreezeAnimation(previousId).sprites.map((sprite_id) => ({
          sprite_id,
          progress: 0,
        }))
      : equipped
        ? nativeWeaponEquip(
            weaponFields[WEAPON_SLOTS[weapon]],
            wasEquipped ? 0x66 : 0x65,
            0x8000,
            WEAPON_SLOTS[weapon],
          ).calls.filter((call) => call.operation === "queue")
        : [{ sprite_id: spriteIdByName.get(name), progress: 0 }];
    if (
      queue.some(
        ({ sprite_id }) => !animations.has(spriteIds.sprites[sprite_id]?.name),
      )
    )
      return null;
    for (const { sprite_id: id, progress } of queue)
      player.enqueue(
        id,
        animations.get(spriteIds.sprites[id].name).metadata,
        progress,
      );
    worm.originalAnimationKey = key;
    worm.originalEquipped = equipped && !frozen;
    worm.originalAnimationStart = frame;
    worm.originalPlayerFrame = frame;
  }
  while (worm.originalPlayerFrame < frame) {
    player.advance();
    worm.originalPlayerFrame++;
  }
  name = spriteIds.sprites[player.current.id]?.name;
  const animation = animations.get(name);
  if (!animation) return null;
  const { sprite } = animation;
  const count = sprite.frames.length;
  const aimed = equipped && !player.current.rate && !frozen;
  if (aimed) {
    player.setProgress(aimProgress(angle));
  } else if (!player.current.rate) {
    // Motion-driven strips need the original locomotion/velocity driver.
    // Keep the existing browser motion cadence until that physics is ported.
    player.setProgress(
      Math.floor(
        ((frame - worm.originalAnimationStart) * 0x10000) / (count * 2),
      ),
    );
  }
  const index = nativeSpriteFrame(
    count,
    sprite.metadata[2],
    player.current.progress,
  );
  worm.originalAnimation = name;
  return {
    map: texture(name, index),
    name,
    index,
    aimed,
    equipped: equipped && !frozen,
  };
}
