import { createNativeTextRenderer, paintNativeTextImage } from "./text-image-art.js";
import { nativeCanvasPaletteDisplay } from "./canvas-palette.js";
import { loadNativeFont } from "./font.js";
import { nativeAnnouncementDraw } from "./announcements.js";

const fontNames = { 15: "stdwht1", 17: "medred1", 18: "medblu1", 19: "medgrn1", 20: "medyel1", 23: "medwht1", 28: "digiwht" };
const fonts = new Map();
const renderers = new WeakMap();
export async function loadNativeAnnouncementArt() {
  await Promise.all(Object.entries(fontNames).map(async ([id, name]) => fonts.set(Number(id), await loadNativeFont(name))));
}
export function updateNativeAnnouncement(state, target, { playback = 0, teamVisible = true } = {}) {
  const entry = state.entries[state.read];
  const height = target.parentElement.clientHeight;
  const draw = nativeAnnouncementDraw(state, height, playback, teamVisible);
  target.hidden = !draw || draw.coverage <= 0 || !fonts.has(draw.font);
  if (target.hidden) return;
  let cache = renderers.get(target);
  const width = target.parentElement.clientWidth;
  if (!cache || cache.renderer.state.width !== width) {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    target.replaceChildren(canvas);
    //004EAF40 allocates screen-width text storage using the medium white font.
    //004A68E0 assigns palette roles7=gray,8=black,9=white.
    const colors = { 7: [157,157,157], 8: [0,0,0], 9: [255,255,255] };
    cache = { canvas, renderer: createNativeTextRenderer(width, fonts.get(23).height + 1,
      id => fonts.get(id), id => colors[id]), key: null };
    renderers.set(target, cache);
  }
  const key = `${entry.font}:${state.scale}:${entry.text}`;
  if (cache.key !== key) {
    const result = cache.renderer.render({ text: entry.text, font: entry.font,
      background: 8, border: 7, coverage: state.scale });
    paintNativeTextImage(cache.canvas, result);
    cache.canvas.style.width = `${result.width}px`;
    cache.canvas.style.height = `${result.height}px`;
    nativeCanvasPaletteDisplay.capture(cache.canvas);
    target.setAttribute("aria-label", entry.text);
    cache.key = key;
  }
  target.style.top = `${Math.trunc(draw.y / 65536 + height / 2) - Math.trunc(cache.canvas.height / 2)}px`;
}
