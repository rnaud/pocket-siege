import { nativeAnnouncementFrame } from './announcements.js';

//004C67A0. Image allocation, font rasterization and indexed drawing are interfaces.
export function nativeRenderTextImage(state, request, host) {
  const { text, font, background, border, coverage } = request;
  if (state.font === font && state.background === background && state.border === border &&
      state.coverage === coverage && state.text === text)
    return { image: state.image, width: state.cachedWidth, height: state.cachedHeight };
  if (background) host.fill(state.baseImage, 0, 0, state.width, state.height, background);
  else host.clear(state.baseImage);
  const measured = host.text(font, state.baseImage, border ? 4 : 0, 0, text);
  if (border) {
    for (const [kind, ...args] of nativeAnnouncementFrame(measured.width, measured.height, border))
      host[kind](state.baseImage, ...args);
  }
  const width = Math.min(state.width, (measured.width + (border ? 7 : 1)) | 0);
  const height = Math.min(state.height, (measured.height + 1) | 0);
  if (coverage < 65536 && state.coverage !== coverage) {
    if (!state.fadedImage) {
      const image = host.allocate(0x2c);
      if (image) host.initialize(image, state.width, state.height, 8);
      state.fadedImage = image;
    }
    host.copy(state.fadedImage, 0, 0, width, height, state.baseImage, 0, 0, 0);
    host.mask(state.fadedImage, width, height, 0, state.seed, coverage);
    state.image = state.fadedImage;
    state.seed = (Math.imul(state.seed, 0x19660d) + 0x3c6ef35f) | 0;
  } else state.image = state.baseImage;
  Object.assign(state, { text, font, background, border, coverage, cachedWidth: width, cachedHeight: height });
  return { image: state.image, width, height };
}
