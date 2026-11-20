// Optional graphics pipeline: lighting and time of day, destruction effects,
// art styles and atmosphere. Everything here is presentation — it reads the
// match (terrain pixels, positions, wind) and never writes to it. With every
// option off the game renders exactly as before, without this pipeline.
import * as THREE from "three";

export const GRAPHICS_KEY = "pocket-siege-graphics-v1";
export const GRAPHICS_OPTIONS = {
  view: { label: "View", values: { flat: "Flat (original)", diorama: "Diorama miniature" } },
  lighting: { label: "Lighting", values: { off: "Off (original)", day: "Daylight shadows", dusk: "Dusk", night: "Night with lamps" } },
  destruction: { label: "Destruction", values: { off: "Original", on: "Shockwaves, scorch and debris" } },
  style: { label: "Art style", values: { none: "Original pixels", crt: "CRT monitor", paper: "Paper cut-out", blueprint: "Blueprint", watercolour: "Ink and watercolour", onebit: "1-bit handheld" } },
  atmosphere: { label: "Atmosphere", values: { off: "Off (original)", auto: "Match the weather", rain: "Rain", snow: "Snow", storm: "Thunderstorm" } },
};
export const defaultGraphics = () => ({ view: "flat", lighting: "off", destruction: "off", style: "none", atmosphere: "off" });

// What the master switch turns on when no custom mix has been chosen yet.
export const SHOWCASE_GRAPHICS = Object.freeze({ view: "diorama", lighting: "dusk", destruction: "on", style: "none", atmosphere: "auto" });
export const GRAPHICS_LAST_KEY = "pocket-siege-graphics-last-v1";
export const isOriginalGraphics = (settings) =>
  Object.entries(defaultGraphics()).every(([key, value]) => settings?.[key] === value);

// One switch for everything: on restores the last mix that was in use (or
// the showcase), off returns to the original look and remembers the mix.
export function toggleAllGraphics(current, storage = globalThis.localStorage) {
  if (!isOriginalGraphics(current)) {
    try { storage?.setItem(GRAPHICS_LAST_KEY, JSON.stringify(sanitizeGraphics(current))); } catch { /* private mode */ }
    return defaultGraphics();
  }
  let last = null;
  try { last = sanitizeGraphics(JSON.parse(storage?.getItem(GRAPHICS_LAST_KEY) || "null")); } catch { /* fall through */ }
  return last && !isOriginalGraphics(last) ? last : { ...SHOWCASE_GRAPHICS };
}

export function sanitizeGraphics(value) {
  const settings = defaultGraphics();
  for (const key of Object.keys(settings))
    if (value && Object.hasOwn(GRAPHICS_OPTIONS[key].values, value[key])) settings[key] = value[key];
  return settings;
}
export function readGraphics(storage = globalThis.localStorage) {
  try {
    const saved = sanitizeGraphics(JSON.parse(storage?.getItem(GRAPHICS_KEY) || "null"));
    // The first diorama build stored its switch under its own key.
    if (storage?.getItem("pocket-siege-diorama") === "1" && !storage?.getItem(GRAPHICS_KEY)) saved.view = "diorama";
    return saved;
  } catch { return defaultGraphics(); }
}
export function writeGraphics(settings, storage = globalThis.localStorage) {
  try { storage?.setItem(GRAPHICS_KEY, JSON.stringify(sanitizeGraphics(settings))); } catch { /* private mode */ }
}

// What falls from the sky for an atmosphere setting, match weather and theme.
export function resolveAtmosphere(setting, weather = "clear", theme = "") {
  if (setting === "off") return { on: false, precipitation: "none", storm: false, cloud: 0 };
  const mode = setting === "auto"
    ? weather === "storm" ? "storm" : weather === "rain" ? "rain" : /snow/.test(theme) ? "snow" : "clear"
    : setting;
  return {
    on: true,
    precipitation: mode === "storm" ? "rain" : mode === "clear" ? "none" : mode,
    storm: mode === "storm",
    cloud: mode === "storm" ? 0.62 : mode === "rain" ? 0.52 : mode === "snow" ? 0.45 : 0.3,
  };
}

