// Display adapter for004A27B0/004ADFC0. Evaluate the native integer RGB
// operations after Three's output conversion, before alpha compositing.
// Only uniforms change: cached sprite canvases/textures retain source pixels.
export class NativePaletteDisplay {
  constructor() {
    this.flash = { value: 0 };
    this.fade = { value: 0 };
    this.dark = { value: 0 };
    this.materials = new WeakMap();
  }
  update({ flash = 0, fade = 0, dark = 0, extra = 0 } = {}) {
    const clamp = value => Math.max(0, Math.min(65536, value));
    this.flash.value = clamp(flash);
    this.fade.value = clamp(fade);
    this.dark.value = clamp(Math.max(dark, extra));
  }
  bind(material, bank) {
    let state = this.materials.get(material);
    if (state) { state.bank.value = bank; return material; }
    state = { bank: { value: bank } };
    this.materials.set(material, state);
    const compile = material.onBeforeCompile;
    const key = material.customProgramCacheKey.bind(material);
    const previousKey = key();
    material.onBeforeCompile = (shader, renderer) => {
      compile.call(material, shader, renderer);
      Object.assign(shader.uniforms, {
        nativePaletteBank: state.bank,
        nativePaletteFlash: this.flash,
        nativePaletteFade: this.fade,
        nativePaletteDark: this.dark,
      });
      shader.fragmentShader = `
uniform float nativePaletteBank;
uniform float nativePaletteFlash;
uniform float nativePaletteFade;
uniform float nativePaletteDark;
vec3 nativeBlendRGB(vec3 rgb, float target, float amount) {
  return rgb + floor((vec3(target) - rgb) * amount / 65536.0);
}
` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <colorspace_fragment>", `
#include <colorspace_fragment>
if (nativePaletteFade != 0.0 || nativePaletteDark != 0.0 ||
    (nativePaletteBank == 2.0 && nativePaletteFlash != 0.0)) {
  vec3 rgb = floor(gl_FragColor.rgb * 255.0 + 0.5);
  if (nativePaletteBank == 2.0) rgb = nativeBlendRGB(rgb, 255.0, nativePaletteFlash);
  rgb = nativeBlendRGB(rgb, 255.0, nativePaletteFade);
  rgb = nativeBlendRGB(rgb, 0.0, nativePaletteDark);
  gl_FragColor.rgb = rgb / 255.0;
}
`);
    };
    material.customProgramCacheKey = () => `${previousKey}:native-palette-v1`;
    material.needsUpdate = true;
    return material;
  }
}

export const nativePaletteDisplay = new NativePaletteDisplay();
