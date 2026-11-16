import { nativeFreezeAnimation } from "./freeze.js";
import spriteIds from "./sprite-ids.json";
import * as THREE from "three";
import { decodeSprite, spriteFrameRGBA } from "./sprite.js";

const spriteIdByName = new Map(
  Object.entries(spriteIds.sprites).map(([id, sprite]) => [sprite.name, +id]),
);
const freezeEntry = spriteIds.sprites[0x23c].name;
const freezeIdle = spriteIds.sprites[0x248].name;
const names = [
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
];
const animations = new Map();
export async function loadOriginalArt() {
  await Promise.all(
    names.map(async (name) => {
      const response = await fetch(
        `${import.meta.env.BASE_URL}armageddon/sprites/${name}.spr`,
      );
      if (!response.ok) throw new Error(`Cannot load ${name}`);
      animations.set(name, {
        sprite: decodeSprite(await response.arrayBuffer()),
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
  let aimed = false;
  if (
    active &&
    pose === "aim" &&
    ["rocket", "homing", "mortar", "shotgun"].includes(weapon)
  ) {
    name = weapon === "shotgun" ? "wshotg" : "wbaz";
    aimed = true;
  }
  if (worm.frozen > 0 && worm.hp > 0) {
    aimed = false;
    // 004F5C80 queues 0x23C then 0x248 for entry from an ordinary state.
    // Exact task rates remain unported; keep the existing 25 fps adapter.
    if (worm.originalFreezeStart == null) {
      worm.originalFreezeStart = frame;
      const queue = nativeFreezeAnimation(
        spriteIdByName.get(worm.originalAnimation),
      );
      worm.originalFreezeEntry = spriteIds.sprites[queue.sprites[0]].name;
    }
    const entry = worm.originalFreezeEntry;
    const entryFrames = animations.get(entry)?.sprite.frames.length ?? 0;
    name =
      frame - worm.originalFreezeStart < entryFrames * 2 ? entry : freezeIdle;
  } else worm.originalFreezeStart = null;
  if (worm.hp <= 0) name = "wdie";
  if (worm.originalAnimation !== name) {
    worm.originalAnimation = name;
    worm.originalAnimationStart = frame;
  }
  const animation = animations.get(name);
  if (!animation) return null;
  const count = animation.sprite.frames.length;
  const age = Math.max(0, frame - worm.originalAnimationStart);
  const pitch = Math.asin(Math.sin((angle * Math.PI) / 180));
  // Aim strips contain 32 orientations. Other strips run at 25 fps initially;
  // task-specific rates/transitions remain tracked in the port manifest.
  const index = aimed
    ? Math.round((pitch / Math.PI + 0.5) * (count - 1))
    : ["wdie", "wjump", "wland1"].includes(name)
      ? Math.min(count - 1, Math.floor(age / 2))
      : Math.floor(age / 2) % count;
  return { map: texture(name, index), name, index, aimed };
}
