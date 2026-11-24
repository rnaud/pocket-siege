import { TEAMS, teamColor, teamFontName, teamInfo } from "../teams.js";
import { nativeCanvasPaletteDisplay } from "./canvas-palette.js";
import { loadNativeFont, measureNativeText, rasterNativeText } from "./font.js";
import { fixedMultiply } from './numeric.js';
import { nativeIconEase } from './worm-icon.js';

// Original004D8FC0: the damage text rises55 pixels during the first half
// of its native lifetime, then holds; all offsets are signed16.16.
export function nativeDamageTextPlacement(body) {
  if (!body.active) return null;
  const progress = Math.min(fixedMultiply(body.progress, 0x20000), 0x10000);
  return { x: body.x, y: (body.y - 0x2a0000 - Math.imul(progress, 55)) | 0,
    font: (body.color + 9) | 0, order: (Math.imul(body.rank, 4) + 0xd0103) | 0 };
}

// 004D86F0. Selection sprite centers remain independent of label detail.
export function nativeSelectionPlacement(body) {
  if (!body.progress) return null;
  return { x: body.x | 0,
    y: (fixedMultiply((body.y + 0x1800000) | 0, body.progress) - 0x1d00000) | 0,
    sprite: ((body.color | 0) + (body.alternate ? 0x316 : 0x310)) | 0,
    progress: Math.trunc((body.tick << 16) / 50), order: 0x30000 };
}

// 004D9DFA..004D9EEF (worm frame event 0x3ED): the label slide (+0x368
// toward +0x36C) and the selection arrow slide (+0x360 toward +0x364) each
// move a twentieth of the gap per frame, at least 0x20C, and land exactly.
export function nativeSelectionEase(current, target) {
  current |= 0; target |= 0;
  if (Math.abs(target - current) <= 0x20c) return target;
  let step = fixedMultiply((target - current) | 0, 0xccc);
  if (Math.abs(step) < 0x20c) step = step < 0 ? -0x20c : 0x20c;
  return (current + step) | 0;
}

// Selection arrow, label and weapon icon slide fields of the worm task.
// Creation (004D666E) hides the arrow and icon and shows the label.
export function nativeSelectionState() {
  return { arrow: 0, arrowTarget: 0, label: 0x10000, labelTarget: 0x10000, icon: 0, iconTarget: 0, iconValue: 0 };
}

// One 004D9DFA..004D9EF5 frame: the label slides, the weapon icon eases
// (004EDA70) and, while it shows on the active worm, sends the label away;
// then the arrow slides.
export function nativeSelectionFrame(state) {
  const next = { icon: 0, iconTarget: 0, active: 1, ...state };
  next.label = nativeSelectionEase(next.label, next.labelTarget);
  next.icon = nativeIconEase(next.icon, next.iconTarget);
  if (next.icon && next.active) next.labelTarget = 0;
  next.arrow = nativeSelectionEase(next.arrow, next.arrowTarget);
  return next;
}

// 0049FDAA..0049FDD7: the Delete key advances detail and wraps after hidden.
export function nextNativeLabelMode(mode) {
  const next = (mode + 1) | 0;
  return next < 0 || next > 3 ? 0 : next;
}

// 004D8C20. Native label modes: team/name/health, name/health, health, hidden.
export function nativeWormLabelPlacement(body) {
  const font = nativeWormLabelFont(body.color, body.selected, body.suppressed, body.tick);
  const order = (Math.imul(body.rank, 4) + 0xd0100) | 0;
  const lines = [];
  const add = (kind, y, layer = 0) => lines.push({ kind, x: body.x | 0, y: y | 0, font, order: (order + layer) | 0 });
  if (body.state === 0x78 && !body.suppressAmmo && body.ammo)
    add('ammo', body.y - 0x190000);
  if (body.progress) {
    const y = (fixedMultiply((body.y + 0x1800000) | 0, body.progress) - 0x1800000) | 0;
    if (!body.teamInactive && !body.surrendered) {
      if (body.labelMode < 2) add('name', y - (body.compact ? 0x190000 : 0x2a0000), 1);
      if (body.labelMode < 1) add('team', y - (body.compact ? 0x290000 : 0x3a0000), 1);
    }
    if (body.labelMode < 3 && !body.compact)
      add('health', y - (body.surrendered && !body.teamInactive ? 0x280000 : 0x190000));
  }
  return lines;
}

