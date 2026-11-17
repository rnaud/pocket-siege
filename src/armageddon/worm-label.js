import { loadNativeFont, measureNativeText, rasterNativeText } from "./font.js";

let fonts;
export function nativeWormLabelFont(color, selected, suppressed, tick) {
  return selected && !suppressed && Math.trunc((tick | 0) / 25) & 1
    ? 15
    : (color | 0) + 9;
}
export async function loadOriginalWormLabels() {
  fonts = await Promise.all(
    ["stdgrn1", "stdred1", "stdwht1"].map(loadNativeFont),
  );
}

// 004D8C20 uses standard team-color fonts (color+9), switching the selected
// worm to white every 25 native ticks. Names/team/health are separate lines.
// Selection and screen anchoring remain supplied by the host game.
export function updateOriginalWormLabel(label, worm, selected, tick) {
  if (!fonts) return false;
  const fontId = nativeWormLabelFont(worm.team ? 0 : 2, selected, false, tick);
  const fontIndex = fontId === 15 ? 2 : worm.team;
  const teamName = worm.team ? "CORAL" : "MOSS";
  const displayedHealth = worm.nativeHealthDisplay
    ? Math.max(0, Math.min(9999, worm.nativeHealthDisplay.value >> 16)) : worm.hp;
  const key = `${fontIndex}:${worm.name}:${worm.hp}:${displayedHealth}:${teamName}`;
  if (label.dataset.nativeLabel === key) return true;
  const font = fonts[fontIndex];
  // Native offsets are -58 (team), -42 (name), -25 (health).
  const lines = [
    [teamName, 0],
    [worm.name, 16],
    [String(displayedHealth), 33],
  ];
  const width = Math.max(
    ...lines.map(([text]) => measureNativeText(font, text).width),
  );
  let canvas = label.querySelector(".native-worm-text");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "native-worm-text";
    canvas.setAttribute("aria-hidden", "true");
    label.append(canvas);
  }
  canvas.width = width;
  canvas.height = 33 + font.height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${canvas.height}px`;
  const ctx = canvas.getContext("2d");
  for (const [text, y] of lines) {
    const image = rasterNativeText(font, text);
    if (image.width)
      ctx.putImageData(
        new ImageData(image.pixels, image.width, image.height),
        Math.floor((width - image.width) / 2),
        y,
      );
  }
  label.classList.add("has-native-text");
  label.dataset.nativeLabel = key;
  label.dataset.nativeFont = ["stdgrn1", "stdred1", "stdwht1"][fontIndex];
  label.setAttribute(
    "aria-label",
    `${worm.name}, ${teamName}, ${worm.hp} health`,
  );
  return true;
}