const TIMES = {
  off: null,
  day: { ambient: [0.84, 0.86, 0.92], sun: [0.24, 0.22, 0.16], dir: [-0.5, 0.86], reach: 150 },
  dusk: { ambient: [0.4, 0.33, 0.48], sun: [1.0, 0.62, 0.34], dir: [-0.95, 0.32], reach: 300 },
  night: { ambient: [0.13, 0.17, 0.33], sun: [0.16, 0.22, 0.4], dir: [0.55, 0.83], reach: 220 },
};
const STYLE_IDS = { none: 0, crt: 1, paper: 2, blueprint: 3, watercolour: 4, onebit: 5 };
const MAX_LIGHTS = 10, MAX_SHOCKS = 4, MAX_HEAT = 4, DEBRIS = 3000;

const quadVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const compositeFragment = /* glsl */ `
uniform sampler2D scene;
uniform sampler2D land;
uniform vec4 view;
uniform vec2 world;
uniform vec2 pixel;
uniform float time;
uniform float level;
uniform int lighting;
uniform vec3 ambient;
uniform vec3 sunColor;
uniform vec2 sunDir;
uniform float sunReach;
uniform float flash;
uniform vec4 lights[${MAX_LIGHTS}];
uniform vec3 lightColors[${MAX_LIGHTS}];
uniform vec4 shocks[${MAX_SHOCKS}];
uniform vec4 heats[${MAX_HEAT}];
uniform int style;
uniform float tilt;
uniform float focus;
uniform int precipitation;
uniform float wind;
uniform float reflection;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 toWorld(vec2 uv) { return view.xy + uv * view.zw; }
vec2 toUv(vec2 p) { return (p - view.xy) / view.zw; }
float solid(vec2 p) {
  vec2 uv = (floor(p) + 0.5) / world;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return step(0.5, texture2D(land, uv).a);
}
// Fraction of light arriving along a segment through the terrain mask.
float transmit(vec2 from, vec2 to, float skip, float soft, float jitter) {
  vec2 delta = to - from;
  float len = length(delta);
  if (len < 1.0) return 1.0;
  vec2 dir = delta / len;
  float stride = max(len - skip, 0.0) / 12.0, blocked = 0.0;
  for (int i = 0; i < 12; i++)
    blocked += solid(from + dir * (skip + stride * (float(i) + jitter))) * stride;
  return exp(-blocked / soft);
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }

vec3 sampleScene(vec2 uv) {
  vec3 color = texture2D(scene, uv).rgb;
  if (tilt > 0.0) {
    float radius = tilt * smoothstep(0.2, 0.62, abs(uv.y - focus));
    if (radius > 0.05) {
      vec3 sum = color;
      for (int i = 0; i < 10; i++) {
        float angle = float(i) * 2.39996;
        float reach = sqrt((float(i) + 0.5) / 10.0) * radius;
        sum += texture2D(scene, uv + vec2(cos(angle), sin(angle)) * reach * pixel).rgb;
      }
      color = sum / 11.0;
    }
  }
  return color;
}

void main() {
  vec2 uv = vUv;
  if (style == 1) {
    // Curved glass.
    vec2 c = uv * 2.0 - 1.0;
    c *= 1.0 + 0.045 * dot(c, c);
    uv = c * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  }
  vec2 p = toWorld(uv);

  // Shockwave rings and heat haze bend the image.
  vec2 bend = vec2(0.0);
  for (int i = 0; i < ${MAX_SHOCKS}; i++) {
    if (shocks[i].w <= 0.0) continue;
    vec2 away = p - shocks[i].xy;
    float d = length(away);
    float ring = smoothstep(30.0, 0.0, abs(d - shocks[i].z));
    bend += (away / max(d, 1.0)) * ring * shocks[i].w * 14.0;
  }
  for (int i = 0; i < ${MAX_HEAT}; i++) {
    if (heats[i].w <= 0.0) continue;
    vec2 rel = p - heats[i].xy;
    float near = max(0.0, 1.0 - length(rel * vec2(1.0, 0.55) - vec2(0.0, heats[i].z * 0.25)) / heats[i].z);
    bend.x += sin(p.y * 0.3 - time * 11.0) * near * heats[i].w * 2.2;
  }
  uv += bend / view.zw;
  vec3 color = sampleScene(uv);

  // Mirror image on the water, broken up by ripples.
  if (reflection > 0.0 && p.y < level) {
    float depth = level - p.y;
    vec2 mirrored = vec2(p.x + sin(p.y * 0.35 + time * 2.4) * (1.5 + depth * 0.04), level + depth * 1.2);
    vec2 ruv = toUv(mirrored);
    if (ruv.y < 1.0 && ruv.x > 0.0 && ruv.x < 1.0)
      color = mix(color, texture2D(scene, ruv).rgb, reflection * smoothstep(90.0, 0.0, depth));
  }

  float jitter = hash(gl_FragCoord.xy + fract(time) * 7.0);
  float inside = solid(p);
  if (lighting > 0) {
    // Terrain lets light a little way in, so lit faces read as surfaces;
    // open air behind terrain falls into shadow.
    float soft = mix(9.0, 46.0, inside);
    float sunLit = transmit(p, p + sunDir * sunReach, mix(2.0, 5.0, inside), mix(14.0, 90.0, inside), jitter);
    vec3 light = ambient + sunColor * sunLit + vec3(flash);
    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
      if (lights[i].w <= 0.0) continue;
      float d = distance(p, lights[i].xy);
      if (d >= lights[i].z) continue;
      float fall = 1.0 - d / lights[i].z;
      light += lightColors[i] * lights[i].w * fall * fall * transmit(p, lights[i].xy, 3.0, soft, jitter);
    }
    color *= light;
  } else {
    // Without the lighting model, effect lights still glow additively
    // (the diorama terrain shades them itself).
    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
      if (lights[i].w <= 0.0 || tilt > 0.0) continue;
      float fall = max(0.0, 1.0 - distance(p, lights[i].xy) / lights[i].z);
      color += color * lightColors[i] * lights[i].w * fall * fall * 0.6;
    }
    color += vec3(flash) * 0.35;
  }

  // Rain and snow fall in world space and stay out from under cover.
  if (precipitation > 0 && p.y > level) {
    vec2 fall = normalize(vec2(clamp(wind, -1.0, 1.0) * (precipitation == 1 ? 0.4 : 0.6), -1.0));
    float open = 1.0;
    for (int i = 1; i <= 6; i++) open *= 1.0 - solid(p - fall * float(i) * 34.0);
    open *= mix(1.0, 0.45, inside);
    if (precipitation == 1) {
      vec2 q = vec2(p.x + p.y * fall.x / -fall.y, p.y);
      float column = floor(q.x / 5.0);
      float seed = hash(vec2(column, 3.0));
      float along = fract(q.y / (150.0 + 90.0 * seed) + time * (2.6 + seed * 1.4) + seed * 9.0);
      float streak = step(0.86, along) * step(0.62, hash(vec2(column, 11.0))) * step(fract(q.x / 5.0), 0.3);
      color = mix(color, vec3(0.62, 0.72, 0.9), streak * 0.42 * open);
    } else {
      for (int layer = 0; layer < 2; layer++) {
        float size = layer == 0 ? 26.0 : 41.0;
        vec2 q = p + vec2(sin(time * 0.7 + p.y * 0.02) * 9.0 - clamp(wind, -1.0, 1.0) * time * 14.0, time * (34.0 + float(layer) * 18.0));
        vec2 cell = floor(q / size);
        vec2 centre = (vec2(hash(cell), hash(cell + 7.3)) * 0.7 + 0.15) * size;
        float flake = step(distance(q - cell * size, centre), 1.6 + float(layer) * 0.6) * step(0.35, hash(cell + 2.1));
        color = mix(color, vec3(0.95, 0.97, 1.0), flake * 0.85 * open);
      }
    }
  }

  if (style == 1) {
    // Phosphor mask, scanlines and glow.
    float line = 0.82 + 0.18 * sin(gl_FragCoord.y * 3.14159);
    float column = mod(gl_FragCoord.x, 3.0);
    vec3 mask = vec3(column < 1.0 ? 1.12 : 0.92, column >= 1.0 && column < 2.0 ? 1.12 : 0.92, column >= 2.0 ? 1.12 : 0.92);
    vec3 glow = (texture2D(scene, uv + vec2(3.0, 0.0) * pixel).rgb + texture2D(scene, uv - vec2(3.0, 0.0) * pixel).rgb) * 0.5;
    color = (color * 1.3 + glow * 0.2) * line * mask;
    vec2 c = vUv - 0.5;
    color *= 1.0 - 0.8 * dot(c, c) * dot(c, c) * 4.0;
  } else if (style == 2) {
    // Flat card layers: posterised colour, white cut edges, cast shadows.
    vec3 g = pow(color, vec3(1.0 / 2.2));
    g = floor(g * 5.0 + 0.5) / 5.0;
    g = mix(vec3(luma(g)), g, 0.85);
    float edge = inside * (1.0 - solid(p + vec2(0.0, 3.0)) * solid(p + vec2(3.0, 0.0)) * solid(p - vec2(3.0, 0.0)));
    g = mix(g, vec3(0.97, 0.95, 0.9), edge * 0.8);
    float shadow = (1.0 - inside) * solid(p + vec2(-7.0, 9.0));
    g *= 1.0 - shadow * 0.32;
    g *= 0.93 + 0.07 * hash(floor(p * 0.75));
    color = toLinear(g);
  } else if (style == 3) {
    // White line drawing on a ruled blue sheet.
    float e = abs(luma(texture2D(scene, uv + vec2(pixel.x, 0.0)).rgb) - luma(texture2D(scene, uv - vec2(pixel.x, 0.0)).rgb))
            + abs(luma(texture2D(scene, uv + vec2(0.0, pixel.y)).rgb) - luma(texture2D(scene, uv - vec2(0.0, pixel.y)).rgb));
    float lines = smoothstep(0.02, 0.12, e);
    vec2 grid = abs(fract(p / 50.0) - 0.5);
    float rule = step(0.485, max(grid.x, grid.y)) * 0.1;
    float hatch = inside * step(0.8, fract((p.x + p.y) / 7.0)) * 0.16;
    vec3 g = vec3(0.07, 0.2, 0.47) + vec3(0.75, 0.86, 1.0) * (rule + hatch + lines * 0.95) + luma(color) * 0.1;
    color = toLinear(g);
  } else if (style == 4) {
    // Soft washes on grain with darker ink where shapes meet.
    vec3 wash = color;
    for (int i = 0; i < 6; i++) {
      float angle = float(i) * 1.0472;
      wash += texture2D(scene, uv + vec2(cos(angle), sin(angle)) * 2.6 * pixel).rgb;
    }
    wash /= 7.0;
    float e = abs(luma(texture2D(scene, uv + vec2(pixel.x * 1.5, 0.0)).rgb) - luma(texture2D(scene, uv - vec2(pixel.x * 1.5, 0.0)).rgb))
            + abs(luma(texture2D(scene, uv + vec2(0.0, pixel.y * 1.5)).rgb) - luma(texture2D(scene, uv - vec2(0.0, pixel.y * 1.5)).rgb));
    vec3 g = pow(mix(color, wash, 0.8), vec3(1.0 / 2.2));
    g = mix(g, vec3(0.96, 0.94, 0.88), 0.18);
    g = floor(g * 14.0 + 0.5) / 14.0;
    g *= 0.9 + 0.1 * hash(floor(p * 0.5));
    g *= 1.0 - smoothstep(0.03, 0.2, e) * 0.55;
    color = toLinear(g);
  } else if (style == 5) {
    // Two tones, ordered dither, chunky pixels.
    vec2 block = floor(gl_FragCoord.xy / 2.0);
    float tone = pow(luma(texture2D(scene, (block * 2.0 + 1.0) * pixel).rgb * (lighting > 0 ? ambient + sunColor : vec3(1.0))), 1.0 / 2.2);
    tone = smoothstep(0.12, 0.78, tone);
    vec2 b = mod(block, 4.0);
    float threshold = (mod(b.x + b.y * 2.0, 4.0) * 4.0 + mod(b.y * 3.0 + b.x * 2.0, 4.0) + 0.5) / 16.0;
    color = toLinear(tone > threshold * 0.8 + 0.1 ? vec3(0.78, 0.83, 0.56) : vec3(0.13, 0.19, 0.13));
  }

  if (tilt > 0.0) {
    color = mix(vec3(luma(color)), color, 1.12);
    vec2 c = vUv - 0.5;
    color *= 1.0 - 0.38 * smoothstep(0.25, 0.85, dot(c, c) * 2.0);
  }
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

const worldVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// Burn marks stay on whatever terrain is left around a crater.
const scorchFragment = /* glsl */ `
uniform sampler2D scorch;
uniform sampler2D land;
varying vec2 vUv;
void main() {
  float burn = texture2D(scorch, vUv).a * step(0.5, texture2D(land, vUv).a);
  if (burn < 0.01) discard;
  gl_FragColor = vec4(0.012, 0.008, 0.006, burn * 0.82);
}`;

const cloudFragment = /* glsl */ `
uniform float drift;
uniform float cover;
uniform float dark;
uniform vec2 band;
varying vec3 vWorld;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  // Chunky sampling keeps the clouds in the pixel-art register.
  vec2 p = floor(vWorld.xy / 3.0) * 3.0;
  p.x -= drift;
  float n = noise(p / vec2(210.0, 90.0)) * 0.55 + noise(p / vec2(90.0, 42.0)) * 0.3 + noise(p / vec2(34.0, 18.0)) * 0.15;
  float body = smoothstep(1.0 - cover, 1.0 - cover + 0.12, n);
  body *= smoothstep(band.x, band.y, vWorld.y);
  if (body < 0.02) discard;
  float top = smoothstep(1.0 - cover + 0.08, 1.0 - cover + 0.3, n);
  vec3 color = mix(vec3(0.72, 0.76, 0.86), vec3(1.0), top) * (1.0 - dark);
  gl_FragColor = vec4(color, body * 0.62);
  #include <colorspace_fragment>
}`;

const debrisVertex = /* glsl */ `
attribute vec2 velocity;
attribute float birth;
attribute float size;
attribute vec3 tint;
uniform float time;
uniform float level;
uniform float bufferHeight;
varying vec3 vTint;
varying float vFade;
void main() {
  float age = time - birth;
  vec2 p = position.xy + velocity * age + vec2(0.0, -310.0 * age * age);
  float life = 1.5;
  bool alive = age >= 0.0 && age < life && p.y > level - 6.0;
  vTint = tint;
  vFade = alive ? smoothstep(life, life - 0.35, age) : 0.0;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, position.z, 1.0);
  gl_PointSize = alive ? max(1.0, size * projectionMatrix[1][1] * bufferHeight * 0.5 / gl_Position.w) : 0.0;
}`;
const debrisFragment = /* glsl */ `
varying vec3 vTint;
varying float vFade;
void main() {
  if (vFade <= 0.0) discard;
  gl_FragColor = vec4(pow(vTint, vec3(2.2)), vFade);
  #include <colorspace_fragment>
}`;

export function createFx({ renderer, scene, group, land, landTexture, landContext, backdrop, reducedMotion = false }) {
  let settings = defaultGraphics();
  const clock = { value: 0 };
  let lastNow = 0;
  const lights = Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4());
  const lightColors = Array.from({ length: MAX_LIGHTS }, () => new THREE.Color());
  const live = [];
  const shockUniform = Array.from({ length: MAX_SHOCKS }, () => new THREE.Vector4());
  const heatUniform = Array.from({ length: MAX_HEAT }, () => new THREE.Vector4());
  const shocks = [], heats = [];
  let flash = 0, nextFlash = 3;

  const composite = new THREE.ShaderMaterial({
    vertexShader: quadVertex, fragmentShader: compositeFragment, depthTest: false, depthWrite: false,
    uniforms: {
      scene: { value: null }, land: { value: landTexture },
      view: { value: new THREE.Vector4() }, world: { value: new THREE.Vector2(1, 1) },
      pixel: { value: new THREE.Vector2() }, time: clock, level: { value: 0 },
      lighting: { value: 0 }, ambient: { value: new THREE.Vector3(1, 1, 1) },
      sunColor: { value: new THREE.Vector3() }, sunDir: { value: new THREE.Vector2(0, 1) },
      sunReach: { value: 200 }, flash: { value: 0 },
      lights: { value: lights }, lightColors: { value: lightColors },
      shocks: { value: shockUniform }, heats: { value: heatUniform },
      style: { value: 0 }, tilt: { value: 0 }, focus: { value: 0.5 },
      precipitation: { value: 0 }, wind: { value: 0 }, reflection: { value: 0 },
    },
  });
  const quadScene = new THREE.Scene(), quadCamera = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), composite);
  quad.frustumCulled = false;
  quadScene.add(quad);
  let frameTarget = null;

  // Scorch layer: a half-resolution canvas the size of the world.
  const scorchCanvas = document.createElement("canvas");
  const scorchContext = scorchCanvas.getContext("2d");
  const scorchTexture = new THREE.CanvasTexture(scorchCanvas);
  scorchTexture.generateMipmaps = false;
  scorchTexture.minFilter = scorchTexture.magFilter = THREE.LinearFilter;
  const scorch = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    vertexShader: worldVertex, fragmentShader: scorchFragment, transparent: true, depthWrite: false,
    uniforms: { scorch: { value: scorchTexture }, land: { value: landTexture } },
  }));
  scorch.visible = false; scorch.frustumCulled = false;
  group.add(scorch);
  let worldW = 0, worldH = 0;
  function resetWorld(W, H) {
    worldW = W; worldH = H;
    scorchCanvas.width = Math.max(1, Math.ceil(W / 2));
    scorchCanvas.height = Math.max(1, Math.ceil(H / 2));
    scorchTexture.dispose();
    scorchTexture.needsUpdate = true;
    scorch.scale.set(W, H, 1);
    scorch.position.set(W / 2, H / 2, 0.5);
    shocks.length = heats.length = live.length = 0;
    birth.fill(-100); debrisGeometry.attributes.birth.needsUpdate = true;
  }

  // Debris: stateless GPU particles, coloured from the ground they left.
  const debrisGeometry = new THREE.BufferGeometry();
  const origin = new Float32Array(DEBRIS * 3), velocity = new Float32Array(DEBRIS * 2);
  const birth = new Float32Array(DEBRIS).fill(-100), size = new Float32Array(DEBRIS), tint = new Float32Array(DEBRIS * 3);
  debrisGeometry.setAttribute("position", new THREE.BufferAttribute(origin, 3));
  debrisGeometry.setAttribute("velocity", new THREE.BufferAttribute(velocity, 2));
  debrisGeometry.setAttribute("birth", new THREE.BufferAttribute(birth, 1));
  debrisGeometry.setAttribute("size", new THREE.BufferAttribute(size, 1));
  debrisGeometry.setAttribute("tint", new THREE.BufferAttribute(tint, 3));
  const debrisMaterial = new THREE.ShaderMaterial({
    vertexShader: debrisVertex, fragmentShader: debrisFragment, transparent: true, depthWrite: false,
    uniforms: { time: clock, level: { value: 0 }, bufferHeight: { value: 1 } },
  });
  const debris = new THREE.Points(debrisGeometry, debrisMaterial);
  debris.frustumCulled = false; debris.visible = false;
  group.add(debris);
  let debrisCursor = 0;
  function spawnDebris(x, y, radius) {
    if (reducedMotion || !worldW) return 0;
    const r = Math.ceil(radius), left = Math.max(0, Math.floor(x - r)), top = Math.max(0, Math.floor(worldH - y - r));
    const width = Math.min(worldW, Math.ceil(x + r)) - left, height = Math.min(worldH, Math.ceil(worldH - y + r)) - top;
    if (width <= 0 || height <= 0) return 0;
    const pixels = landContext.getImageData(left, top, width, height).data;
    const count = Math.round(Math.max(60, Math.min(420, radius * 5)));
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      let px = 0, py = 0, at = -1;
      for (let attempt = 0; attempt < 4 && at < 0; attempt++) {
        const angle = Math.random() * Math.PI * 2, reach = Math.sqrt(Math.random()) * radius;
        px = Math.floor(x + Math.cos(angle) * reach) - left;
        py = Math.floor(worldH - (y + Math.sin(angle) * reach)) - top;
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        if (pixels[(py * width + px) * 4 + 3] > 0) at = (py * width + px) * 4;
      }
      if (at < 0) continue;
      const slot = debrisCursor = (debrisCursor + 1) % DEBRIS;
      const wx = left + px + 0.5, wy = worldH - (top + py) - 0.5;
      const away = Math.atan2(wy - y, wx - x) + (Math.random() - 0.5) * 0.9;
      const speed = 110 + Math.random() * 330;
      origin.set([wx, wy, 30], slot * 3);
      velocity.set([Math.cos(away) * speed, Math.sin(away) * speed + 150], slot * 2);
      birth[slot] = clock.value;
      size[slot] = 1.4 + Math.random() * 2.2;
      tint.set([pixels[at] / 255, pixels[at + 1] / 255, pixels[at + 2] / 255], slot * 3);
      spawned++;
    }
    for (const attribute of Object.values(debrisGeometry.attributes)) attribute.needsUpdate = true;
    return spawned;
  }

  const cloudMaterial = new THREE.ShaderMaterial({
    vertexShader: worldVertex, fragmentShader: cloudFragment, transparent: true, depthWrite: false,
    uniforms: { drift: { value: 0 }, cover: { value: 0.3 }, dark: { value: 0 }, band: { value: new THREE.Vector2() } },
  });
  const clouds = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cloudMaterial);
  clouds.visible = false; clouds.frustumCulled = false;
  scene.add(clouds); // far layer: not part of the flattened gameplay group
  const backdropHome = backdrop.position.clone();

  function addLight(x, y, radius, color = 0xffa24a, power = 2, life = 0.6) {
    if (live.length >= MAX_LIGHTS) live.shift();
    live.push({ x, y, radius, color: new THREE.Color(color), power, life, age: 0, held: false });
  }
  // A light for this frame only; call every frame for a steady source.
  function glow(x, y, radius, color, power) {
    if (live.length >= MAX_LIGHTS) return;
    live.push({ x, y, radius, color: new THREE.Color(color), power, life: 0, age: 0, held: true });
  }

  // Called before the terrain is carved, so debris can take its colours.
  function explosion(x, y, radius, bright = false) {
    const wants = settings.lighting !== "off" || settings.view === "diorama" || settings.destruction === "on";
    if (wants) addLight(x, y, Math.max(170, radius * 4.5), bright ? 0xfff2c0 : 0xffa24a, 2.2, 0.7);
    if (settings.destruction !== "on") return;
    if (!reducedMotion) {
      if (shocks.length >= MAX_SHOCKS) shocks.shift();
      shocks.push({ x, y, age: 0, life: 0.55, reach: Math.max(160, radius * 5), strength: Math.min(1.6, radius / 45) });
      if (heats.length >= MAX_HEAT) heats.shift();
      heats.push({ x, y, radius: Math.max(70, radius * 2), age: 0, life: 2.2 });
    }
    spawnDebris(x, y, radius);
    const sx = x / 2, sy = (worldH - y) / 2, reach = (radius * 1.75) / 2;
    const burn = scorchContext.createRadialGradient(sx, sy, reach * 0.45, sx, sy, reach);
    burn.addColorStop(0, "rgba(0,0,0,0.72)");
    burn.addColorStop(1, "rgba(0,0,0,0)");
    scorchContext.fillStyle = burn;
    scorchContext.fillRect(sx - reach, sy - reach, reach * 2, reach * 2);
    scorchTexture.needsUpdate = true;
  }

  function apply(next) {
    settings = sanitizeGraphics({ ...settings, ...next });
    const destruction = settings.destruction === "on";
    scorch.visible = debris.visible = destruction;
    if (!destruction) { shocks.length = heats.length = 0; }
    if (settings.atmosphere === "off") {
      clouds.visible = false;
      backdrop.position.x = backdropHome.x; backdrop.position.y = backdropHome.y;
    }
    return settings;
  }
  const active = () => Object.entries(settings).some(([key, value]) => value !== defaultGraphics()[key]);

  // Renders the scene through the pipeline. `camera` is the game's flat
  // camera, or the diorama's when that view is on.
  // wind is normalised: -1 (full left) to 1 (full right).
  function render({ camera, view, W, H, level, now, wind = 0, weather = "clear", theme = "", tilt = 0, focusY = 0.5, flat = true }) {
    const dt = Math.min(0.1, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    if (!reducedMotion) clock.value += dt;
    if (W !== worldW || H !== worldH) resetWorld(W, H);
    const uniforms = composite.uniforms;
    uniforms.view.value.set(view.x, view.y, view.w, view.h);
    uniforms.world.value.set(W, H);
    uniforms.level.value = level;
    debrisMaterial.uniforms.level.value = level;

    const air = resolveAtmosphere(settings.atmosphere, weather, theme);
    clouds.visible = air.on;
    if (air.on) {
      const cx = view.x + view.w / 2, cy = view.y + view.h / 2;
      const span = W + 4096;
      clouds.scale.set(span, H * 0.75 + 2400, 1);
      cloudMaterial.uniforms.band.value.set(H * 0.5, H * 0.82);
      // In the flat view depth is faked by sliding far layers with the camera.
      const slide = flat ? 0.3 : 0;
      clouds.position.set(W / 2 + (cx - W / 2) * slide, H * 0.45 + (H * 0.75 + 2400) / 2 + (cy - H / 2) * slide * 0.5, backdropHome.z + 8);
      backdrop.position.x = backdropHome.x + (flat ? (cx - W / 2) * 0.16 : 0);
      backdrop.position.y = backdropHome.y + (flat ? (cy - H / 2) * 0.08 : 0);
      // Drift accumulates, so a wind change bends the motion instead of jumping.
      if (!reducedMotion) cloudMaterial.uniforms.drift.value += dt * (Math.max(-1, Math.min(1, wind)) * 24 + (wind < 0 ? -4 : 4));
      cloudMaterial.uniforms.cover.value = air.cloud;
      cloudMaterial.uniforms.dark.value = air.storm ? 0.5 : air.precipitation === "rain" ? 0.28 : 0;
    }
    uniforms.precipitation.value = air.precipitation === "rain" ? 1 : air.precipitation === "snow" ? 2 : 0;
    uniforms.wind.value = wind;
    uniforms.reflection.value = air.on ? 0.34 : 0;
    if (air.storm && !reducedMotion) {
      nextFlash -= dt;
      if (nextFlash <= 0) { flash = 0.9 + Math.random() * 0.5; nextFlash = 2.5 + Math.random() * 7; }
    }
    flash *= Math.exp(-dt * 7);
    if (flash < 0.01) flash = 0;
    uniforms.flash.value = flash;

    const mood = TIMES[settings.lighting];
    uniforms.lighting.value = mood ? Object.keys(TIMES).indexOf(settings.lighting) : 0;
    if (mood) {
      const dim = air.storm ? 0.62 : air.precipitation === "rain" ? 0.8 : 1;
      uniforms.ambient.value.fromArray(mood.ambient).multiplyScalar(dim);
      uniforms.sunColor.value.fromArray(mood.sun).multiplyScalar(dim * dim);
      uniforms.sunDir.value.fromArray(mood.dir).normalize();
      uniforms.sunReach.value = mood.reach;
    }
    uniforms.style.value = STYLE_IDS[settings.style] ?? 0;
    uniforms.tilt.value = tilt;
    uniforms.focus.value += (focusY - uniforms.focus.value) * (1 - Math.exp(-dt * 4));

    for (let i = live.length - 1; i >= 0; i--) {
      const light = live[i];
      if (light.held) continue;
      light.age += dt;
      if (light.age >= light.life) live.splice(i, 1);
    }
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const light = live[i];
      if (!light) { lights[i].set(0, 0, 1, 0); continue; }
      const fade = light.held ? 1 : (1 - light.age / light.life) ** 2;
      lights[i].set(light.x, light.y, light.radius, light.power * fade);
      lightColors[i].copy(light.color);
    }
    for (let i = live.length - 1; i >= 0; i--) if (live[i].held) live.splice(i, 1);
    for (let i = shocks.length - 1; i >= 0; i--) if ((shocks[i].age += dt) >= shocks[i].life) shocks.splice(i, 1);
    for (let i = heats.length - 1; i >= 0; i--) if ((heats[i].age += dt) >= heats[i].life) heats.splice(i, 1);
    for (let i = 0; i < MAX_SHOCKS; i++) {
      const shock = shocks[i];
      if (!shock) { shockUniform[i].set(0, 0, 0, 0); continue; }
      const t = shock.age / shock.life;
      shockUniform[i].set(shock.x, shock.y, shock.reach * (1 - (1 - t) ** 2), shock.strength * (1 - t));
    }
    for (let i = 0; i < MAX_HEAT; i++) {
      const heat = heats[i];
      if (!heat) { heatUniform[i].set(0, 0, 1, 0); continue; }
      heatUniform[i].set(heat.x, heat.y, heat.radius, 1 - heat.age / heat.life);
    }

    const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
    if (!frameTarget || frameTarget.width !== buffer.x || frameTarget.height !== buffer.y) {
      frameTarget?.dispose();
      frameTarget = new THREE.WebGLRenderTarget(buffer.x, buffer.y, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    }
    debrisMaterial.uniforms.bufferHeight.value = buffer.y;
    uniforms.pixel.value.set(1 / buffer.x, 1 / buffer.y);
    renderer.setRenderTarget(frameTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    uniforms.scene.value = frameTarget.texture;
    renderer.render(quadScene, quadCamera);
  }

  return {
    get settings() { return { ...settings }; },
    get active() { return active(); },
    lights, lightColors,
    apply, render, explosion, addLight, glow, resetWorld,
    counts: () => ({ lights: live.length, shocks: shocks.length, heats: heats.length }),
  };
}
