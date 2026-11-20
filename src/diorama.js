// Diorama renderer: an optional presentation of the unchanged 2D match as a
// lit miniature. The gameplay plane (z = 0) keeps its exact on-screen mapping
// through an off-axis projection, so aiming, labels and the HUD stay correct;
// only what lies behind the plane (extruded terrain, sea, backdrop) moves
// with the eye. Nothing here is read by the simulation.
import * as THREE from "three";

const DEPTH = 88; // world pixels the terrain extends behind the gameplay plane
const BACK = 180; // backdrop distance behind the gameplay plane
const LAYER_FLATTEN = 0.04;
const FRONT = 2; // the flattened water curtain sits just in front of the terrain
const MAX_BLOBS = 12; // contact shadows under worms
const MAX_LIGHTS = 10; // matches the shared light list in fx.js

const landVertex = /* glsl */ `
varying vec2 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xy;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const landFragment = /* glsl */ `
uniform sampler2D map;
uniform sampler2D relief;
uniform vec2 size;
uniform vec3 eye;
uniform float depth;
uniform float waterLevel;
uniform vec3 sun;
uniform vec4 lights[${MAX_LIGHTS}];
uniform vec3 lightColors[${MAX_LIGHTS}];
uniform float lightGain;
uniform vec3 blobs[${MAX_BLOBS}];
varying vec2 vWorld;

