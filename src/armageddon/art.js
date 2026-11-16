import {
  NativeAnimationPlayer,
  animationMetadata,
  nativeSpriteFrame,
} from "./animation.js";
import { nativeWeaponAnimation } from "./weapon-animation.js";
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
export function originalWormFrame(worm, pose, frame, angle, weapon, active) {
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
  if (worm.hp <= 0) name = "wdie";
  const frozen = worm.frozen > 0 && worm.hp > 0;
  const key = frozen ? "frozen" : name;
  let player = worm.originalPlayer;
  if (!player) player = worm.originalPlayer = new NativeAnimationPlayer();
  if (worm.originalAnimationKey !== key) {
    const previousId = player.current.id;
    player.clear();
    const ids = frozen
      ? nativeFreezeAnimation(previousId).sprites
      : [spriteIdByName.get(name)];
    if (ids.some((id) => !animations.has(spriteIds.sprites[id]?.name)))
      return null;
    for (const id of ids)
      player.enqueue(id, animations.get(spriteIds.sprites[id].name).metadata);
    worm.originalAnimationKey = key;
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
    const pitch = Math.asin(Math.sin((angle * Math.PI) / 180));
    player.setProgress(Math.round((pitch / Math.PI + 0.5) * 0xffff));
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