export function paintOriginalDamageText(canvas, value, team) {
  if (!fonts) return;
  const key = `${team}:${value}`;
  if (canvas.dataset.nativeDamage === key) return;
  const image = rasterNativeText(fonts.get(teamFontName(team)), String(value));
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.style.width = `${image.width}px`;
  canvas.style.height = `${image.height}px`;
  canvas.getContext('2d').putImageData(new ImageData(image.pixels, image.width, image.height), 0, 0);
  nativeCanvasPaletteDisplay.capture(canvas);
  canvas.dataset.nativeDamage = key;
  canvas.setAttribute('aria-label', `${value} damage`);
}

let fonts;
export function nativeWormLabelFont(color, selected, suppressed, tick) {
  return selected && !suppressed && Math.trunc((tick | 0) / 25) & 1
    ? 15
    : (color | 0) + 9;
}
export async function loadOriginalWormLabels() {
  const names = [...new Set([...TEAMS.keys()].map(team => teamFontName(team))), "stdwht1"];
  fonts = new Map(await Promise.all(names.map(async name => [name, await loadNativeFont(name)])));
}

// 004D8C20 uses standard team-color fonts (color+9), switching the selected
// worm to white every 25 native ticks. Names/team/health are separate lines.
// Positions come from the original label renderer, with integer render-queue snapping.
export function updateOriginalWormLabel(label, worm, selected, tick, placement, origin) {
  if (!fonts) return false;
  label.setAttribute('aria-label', `${worm.name}, ${teamInfo(worm.team).short}, ${worm.hp} health`);
  const existingCanvas = label.querySelector('.native-worm-text');
  if (existingCanvas) existingCanvas.hidden = placement.length === 0;
  if (!placement.length) {
    label.dataset.nativeTop = String(origin.y >> 16);
    label.dataset.nativeX = String(origin.x >> 16);
    label.dataset.nativeWidth = '0';
    return true;
  }
  const fontId = nativeWormLabelFont(teamColor(worm.team), selected, false, tick);
  const fontIndex = fontId === 15 ? "stdwht1" : teamFontName(worm.team);
  const teamName = teamInfo(worm.team).short;
  const displayedHealth = worm.nativeHealthDisplay
    ? Math.max(0, Math.min(9999, worm.nativeHealthDisplay.value >> 16)) : worm.hp;
  const text = { team: teamName, name: worm.name, health: String(displayedHealth), ammo: String((worm.nativeLabelAmmo ?? 0) >> 16) };
  const top = Math.min(...placement.map(line => line.y >> 16));
  label.dataset.nativeTop = String(top);
  label.dataset.nativeX = String(placement[0]?.x >> 16);
  const lines = placement.map(line => [text[line.kind], (line.y >> 16) - top]);
  const key = `${fontIndex}:${worm.hp}:${JSON.stringify(lines)}`;
  if (label.dataset.nativeLabel === key) {
    label.dataset.nativeWidth = String(existingCanvas.width);
    return true;
  }
  const font = fonts.get(fontIndex);
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
  label.dataset.nativeWidth = String(width);
  canvas.height = Math.max(...lines.map(([, y]) => y)) + font.height;
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
  nativeCanvasPaletteDisplay.capture(canvas);
  label.classList.add("has-native-text");
  label.dataset.nativeLabel = key;
  label.dataset.nativeFont = fontIndex;
  label.setAttribute(
    "aria-label",
    `${worm.name}, ${teamName}, ${worm.hp} health`,
  );
  return true;
}
