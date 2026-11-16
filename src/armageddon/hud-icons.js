import names from "./hud-icon-names.json";
import { decodeImage, imageRGBA } from "./image.js";

// 004CB380 loads the hi/ and lo/ IMG pairs for the native weapon panel.
// These mappings connect existing browser actions to their original artwork.
export const HUD_ICONS = Object.freeze({
  rocket: "bazooka",
  grenade: "grenade",
  mortar: "mortar",
  mine: "mine",
  shotgun: "shotgun",
  dynamite: "dynamite",
  cluster: "cluster",
  banana: "banana",
  airstrike: "airstrke",
  postal: "postal",
  napalm: "petrolbm",
  bat: "baseball",
  homing: "hmissile",
  holy: "hgrenade",
  rope: "rope",
  jetpack: "jetpack",
  parachute: "parachut",
  teleport: "teleport",
  girder: "girder",
  freeze: "freeze",
});
const icons = new Map();
export async function loadOriginalHUDIcons() {
  await Promise.all(
    names.flatMap((name) =>
      ["hi", "lo"].map(async (variant) => {
        const key = `${variant}/${name}`;
        const response = await fetch(
          `${import.meta.env.BASE_URL}armageddon/media/gfx/gfx/${key}.img`,
        );
        if (!response.ok)
          throw new Error(`Cannot load original HUD icon ${key}`);
        const image = decodeImage(await response.arrayBuffer());
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        canvas
          .getContext("2d")
          .putImageData(
            new ImageData(imageRGBA(image), image.width, image.height),
            0,
            0,
          );
        icons.set(key, canvas);
      }),
    ),
  );
}
export function originalHUDIcon(name, variant = "hi") {
  return icons.get(`${variant}/${name}`) || null;
}
export function updateOriginalHUDIcons(root = document) {
  for (const button of root.querySelectorAll("[data-weapon], [data-utility]")) {
    const name = HUD_ICONS[button.dataset.weapon || button.dataset.utility];
    if (!name) continue; // Sticky is a browser-only weapon, with no native icon.
    const variant = button.disabled ? "lo" : "hi";
    const source = originalHUDIcon(name, variant);
    if (!source) continue;
    let canvas = button.querySelector("canvas.original-icon");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "original-icon";
      canvas.setAttribute("aria-hidden", "true");
      const old = button.querySelector(
        "canvas[data-art], :scope > span:not(.weapon-name):not(.slot-key)",
      );
      if (old) old.replaceWith(canvas);
      else button.prepend(canvas);
    }
    const key = `${variant}/${name}`;
    if (canvas.dataset.originalIcon === key) continue;
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext("2d").drawImage(source, 0, 0);
    canvas.dataset.originalIcon = key;
  }
}