vec4 texel(vec2 p) {
  vec2 uv = (floor(p) + 0.5) / size;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(map, uv);
}
float solidity(vec2 p) { return texture2D(relief, (floor(p) + 0.5) / size).r; }
vec2 slopeAt(vec2 p) {
  return vec2(solidity(p + vec2(2.0, 0.0)) - solidity(p - vec2(2.0, 0.0)),
              solidity(p + vec2(0.0, 2.0)) - solidity(p - vec2(0.0, 2.0)));
}
vec3 dynamicLight(vec3 position, vec3 normal) {
  vec3 total = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    vec4 light = lights[i];
    if (light.w <= 0.0) continue;
    vec3 toLight = vec3(light.xy, 26.0) - position;
    float reach = max(0.0, 1.0 - length(toLight.xy) / light.z);
    float facing = 0.35 + 0.65 * max(0.0, dot(normal, normalize(toLight)));
    total += lightColors[i] * light.w * reach * reach * facing;
  }
  return total;
}
void main() {
  vec3 ray = normalize(vec3(vWorld, 0.0) - eye);
  vec4 front = texel(vWorld);
  vec3 color, normal, position;
  float shade;
  if (front.a > 0.5) {
    // Front face: the original pixels, with a soft bevel from the relief.
    vec2 g = slopeAt(vWorld);
    normal = normalize(vec3(-g * 2.2, 1.0));
    position = vec3(vWorld, 0.0);
    color = front.rgb;
    shade = 0.82 + 0.5 * dot(normal.xy, sun.xy);
    // A bright lip where the front face meets a top surface, and a soft
    // crease under overhangs, separate the face from the depth behind it.
    float lip = (1.0 - texel(vWorld + vec2(0.0, 2.0)).a) * texel(vWorld - vec2(0.0, 2.0)).a;
    float under = (1.0 - texel(vWorld - vec2(0.0, 3.0)).a);
    shade += lip * 0.22 - under * 0.14;
  } else {
    // Empty at the gameplay plane: march the ray back through the slab.
    vec2 stride = ray.xy / -ray.z;
    float hit = -1.0, previous = 0.0;
    for (int i = 1; i <= 48; i++) {
      float d = depth * float(i) / 48.0;
      if (texel(vWorld + stride * d).a > 0.5) { hit = d; break; }
      previous = d;
    }
    if (hit < 0.0) discard;
    for (int i = 0; i < 4; i++) {
      float middle = 0.5 * (previous + hit);
      if (texel(vWorld + stride * middle).a > 0.5) hit = middle; else previous = middle;
    }
    vec2 p = vWorld + stride * hit;
    // The sea surface hides walls the ray reaches after dipping under it.
    if (vWorld.y >= waterLevel && p.y < waterLevel) discard;
    vec2 g = slopeAt(p);
    vec2 outward = length(g) > 0.001 ? -normalize(g) : -normalize(stride + 0.0001);
    normal = vec3(outward, 0.0);
    position = vec3(p, -hit);
    // Sample a little way inside the terrain so walls show its material
    // rather than one smeared edge pixel.
    vec4 inner = vec4(0.0);
    for (int i = 0; i < 4; i++) {
      vec4 t = texel(p - outward * (1.5 + float(i) * 2.5) + vec2(float(i) - 1.5, 0.0) * abs(outward.y));
      inner += vec4(t.rgb, 1.0) * t.a;
    }
    vec3 material = inner.a > 0.0 ? inner.rgb / inner.a : texel(p).rgb;
    float top = smoothstep(0.35, 0.8, outward.y);
    // Sides read as strata: darker with depth, faintly banded. Tops stay
    // close to the surface colour so the ground plane is legible.
    float band = 0.92 + 0.08 * step(0.5, fract(hit / 11.0 + p.y / 23.0));
    vec3 side = material * band * mix(vec3(0.95), vec3(0.55, 0.5, 0.56), hit / depth);
    vec3 cap = mix(texel(p).rgb, material, 0.5) * mix(1.12, 0.86, hit / depth);
    color = mix(side, cap, top);
    shade = mix((0.46 + 0.54 * max(0.0, dot(normal, sun))) * mix(1.0, 0.6, hit / depth), 1.0, top);
    // Worms and objects standing on a top surface darken it beneath them.
    float contact = 0.0;
    for (int i = 0; i < ${MAX_BLOBS}; i++) {
      if (blobs[i].z <= 0.0) continue;
      vec2 d = abs(p - blobs[i].xy);
      contact = max(contact, (1.0 - smoothstep(3.0, 12.0, d.x)) * (1.0 - smoothstep(4.0, 12.0, d.y)) * blobs[i].z);
    }
    shade *= 1.0 - top * contact * 0.55 * (1.0 - smoothstep(4.0, 34.0, hit));
  }
  vec3 lit = color * shade + color * dynamicLight(position, normal) * lightGain;
  gl_FragColor = vec4(lit, 1.0);
  #include <colorspace_fragment>
}`;

const blurFragment = /* glsl */ `
uniform sampler2D source;
uniform vec2 direction;
varying vec2 vUv;
void main() {
  float total = 0.0;
  total += texture2D(source, vUv).a * 0.1964;
  for (int i = 1; i <= 5; i++) {
    float weight = i == 1 ? 0.1747 : i == 2 ? 0.1210 : i == 3 ? 0.0655 : i == 4 ? 0.0278 : 0.0128;
    total += (texture2D(source, vUv + direction * float(i)).a +
              texture2D(source, vUv - direction * float(i)).a) * weight;
  }
  gl_FragColor = vec4(total, total, total, total);
}`;

const quadVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Cast shadow of the island on the painted backdrop.
const shadowFragment = /* glsl */ `
uniform sampler2D relief;
uniform vec2 size;
varying vec2 vUv;
void main() {
  float cover = 0.0;
  for (int x = -2; x <= 2; x++)
    for (int y = -2; y <= 2; y++)
      cover += texture2D(relief, vUv + vec2(float(x), float(y)) * 7.0 / size).r;
  gl_FragColor = vec4(0.02, 0.03, 0.08, smoothstep(0.0, 1.0, cover / 25.0) * 0.42);
}`;

const seaVertex = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const seaFragment = /* glsl */ `
uniform float time;
uniform vec3 tint;
uniform sampler2D map;
uniform vec2 size;
uniform float depth;
uniform vec4 lights[${MAX_LIGHTS}];
uniform vec3 lightColors[${MAX_LIGHTS}];
varying vec3 vWorld;
float land(float x, float y) {
  vec2 uv = (floor(vec2(x, y)) + 0.5) / size;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return step(0.5, texture2D(map, uv).a);
}
void main() {
  float far = clamp(-vWorld.z / ${BACK.toFixed(1)}, 0.0, 1.0);
  // Stepped ripples keep the surface in the pixel-art register.
  float ripple = sin(vWorld.x * 0.11 + sin(vWorld.z * 0.21 + time * 0.9) * 2.0 + time * 1.3)
               * sin(vWorld.z * 0.35 - time * 0.7);
  float glint = step(0.72, ripple) * (1.0 - far) * 0.5;
  vec3 color = mix(tint * 0.78, tint * 1.25 + vec3(0.05, 0.07, 0.1), far) + glint * vec3(0.5, 0.6, 0.7);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (lights[i].w <= 0.0) continue;
    float reach = max(0.0, 1.0 - distance(vWorld.xz, vec2(lights[i].x, 0.0)) / (lights[i].z * 1.4));
    color += lightColors[i] * lights[i].w * reach * reach * 0.45;
  }
  // The island stands in this water: foam along its back edge and its
  // shadow thrown across the surface behind it.
  float behind = -vWorld.z - depth;
  if (behind > 0.0) {
    float shore = land(vWorld.x, vWorld.y + 2.0);
    float wobble = sin(vWorld.x * 0.4 + time * 2.0) * 1.5;
    color = mix(color, vec3(0.86, 0.93, 1.0), shore * (1.0 - smoothstep(1.5, 5.0 + wobble, behind)) * 0.8);
    float shaded = land(vWorld.x - behind * 0.55, vWorld.y + 3.0 + behind * 0.8);
    color *= 1.0 - shaded * 0.34 * (1.0 - smoothstep(20.0, 90.0, behind));
  }
  gl_FragColor = vec4(color, 0.9);
  #include <colorspace_fragment>
}`;

// Off-axis frustum: the rectangle `view` on the plane z = 0 fills the screen
// exactly for any eye position in front of it.
export function windowFrustum(view, eye) {
  const near = Math.max(1, eye.z - 120), scale = near / eye.z;
  return {
    left: (view.x - eye.x) * scale,
    right: (view.x + view.w - eye.x) * scale,
    bottom: (view.y - eye.y) * scale,
    top: (view.y + view.h - eye.y) * scale,
    near,
    far: eye.z + BACK + 200,
  };
}

// lights/lightColors are the shared effect lights owned by fx.js.
// `layer` is the game's own group (terrain front face, worms, projectiles).
export function createDiorama({ renderer, scene, layer, land, landTexture, backdrop, lights, lightColors, bindPalette = (m) => m, reducedMotion = false }) {
  const camera = new THREE.PerspectiveCamera();
  const size = new THREE.Vector2(1, 1);
  const eye = new THREE.Vector3();
  const sun = new THREE.Vector3(-0.5, 0.72, 0.48).normalize();
  const waterLevel = { value: 0 };
  const lightGain = { value: 1 };
  const blobUniform = Array.from({ length: MAX_BLOBS }, () => new THREE.Vector3());

  const flatMaterial = land.material;
  const landMaterial = bindPalette(new THREE.ShaderMaterial({
    vertexShader: landVertex,
    fragmentShader: landFragment,
    transparent: true,
    uniforms: {
      map: { value: landTexture }, relief: { value: null }, size: { value: size },
      eye: { value: eye }, depth: { value: DEPTH }, waterLevel, sun: { value: sun },
      lights: { value: lights }, lightColors: { value: lightColors }, lightGain,
      blobs: { value: blobUniform },
    },
  }), 3);

  // Relief: blurred terrain coverage. Its gradient gives edge normals and its
  // spread gives the backdrop shadow. Rebuilt only when the terrain repaints.
  const blurScene = new THREE.Scene();
  const blurCamera = new THREE.Camera();
  const blurMaterial = new THREE.ShaderMaterial({
    vertexShader: quadVertex, fragmentShader: blurFragment,
    uniforms: { source: { value: null }, direction: { value: new THREE.Vector2() } },
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMaterial);
  quad.frustumCulled = false;
  blurScene.add(quad);
  let reliefA = null, reliefB = null, reliefVersion = -1;
  const target = (w, h) => new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false,
  });
  function updateRelief(W, H) {
    if (!reliefA || reliefA.width !== W || reliefA.height !== H) {
      reliefA?.dispose(); reliefB?.dispose();
      reliefA = target(W, H); reliefB = target(W, H);
      reliefVersion = -1;
    }
    if (reliefVersion === landTexture.version) return;
    reliefVersion = landTexture.version;
    const previous = renderer.getRenderTarget();
    blurMaterial.uniforms.source.value = landTexture;
    blurMaterial.uniforms.direction.value.set(1.2 / W, 0);
    renderer.setRenderTarget(reliefA); renderer.render(blurScene, blurCamera);
    blurMaterial.uniforms.source.value = reliefA.texture;
    blurMaterial.uniforms.direction.value.set(0, 1.2 / H);
    renderer.setRenderTarget(reliefB); renderer.render(blurScene, blurCamera);
    renderer.setRenderTarget(previous);
    landMaterial.uniforms.relief.value = reliefB.texture;
    shadowMaterial.uniforms.relief.value = reliefB.texture;
  }

  const shadowMaterial = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: shadowFragment, transparent: true, depthWrite: false,
    uniforms: { relief: { value: null }, size: { value: size } },
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMaterial);
  shadow.visible = false; shadow.frustumCulled = false;
  scene.add(shadow);

  const seaMaterial = new THREE.ShaderMaterial({
    vertexShader: seaVertex, fragmentShader: seaFragment, transparent: true, depthWrite: false,
    uniforms: {
      time: { value: 0 }, tint: { value: new THREE.Color(0x2c4f9e) },
      map: { value: landTexture }, size: { value: size }, depth: { value: DEPTH },
      lights: { value: lights }, lightColors: { value: lightColors },
    },
  });
  // Horizontal sheet from the front waterline back to the backdrop.
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), seaMaterial);
  sea.visible = false; sea.frustumCulled = false;
  scene.add(sea);

  let enabled = false;
  let pointerX = 0, pointerY = 0, leanX = 0, leanY = 0;
  let trackedX = null, trackedY = null, lastNow = 0;
  const backdropZ = backdrop.position.z;

  function setEnabled(value) {
    enabled = Boolean(value);
    land.material = enabled ? landMaterial : flatMaterial;
    shadow.visible = sea.visible = enabled;
    // The game stacks its sprites up to ~46 units in front of the terrain to
    // order them. Seen in perspective that gap makes worms slide against the
    // ground as the eye moves, so the gameplay layer is pressed nearly flat
    // (order is kept) while the backdrop stays at its real distance.
    layer.scale.z = enabled ? LAYER_FLATTEN : 1;
    (enabled ? scene : layer).add(backdrop);
    trackedX = trackedY = null;
  }
  function setPointer(x, y) { pointerX = x; pointerY = y; }

  // Positions the eye and the diorama-only meshes for this frame and returns
  // the camera to render the scene with.
  function prepare({ view, W, H, level, now, shakeX = 0, shakeY = 0, ownLights = true, blobs = [], focusX = null }) {
    const dt = Math.min(0.1, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    size.set(W, H);
    waterLevel.value = level;
    lightGain.value = ownLights ? 1 : 0;
    updateRelief(W, H);
    for (let i = 0; i < MAX_BLOBS; i++) {
      const blob = blobs[i];
      if (blob) blobUniform[i].set(blob.x, blob.y, blob.strength ?? 1); else blobUniform[i].set(0, 0, 0);
    }

    // Eye: above the centre, swayed by the pointer, and lagging behind pans
    // so camera moves read as parallax.
    const cx = view.x + view.w / 2, cy = view.y + view.h / 2;
    if (trackedX === null) { trackedX = cx; trackedY = cy; }
    const ease = 1 - Math.exp(-dt * 4);
    trackedX += (cx - trackedX) * ease; trackedY += (cy - trackedY) * ease;
    const limit = view.w * 0.3;
    const lagX = Math.max(-limit, Math.min(limit, (trackedX - cx) * 1.6));
    const lagY = Math.max(-limit, Math.min(limit, (trackedY - cy) * 1.6));
    const sway = reducedMotion ? 0 : Math.sin(now * 0.00035) * view.w * 0.035;
    // Lean toward the action so shots swing the miniature a little.
    const action = focusX === null ? 0 : Math.max(-1, Math.min(1, (focusX - cx) / (view.w / 2))) * view.w * 0.1;
    const goalX = pointerX * view.w * 0.22 + sway + lagX + action;
    const goalY = pointerY * view.h * 0.14 + lagY;
    leanX += (goalX - leanX) * ease; leanY += (goalY - leanY) * ease;
    eye.set(cx + leanX + shakeX, cy + view.h * 0.52 + leanY + shakeY, view.h * 1.35);
    const frustum = windowFrustum({ ...view, x: view.x + shakeX, y: view.y + shakeY }, eye);
    camera.position.copy(eye);
    camera.quaternion.identity();
    camera.updateMatrixWorld(true);
    camera.projectionMatrix.makePerspective(frustum.left, frustum.right, frustum.top, frustum.bottom, frustum.near, frustum.far);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

    shadow.scale.set(W, H, 1);
    shadow.position.set(W / 2 + 46, H / 2 - 58, backdropZ + 4);
    sea.scale.set(W + 4096, 1, BACK + FRONT);
    sea.position.set(W / 2, level - 1, (FRONT - BACK) / 2);
    seaMaterial.uniforms.time.value = reducedMotion ? 0 : now * 0.001;
    return camera;
  }

  return {
    get enabled() { return enabled; },
    setEnabled, setPointer, prepare,
    setSeaTint(color) { seaMaterial.uniforms.tint.value.set(color); },
  };
}
