import {
  NativeAnimationPlayer,
  animationMetadata,
  nativeSpriteFrame,
} from "./animation.js";
import { nativeWeaponAnimation } from "./weapon-animation.js";
import { nativeWeaponEquip } from "./equip.js";
import { nativePostFire, nativeRecoilTick } from "./recoil.js";
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
    "wfly1",
    "wwinner",
    "wdie",
    "wbaz",
    "wshotg",
    "wshotf",
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
