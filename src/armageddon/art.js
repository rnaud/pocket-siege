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
import { nativeFreezeAnimation } from "./freeze.js";
import spriteIds from "./sprite-ids.json";
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
    "wjump",
    "wfall",
    "wland1",
    "wland2",
    spriteIds.sprites[0x82].name,
    spriteIds.sprites[0x1aa].name,
    "wfly1",
    "wwinner",
    "wdie",
    "wbaz",
    "wshotg",
    "wshotf",
    "wshotp",
    "wparacht",
    "wjetfly1",
  ]),
];
const animations = new Map();
export async function loadOriginalArt() {
  await Promise.all(
    names.map(async (name) => {
      const response = await fetch(
        `${import.meta.env.BASE_URL}armageddon/sprites/${name}.spr`,
      );
      if (!response.ok) throw new Error(`Cannot load ${name}`);
      const sprite = decodeSprite(await response.arrayBuffer());
      animations.set(name, {
        sprite,
        metadata: animationMetadata(sprite),
        textures: [],
      });
    }),
  );
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
    { previousSprite: worm.originalPlayer?.current.id || 0, soundHandle: 0 },
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
  return true;
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

export function startOriginalPreparation(worm, weapon, angle) {
  // Currently connected to shotgun actions; other native preparation paths are
  // verified separately and await their action/event adapters.
  if (weapon !== "shotgun" || !animations.has("wshotp")) return false;
  const player = (worm.originalPlayer ??= new NativeAnimationPlayer());
  const record = weaponFields[WEAPON_SLOTS[weapon]];
  const state = nativePreparation(
    record,
    player.current.id,
    aimProgress(angle),
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

export function originalWormFrame(worm, pose, frame, angle, weapon, active) {
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
    !worm.originalRecoil
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

  if (worm.originalPreparation) {
    const player = worm.originalPlayer;
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
  if (worm.hp <= 0) {
    name = "wdie";
    equipped = false;
  }
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
