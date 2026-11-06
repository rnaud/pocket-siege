import { createWater } from "./water.js";
import * as THREE from "three";
import "./style.css";
import {
  Terrain,
  W,
  H,
  WATER,
  launch,
  integrate,
  shotGeometry,
  hitsWorm,
  blastImpulse,
  walkWorm,
  stepWorm,
  terrainNormal,
  reflectVelocity,
  chargePower,
  launchGeometry,
  GRAVITY,
} from "./physics.js";
import {
  createWeaponRig,
  createStars,
  createProjectile,
  createAimOverlay,
  createCrate,
  createMine,
  createBarrel,
} from "./combat-visuals.js";
import { paintTerrain } from "./terrain-paint.js";
import {
  WEAPONS,
  WEAPON_ORDER,
  PROJECTILE_ORDER,
  SPECIAL_WEAPONS,
  freshAmmo,
  ammoFor,
  waterLevelForRound,
} from "./weapons.js";
import { planTurn, planMove } from "./ai.js";
import { chooseCameraTarget, cameraView, FULL_VIEW } from "./camera.js";
import {
  applyMatchResult,
  dailySeed,
  dailyStatus,
  readRecord,
  recordBest,
  recordSummary,
  writeRecord,
} from "./progress.js";
import { nextSeriesWins, seriesWinner } from "./series.js";
import { applyPickup, PICKUP_KINDS } from "./pickups.js";
import { UTILITIES, UTILITY_KINDS, freshUtilities } from "./utilities.js";
import { SCHEMES } from "./schemes.js";
import { modifierSettings } from "./modifiers.js";
import { readSettings, writeSettings } from "./settings.js";
const $ = (s) => document.querySelector(s);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = matchMedia("(pointer: coarse)").matches;
const arena = $("#arena"),
  menu = $("#menu");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
$("#scene").appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#153b3d");
const camera = new THREE.OrthographicCamera(0, W, H, 0, 0.1, 2000);
camera.position.z = 1000;
const view = { ...FULL_VIEW };
let cameraZoom = 1,
  cameraX = W / 2,
  cameraY = H / 2,
  cameraSnap = true;
function applyView() {
  camera.left = view.x;
  camera.right = view.x + view.w;
  camera.top = view.y + view.h;
  camera.bottom = view.y;
  camera.updateProjectionMatrix();
}
applyView();
scene.add(new THREE.AmbientLight(0xffffff, 2));
const sun = new THREE.DirectionalLight(0xffe4bc, 2.5);
sun.position.set(-300, 600, 600);
scene.add(sun);
const group = new THREE.Group();
scene.add(group);
const canvas = document.createElement("canvas");
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext("2d");
const texture = new THREE.CanvasTexture(canvas);
texture.colorSpace = THREE.SRGBColorSpace;
texture.minFilter = THREE.LinearFilter;
const land = new THREE.Mesh(
  new THREE.PlaneGeometry(W, H),
  new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
);
land.position.set(W / 2, H / 2, 0);
group.add(land);
const names = [
  ["Sprout", "Moss", "Pickle"],
  ["Pepper", "Toast", "Chilli"],
];
let terrain,
  worms = [],
  current = 0,
  team = 0,
  round = 1,
  phase = "menu",
  projectile = null,
  particles = [],
  wind = 0,
  time = 45,
  shotWait = 0,
  turnCount = [0, 0],
  mode = "ai",
  weapon = "rocket",
  move = 0,
  angle = 45,
  power = 0,
  aiWait = 0,
  sound = false,
  audio,
  announceUntil = 0,
  last = performance.now(),
  accumulator = 0,
  explosions = 0,
  shakeUntil = 0;
let ammo = [freshAmmo(), freshAmmo()],
  teamWeapon = ["rocket", "rocket"],
  waterLevel = WATER,
  suddenDeath = false,
  suddenDeathType = "water",
  sdTriggered = false,
  poisoned = false,
  difficulty = "regular";
let format = "single",
  seriesWins = [0, 0],
  seriesRound = 1,
  breakTimer = 0,
  crate = null,
  mines = [],
  girders = [],
  bombs = [],
  fires = [],
  hazards = [],
  slowMo = 0,
  weather = "clear",
  modifier = "standard",
  gravityScale = 1,
  blastScale = 1,
  scheme = "classic",
  stockpile = false,
  crateRain = false,
  utilityAmmo = [freshUtilities(), freshUtilities()],
  utilitiesOpen = false,
  specialOpen = false,
  activeUtility = null,
  targetUtility = null,
  rope = { attached: false, anchor: null, length: 0, mesh: null },
  jetpack = {
    active: false,
    fuel: 30,
    owner: null,
    pulse: 0,
    pulseTime: 0,
  },
  parachuteArmed = false,
  turnSeconds = 45,
  turnTime = 45,
  retreatSeconds = 3,
  wormLocked = false,
  matchStarted = false,
  daily = null,
  record = readRecord();
let aiPower = 100;
let shotFuse = null,
  shotBounce = null,
  aiMoveTime = 0,
  aiMoveDirection = 0,
  aiRetreatTime = 0,
  lastAiPlanMs = 0,
  aiPlan = null,
  hitStop = 0;
let charging = false,
  chargeSeconds = 0,
  chargeSource = null,
  aimInput = 0,
  retreat = 0,
  fuse = 3,
  bounce = 0.55,
  firedPower = 0,
  shotCount = 0,
  lastJump = { kind: null, time: -1 },
  jumpClock = 0;
let uiKey = "",
  terrainDirty = false,
  timerKey = "";
let lastShot = null,
  replaying = false,
  replayClock = 0,
  replayDuration = 1,
  replayReady = false,
  lastResult = null;
// Original generated art, loaded once and shared by all six soldiers.
let assetsReady = false;
const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
function artTexture(file) {
  const map = loader.load(`${import.meta.env.BASE_URL}art/${file}.webp`);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return map;
}
const backdropMap = artTexture("paper-islands");
const soldierMaps = [
  artTexture("moss-body-paper"),
  artTexture("coral-body-paper"),
];
const hurtMaps = [
  artTexture("moss-hurt-paper"),
  artTexture("coral-hurt-paper"),
];
const portraitMaps = [
  artTexture("moss-soldier-paper"),
  artTexture("coral-soldier-paper"),
];
const crateMap = artTexture("crate-paper");
const mineMap = artTexture("weapon-mine");
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(W, H),
  new THREE.MeshBasicMaterial({ map: backdropMap, color: 0xded5bf }),
);
backdrop.position.set(W / 2, H / 2, -180);
group.add(backdrop);
manager.onLoad = () => {
  assetsReady = true;
  resize();
};
const motes = [];
for (let i = 0; i < 26; i++) {
  const mote = new THREE.Mesh(
    new THREE.CircleGeometry(1 + (i % 3), 6),
    new THREE.MeshBasicMaterial({
      color: 0xf3e6bd,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    }),
  );
  mote.position.z = 8;
  group.add(mote);
  motes.push(mote);
}
const water = createWater(W, WATER);
group.add(water);
// Debris and projectiles share GPU resources; only one prototype per kind is built.
const debrisGeometry = new THREE.SphereGeometry(1, 10, 8);
const debrisMaterials = [
  new THREE.MeshStandardMaterial({ color: 0xc4a578, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ color: 0xffce70, roughness: 0.55 }),
];
const debrisPrototype = new THREE.Mesh(debrisGeometry, debrisMaterials[0]);
debrisPrototype.visible = false;
debrisPrototype.frustumCulled = false;
group.add(debrisPrototype);
const dustGeometry = new THREE.SphereGeometry(1, 6, 4);
const dustMaterial = new THREE.MeshBasicMaterial({
  color: 0xd9c9a6,
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
});
const projectilePrototypes = Object.fromEntries(
  PROJECTILE_ORDER.map((kind) => {
    const prototype = createProjectile(kind);
    prototype.visible = false;
    prototype.frustumCulled = false;
    group.add(prototype);
    return [kind, prototype];
  }),
);
function projectileMesh(kind) {
  const mesh = projectilePrototypes[kind].clone(true);
  mesh.visible = true;
  return mesh;
}
function prewarmShaders() {
  for (const kind of PROJECTILE_ORDER)
    projectilePrototypes[kind].visible = true;
  debrisPrototype.visible = true;
  renderer.compile(scene, camera);
  for (const kind of PROJECTILE_ORDER)
    projectilePrototypes[kind].visible = false;
  debrisPrototype.visible = false;
}
function createWorm(t, i, x) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: soldierMaps[t],
      transparent: true,
      alphaTest: 0.03,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  body.position.set(0, 22, 4);
  body.scale.set(64, 64, 1);
  g.add(body);
  const rig = createWeaponRig(t);
  rig.pivot.position.z = 10;
  g.add(rig.pivot);
  const stars = createStars();
  g.add(stars);
  stars.visible = false;
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(14, 24),
    new THREE.MeshBasicMaterial({
      color: 0x263722,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    }),
  );
  shadow.scale.y = 0.22;
  shadow.position.set(0, -9, 2);
  g.add(shadow);
  const label = document.createElement("div");
  label.className = "worm-label";
  label.style.color = t ? "#a94a3d" : "#4d6b3a";
  label.innerHTML = `${names[t][i]}<strong>100</strong>`;
  $("#labels").appendChild(label);
  group.add(g);
  const y =
    Math.max(...[-16, -8, 0, 8, 16].map((dx) => terrain.surface(x + dx))) + 12;
  return {
    team: t,
    name: names[t][i],
    hp: 100,
    x,
    y,
    renderY: y,
    moving: false,
    dustAt: 0,
    vx: 0,
    vy: 0,
    g,
    body,
    rig,
    stars,
    hurt: 0,
    recoil: 0,
    dying: 0,
    hitDirection: 1,
    hits: 0,
    shadow,
    facing: t ? -1 : 1,
    label,
    ground: false,
    knocked: false,
    deathPending: false,
    drowned: false,
  };
}
const aimHUD = createAimOverlay(arena);
let lastAim = null;
let bannerTime = 0;
function shot(w, a = angle, kind = weapon) {
  return shotGeometry(
    w,
    a,
    arena.clientHeight / H / (arena.clientWidth / W),
    w.visualSize || 64,
    kind,
  );
}
function updateAimHUD() {
  const visible =
    phase === "aim" &&
    !menu.open &&
    !replaying &&
    !targetUtility &&
    !rope.attached &&
    !jetpack.active &&
    worms[current]?.hp > 0 &&
    weapon !== "mine";
  aimHUD.guide.style.display = visible ? "" : "none";
  if (!visible) lastAim = null;
  if (visible) {
    const geometry = shot(worms[current]);
    const origin = screen(geometry.pivot.x, geometry.pivot.y);
    const r = (angle * Math.PI) / 180,
      dx = (Math.cos(r) * arena.clientWidth) / view.w,
      dy = (-Math.sin(r) * arena.clientHeight) / view.h;
    const length = Math.hypot(dx, dy),
      reach = Math.min(100, arena.clientWidth * 0.23);
    const ux = dx / length,
      uy = dy / length;
    const distance = Math.max(
      0,
      Math.min(
        reach,
        Math.abs(ux) < 0.0001
          ? Infinity
          : ((ux > 0 ? arena.clientWidth - 24 : 24) - origin.x) / ux,
        Math.abs(uy) < 0.0001
          ? Infinity
          : ((uy > 0 ? arena.clientHeight - 45 : 45) - origin.y) / uy,
      ),
    );
    const target = { x: origin.x + ux * distance, y: origin.y + uy * distance };
    aimHUD.reticle.setAttribute(
      "transform",
      `translate(${target.x},${target.y})`,
    );
    const aimText = charging
      ? `${Math.round(power)}%`
      : `${Math.round(angle)}°`;
    if (aimHUD.text.textContent !== aimText) aimHUD.text.textContent = aimText;
    aimHUD.charge.style.display = charging ? "" : "none";
    aimHUD.charge.setAttribute("stroke-dasharray", `${power * 1.508} 150.8`);
    lastAim = { ...geometry, reticle: target, angle };
  }
  aimHUD.tag.hidden = !projectile;
  if (projectile) {
    const p = screen(projectile.x, projectile.y);
    aimHUD.tag.style.left =
      Math.max(48, Math.min(arena.clientWidth - 48, p.x)) + "px";
    aimHUD.tag.style.top =
      Math.max(14, Math.min(arena.clientHeight - 25, p.y - 22)) + "px";
    aimHUD.tag.textContent = ["grenade", "sticky"].includes(projectile.kind)
      ? `✹ ${Math.max(0, projectile.fuse - projectile.age).toFixed(1)}s`
      : p.y < 0
        ? projectile.kind === "mortar"
          ? "↑ MORTAR"
          : "↑ ROCKET"
        : "➶";
    aimHUD.trail.setAttribute(
      "d",
      projectile.trail
        .map((v, i) => {
          const t = screen(v.x, v.y);
          return `${i ? "L" : "M"}${t.x},${t.y}`;
        })
        .join(" "),
    );
  } else aimHUD.trail.setAttribute("d", "");
}
function announce(text) {
  $("#announcement").textContent = text;
  $("#announcement").style.opacity = 1;
  announceUntil = performance.now() + 2200;
}
function tone(freq, duration = 0.1, type = "sine") {
  if (!sound) return;
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  const o = audio.createOscillator(),
    g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audio.currentTime);
  o.frequency.exponentialRampToValueAtTime(
    Math.max(30, freq * 0.2),
    audio.currentTime + duration,
  );
  g.gain.setValueAtTime(0.12, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  o.connect(g);
  g.connect(audio.destination);
  o.start();
  o.stop(audio.currentTime + duration);
}
function reset({ keepSeries = false, seed = null, isDaily = false } = {}) {
  cancelCharge();
  uiKey = "";
  timerKey = "";
  if (!keepSeries) {
    seriesWins = [0, 0];
    seriesRound = 1;
    slowMo = 0;
    daily = isDaily ? daily : null;
  }
  if (isDaily) {
    format = "single";
    weather = "clear";
    modifier = "standard";
    $("#format").value = "single";
    $("#weather").value = "clear";
    $("#modifier").value = "standard";
  } else {
    format = $("#format")?.value || "single";
    weather = $("#weather")?.value || "clear";
    modifier = $("#modifier")?.value || "standard";
  }
  scheme = isDaily ? "classic" : $("#scheme")?.value || "classic";
  if (isDaily) $("#scheme").value = "classic";
  const schemePreset = SCHEMES[scheme] ?? null;
  stockpile = Boolean(schemePreset?.stockpile) && !isDaily;
  crateRain = Boolean(schemePreset?.crateRain) && !isDaily;
  const mod = modifierSettings(modifier);
  gravityScale = mod.gravityScale;
  blastScale = mod.blastScale;
  turnTime = isDaily ? 45 : +$("#turn-time")?.value || 45;
  retreatSeconds = isDaily ? 3 : +$("#retreat-time")?.value || 3;
  suddenDeathType = isDaily ? "water" : $("#sudden-death")?.value || "water";
  turnSeconds = mod.turnSeconds === 30 ? Math.min(turnTime, 30) : turnTime;
  if (isDaily) {
    $("#turn-time").value = "45";
    $("#retreat-time").value = "3";
    $("#sudden-death").value = "water";
  }
  breakTimer = 0;
  slowMo = 0;
  cameraSnap = true;
  replaying = false;
  lastShot = null;
  replayReady = false;
  utilitiesOpen = false;
  specialOpen = false;
  activeUtility = null;
  targetUtility = null;
  parachuteArmed = false;
  stopRope();
  stopJetpack();
  $("#replay").disabled = true;
  aimHUD.replay.group.style.display = "none";
  const carriedAmmo = keepSeries && stockpile ? ammo : null;
  const carriedUtilities = keepSeries && stockpile ? utilityAmmo : null;
  ammo = carriedAmmo ?? [freshAmmo(), freshAmmo()];
  utilityAmmo = carriedUtilities ?? [freshUtilities(), freshUtilities()];
  teamWeapon = ["rocket", "rocket"];
  waterLevel = WATER;
  suddenDeath = false;
  suddenDeathType = isDaily ? "water" : $("#sudden-death")?.value || "water";
  sdTriggered = false;
  poisoned = false;
  wormLocked = false;
  water.userData.setLevel?.(WATER);
  difficulty = $("#difficulty")?.value || "regular";
  shotFuse = null;
  shotBounce = null;
  aiMoveTime = 0;
  aiMoveDirection = 0;
  aiPlan = null;
  lastAiPlanMs = 0;
  hitStop = 0;
  move = 0;
  aimInput = 0;
  retreat = 0;
  shotCount = 0;
  fuse = 3;
  bounce = 0.55;
  $("#fuse").value = "3";
  $("#bounce").value = "0.55";
  lastJump = { kind: null, time: -1 };
  for (const w of worms) {
    dispose(w.g);
    w.label.remove();
  }
  if (projectile) group.remove(projectile.mesh);
  projectile = null;
  if (crate) {
    dispose(crate.mesh);
    crate = null;
  }
  for (const p of particles) group.remove(p.mesh);
  particles = [];
  for (const m of mines) dispose(m.mesh);
  mines = [];
  for (const g of girders) dispose(g.mesh);
  girders = [];
  for (const b of bombs) dispose(b.mesh);
  bombs = [];
  for (const f of fires) dispose(f.mesh);
  fires = [];
  for (const h of hazards) dispose(h.mesh);
  hazards = [];
  terrain = new Terrain(seed ?? 2 + Math.floor(Math.random() * 40));
  paintTerrain(ctx, terrain, texture);
  terrainDirty = false;
  worms = [
    ...names[0].map((_, i) => createWorm(0, i, [180, 340, 490][i])),
    ...names[1].map((_, i) => createWorm(1, i, [710, 860, 1020][i])),
  ];
  for (let i = 0; i < 240; i++)
    for (const w of worms) stepWorm(w, terrain, 1 / 120, gravityScale);
  for (const w of worms) w.g.position.set(w.x, w.y, 15);
  team = keepSeries ? (seriesRound - 1) % 2 : 0;
  round = 1;
  turnCount = [0, 0];
  ((explosions = 0), (shakeUntil = 0));
  announceUntil = 0;
  setWeapon("rocket");
  mode = $("#mode").value;
  applyWeather();
  spawnCrate();
  spawnHazards();
  beginTurn();
  updateRecordUI();
  resize();
}
function dispose(obj) {
  group.remove(obj);
  obj.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) o.material.dispose();
  });
}
function updateSeriesHUD() {
  const el = $("#series");
  el.hidden = format !== "best3";
  if (!el.hidden) el.textContent = `SERIES ${seriesWins[0]}–${seriesWins[1]}`;
}
function applyWeather() {
  $("#weather-layer").className = weather === "clear" ? "" : weather;
}
function spawnCrate() {
  if (crate || !terrain) return;
  for (let tries = 0; tries < 40; tries++) {
    const x = 150 + Math.random() * (W - 300),
      ground = terrain.surface(x);
    if (ground < waterLevel + 30) continue;
    if (worms.some((w) => w.hp > 0 && Math.abs(w.x - x) < 60)) continue;
    const kind = PICKUP_KINDS[Math.floor(Math.random() * PICKUP_KINDS.length)],
      mesh = createCrate(kind, crateMap),
      targetY = ground + 10;
    mesh.position.set(x, H + 34, 18);
    group.add(mesh);
    crate = {
      x,
      y: H + 34,
      targetY,
      kind,
      mesh,
      bob: Math.random() * Math.PI * 2,
      falling: true,
      vy: 0,
    };
    return;
  }
}
function spawnHazards() {
  if (hazards.length || !terrain) return;
  for (let i = 0; i < 2; i++) {
    for (let tries = 0; tries < 30; tries++) {
      const x = 180 + Math.random() * (W - 360),
        ground = terrain.surface(x);
      if (ground < waterLevel + 50) continue;
      if (worms.some((w) => w.hp > 0 && Math.abs(w.x - x) < 70)) continue;
      if (crate && Math.abs(crate.x - x) < 55) continue;
      if (hazards.some((h) => Math.abs(h.x - x) < 70)) continue;
      const mesh = createBarrel();
      mesh.position.set(x, ground + 14, 17);
      group.add(mesh);
      hazards.push({ x, y: ground + 14, mesh });
      break;
    }
  }
}
function spawnFire(x, y, owner = -1) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(28 + Math.random() * 10, 16),
    new THREE.MeshBasicMaterial({
      color: Math.random() < 0.5 ? 0xff8b3c : 0xffc04d,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    }),
  );
  mesh.position.set(x, y + 8, 26);
  mesh.scale.y = 0.5;
  group.add(mesh);
  fires.push({ x, y, owner, mesh, life: 5.5, tick: 0 });
}
function stepBombs(dt) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.fuse -= dt;
    if (!b.grounded) {
      integrate(b, dt, 0, gravityScale);
      b.mesh.position.set(b.x, b.y, 40);
      const hitGround = terrain.solid(b.x, b.y);
      if (b.fuse <= 0 || b.y < waterLevel || hitGround) {
        bombs.splice(i, 1);
        dispose(b.mesh);
        if (b.y > waterLevel) explode(b.x, b.y, b.kind, b.owner);
      }
    } else if (b.fuse <= 0) {
      bombs.splice(i, 1);
      dispose(b.mesh);
      explode(b.x, b.y, b.kind, b.owner);
    }
  }
}
function stepFires(dt) {
  for (let i = fires.length - 1; i >= 0; i--) {
    const f = fires[i];
    f.life -= dt;
    f.tick -= dt;
    if (f.tick <= 0) {
      f.tick = 0.55;
      for (const w of worms) {
        if (w.hp <= 0) continue;
        if (Math.abs(w.x - f.x) < 38 && Math.abs(w.y + 18 - f.y) < 45)
          injure(w, 4, 0);
      }
    }
    f.mesh.scale.x = 0.9 + Math.sin(performance.now() * 0.01 + f.x) * 0.08;
    if (f.life <= 0) {
      group.remove(f.mesh);
      f.mesh.geometry.dispose();
      f.mesh.material.dispose();
      fires.splice(i, 1);
    }
  }
}
function collectCrate(w) {
  if (!crate) return;
  const { kind, mesh } = crate;
  let label;
  if (kind === "utility") {
    const pool = ["jetpack", "parachute", "teleport", "girder", "freeze"];
    const utility = pool[Math.floor(Math.random() * pool.length)];
    utilityAmmo[w.team][utility] = Math.min(
      3,
      (utilityAmmo[w.team][utility] ?? 0) + 1,
    );
    label = `+1 ${UTILITIES[utility].label}`;
  } else if (kind === "special") {
    const special =
      SPECIAL_WEAPONS[Math.floor(Math.random() * SPECIAL_WEAPONS.length)];
    ammo[w.team][special] = Math.min(3, (ammo[w.team][special] ?? 0) + 1);
    label = `+1 ${WEAPONS[special].label}`;
  } else {
    const result = applyPickup(kind, w.hp, ammo[w.team]);
    w.hp = result.hp;
    ammo[w.team] = result.loadout;
    label = kind === "health" ? "+25 HP" : `+1 ${WEAPONS[kind].label}`;
  }
  pickupLabel(w, label);
  $("#status").textContent = `${w.name} grabs a supply crate: ${label}.`;
  dispose(mesh);
  crate = null;
  tone(720, 0.12, "triangle");
  updateUI();
}
function pickupLabel(w, text) {
  const p = screen(w.x, w.y + 34),
    el = document.createElement("span");
  el.className = "pickup-number";
  el.textContent = text;
  el.style.left = p.x + "px";
  el.style.top = p.y + "px";
  $("#damage").appendChild(el);
  setTimeout(() => el.remove(), 1200);
}
function updateRecordUI() {
  const summary = $("#record-summary");
  if (summary) summary.textContent = recordSummary(record);
  const dailyLabel = $("#daily-status");
  if (dailyLabel) dailyLabel.textContent = dailyStatus(record);
  const share = $("#share");
  if (share) share.disabled = !lastResult;
  const surrender = $("#surrender");
  if (surrender)
    surrender.hidden = !matchStarted || phase === "menu" || phase === "over";
}
function beginTurn() {
  stopRope();
  stopJetpack();
  targetUtility = null;
  activeUtility = null;
  parachuteArmed = false;
  utilitiesOpen = false;
  specialOpen = false;
  applyPoisonTick();
  const aliveTeam = worms.filter((w) => w.team === team && w.hp > 0);
  if (aliveTeam.length && aliveTeam.every((w) => w.frozen > 0)) {
    for (const w of aliveTeam) w.frozen = 0;
    current = worms.indexOf(aliveTeam[0]);
    phase = "settle";
    wormLocked = true;
    retreat = 0;
    shotWait = 0;
    move = 0;
    $("#turn-label").textContent = "FROZEN TURN";
    $("#status").textContent =
      `${team === 0 ? "MOSS COMPANY" : "CORAL CREW"} is frozen and loses this turn.`;
    updateUI();
    return;
  }
  const roster = worms.filter((w) => w.team === team);
  if (!roster.some((w) => w.hp > 0)) return endGame();
  let next = turnCount[team] % roster.length;
  while (roster[next].hp <= 0) next = (next + 1) % roster.length;
  const active = roster[next];
  turnCount[team] = (next + 1) % roster.length;
  current = worms.indexOf(active);
  phase = "aim";
  cameraSnap = true;
  wormLocked = false;
  time = turnSeconds;
  const windMax = weather === "storm" ? 52 : weather === "rain" ? 36 : 28;
  wind = (Math.random() - 0.5) * windMax;
  slowMo = 0;
  angle = team ? 135 : 45;
  active.facing = team ? -1 : 1;
  if (team === 1 && mode === "ai" && (utilityAmmo[1]?.parachute ?? 0) > 0)
    parachuteArmed = true;
  cancelCharge();
  power = 0;
  retreat = 0;
  aimInput = 0;
  firedPower = 0;
  move = 0;
  aiWait = 1.6;
  aiMoveTime = 0;
  aiRetreatTime = 0;
  aiPlan = null;
  shotFuse = null;
  shotBounce = null;
  hitStop = 0;
  setWeapon(teamWeapon[team]);
  updateSliders();
  $("#round").textContent = suddenDeath
    ? "SUDDEN DEATH"
    : `ROUND ${String(round).padStart(2, "0")}`;
  $("#turn-label").textContent =
    mode === "ai"
      ? team
        ? "COMPUTER TURN"
        : "YOUR MOVE"
      : team
        ? "CORAL’S MOVE"
        : "MOSS’S MOVE";
  $("#wind").textContent =
    `WIND ${wind < 0 ? "←" : "→"} ${Math.abs(wind / 5).toFixed(1)}`;
  $(".location span").textContent = daily ? "DAILY ISLAND" : "FERN ISLAND";
  updateSeriesHUD();
  const weatherNote =
    weather === "storm"
      ? " Storm winds."
      : weather === "rain"
        ? " Rain falling."
        : "";
  const suddenNote = suddenDeath
    ? suddenDeathType === "water"
      ? " The water is rising."
      : suddenDeathType === "health"
        ? " Every worm has 1 HP."
        : suddenDeathType === "nuke"
          ? " Nuclear poison is active."
          : ""
    : "";
  $("#status").textContent = suddenDeath
    ? `${active.name} is up.${suddenNote}${weatherNote}`
    : `${active.name} is up. ${team && mode === "ai" ? "Taking aim…" : "Pick your angle. Make a little chaos."}${weatherNote}`;
  bannerTime = 1.8;
  $("#turn-banner").textContent =
    `${team ? "CORAL CREW" : "MOSS COMPANY"} · ${active.name.toUpperCase()}`;
  updateUI();
}
function updateUI() {
  // Called from the 120 Hz simulation; only touch the DOM when the state behind it changed.
  const loadout = ammo[team] ?? {};
  const key = `${current}|${phase}|${team}|${mode}|${weapon}|${replaying}|${charging}|${retreat > 0}|${menu.open}|${wormLocked}|${suddenDeath}|${poisoned}|${utilitiesOpen}|${activeUtility}|${targetUtility}|${rope.attached}|${Math.ceil(rope.length)}|${jetpack.active}|${Math.ceil(jetpack.fuel)}|${Object.values(loadout).join(",")}|${specialOpen}|${worms.map((w) => `${w.hp}:${w.knocked}`).join(",")}`;
  if (key === uiKey) return;
  uiKey = key;
  for (let t = 0; t < 2; t++) {
    let hp = worms.filter((w) => w.team === t).reduce((s, w) => s + w.hp, 0);
    $("#score" + t).textContent = hp;
    $("#health" + t).style.width = hp / 3 + "%";
  }
  for (let i = 0; i < worms.length; i++) {
    const w = worms[i];
    w.g.visible = w.hp > 0 || w.dying > 0;
    w.label.style.display = w.hp > 0 ? "block" : "none";
    w.label.querySelector("strong").textContent = w.hp;
    w.label.style.setProperty("--hp", w.hp + "%");
    w.label.classList.toggle("active", i === current && phase !== "over");
    w.label.classList.toggle("frozen", w.frozen > 0);
  }
  $("#fire").disabled =
    !canAct() ||
    worms[current]?.knocked ||
    Boolean(targetUtility) ||
    rope.attached ||
    jetpack.active;
  $("#angle").disabled =
    !canAct() ||
    charging ||
    weapon === "mine" ||
    weapon === "dynamite" ||
    weapon === "airstrike" ||
    weapon === "bat";
  document.querySelectorAll("[data-weapon]").forEach((button) => {
    const count = ammoFor(loadout, button.dataset.weapon);
    button.querySelector("small").textContent =
      count === Infinity ? "∞" : count;
    button.disabled = !canAct() || charging || count <= 0;
  });
  document
    .querySelectorAll("#fuse,#bounce")
    .forEach((b) => (b.disabled = !canAct() || charging));
  document
    .querySelectorAll("[data-move],#jump,#backflip")
    .forEach((b) => (b.disabled = !canMove()));
  const select = $("#select-worm"),
    skip = $("#skip");
  if (select) {
    select.hidden = !canSelectWorm();
    if (!select.hidden) {
      const roster = worms.filter((w) => w.team === team && w.hp > 0);
      const index = roster.indexOf(worms[current]) + 1;
      select.textContent = `⇥ WORM ${index}/${roster.length}`;
    }
  }
  if (skip) {
    skip.hidden = !canAct();
    skip.disabled = !canAct();
  }
  const utilityLoadout = utilityAmmo[team] ?? {};
  const utilityPanel = $("#utilities");
  if (utilityPanel) utilityPanel.hidden = !utilitiesOpen;
  document.querySelectorAll("[data-utility]").forEach((button) => {
    const kind = button.dataset.utility;
    const count = utilityLoadout[kind] ?? 0;
    button.querySelector("small").textContent =
      count === Infinity ? "∞" : count;
    button.disabled =
      !canAct() ||
      charging ||
      (count <= 0 && activeUtility !== kind) ||
      (activeUtility !== null && activeUtility !== kind);
    button.classList.toggle("selected", activeUtility === kind);
  });
  const utilityToggle = $("#utilities-toggle");
  if (utilityToggle) {
    utilityToggle.hidden = !canAct();
    utilityToggle.disabled = !canAct();
    utilityToggle.textContent = jetpack.active
      ? `✦ ${Math.ceil(jetpack.fuel)}`
      : rope.attached
        ? `⌁ ${Math.round(rope.length)}`
        : targetUtility === "teleport"
          ? "◎ AIM"
          : targetUtility === "girder"
            ? "▰ AIM"
            : targetUtility === "airstrike"
              ? "✈ AIM"
              : parachuteArmed
                ? "☂ CHUTE"
                : "✦ UTILS";
    utilityToggle.classList.toggle(
      "selected",
      utilitiesOpen ||
        rope.attached ||
        jetpack.active ||
        Boolean(targetUtility),
    );
  }
  const specialPanel = $("#special-weapons");
  if (specialPanel) specialPanel.hidden = !specialOpen;
  const specialToggle = $("#special-toggle");
  if (specialToggle) {
    specialToggle.hidden = !canAct();
    specialToggle.disabled = !canAct();
    specialToggle.classList.toggle("selected", specialOpen);
  }
  const utilityStatus = $("#utility-status");
  if (utilityStatus) {
    if (targetUtility)
      utilityStatus.textContent =
        targetUtility === "teleport"
          ? "Click or tap an empty spot to teleport."
          : "Click or tap to place a girder.";
    else if (rope.attached)
      utilityStatus.textContent = `Rope out: ${Math.round(rope.length)} px · ↑↓ length · ←→ swing · R release`;
    else if (jetpack.active)
      utilityStatus.textContent = `Jet pack fuel ${Math.ceil(jetpack.fuel)} · arrows move · R stops`;
    else if (parachuteArmed)
      utilityStatus.textContent =
        "Parachute armed. It will deploy on a hard fall.";
    else utilityStatus.textContent = "";
  }
}
function canAct() {
  return (
    phase === "aim" &&
    !(team === 1 && mode === "ai") &&
    !menu.open &&
    !replaying &&
    worms[current]?.hp > 0
  );
}
function canMove() {
  return (
    (canAct() ||
      (retreat > 0 && !(team === 1 && mode === "ai") && !menu.open)) &&
    !charging &&
    !replaying &&
    worms[current]?.hp > 0 &&
    !worms[current]?.knocked
  );
}
function canSelectWorm() {
  return (
    phase === "aim" &&
    !wormLocked &&
    !charging &&
    !menu.open &&
    !replaying &&
    !targetUtility &&
    !activeUtility &&
    !rope.attached &&
    !jetpack.active &&
    !(team === 1 && mode === "ai") &&
    worms[current]?.hp > 0 &&
    worms.filter((w) => w.team === team && w.hp > 0).length > 1
  );
}
function cycleWorm(direction = 1) {
  if (!canSelectWorm()) return;
  const roster = worms.filter((w) => w.team === team && w.hp > 0);
  const index = roster.indexOf(worms[current]);
  const next = roster[(index + direction + roster.length) % roster.length];
  current = worms.indexOf(next);
  cancelCharge();
  power = 0;
  charging = false;
  chargeSource = null;
  next.facing = team ? -1 : 1;
  angle = team ? 135 : 45;
  cameraSnap = true;
  wormLocked = false;
  setWeapon(teamWeapon[team] || "rocket");
  updateSliders();
  $("#status").textContent =
    `${next.name} selected. Choose a worm, then move or fire.`;
  updateUI();
}
function skipTurn() {
  if (!canAct()) return;
  cancelCharge();
  stopRope();
  stopJetpack();
  parachuteArmed = false;
  targetUtility = null;
  activeUtility = null;
  wormLocked = true;
  phase = "settle";
  retreat = 0;
  shotWait = 0;
  move = 0;
  shotCount++;
  $("#status").textContent = `${worms[current].name} skips the turn.`;
  updateUI();
}
function stopRope() {
  if (rope.mesh) {
    group.remove(rope.mesh);
    rope.mesh.geometry.dispose();
    rope.mesh.material.dispose();
  }
  rope = { attached: false, anchor: null, length: 0, mesh: null };
  if (activeUtility === "rope") activeUtility = null;
}
function stopJetpack() {
  jetpack = {
    active: false,
    fuel: 30,
    owner: null,
    pulse: 0,
    pulseTime: 0,
  };
  if (activeUtility === "jetpack") activeUtility = null;
}
function closeUtilities() {
  utilitiesOpen = false;
  $("#utilities-toggle")?.classList.remove("selected");
  updateUI();
}
function toggleUtilities() {
  if (!canAct()) return;
  utilitiesOpen = !utilitiesOpen;
  if (utilitiesOpen) specialOpen = false;
  $("#utilities-toggle")?.classList.toggle("selected", utilitiesOpen);
  updateUI();
}
function finishUtilityTurn(text) {
  targetUtility = null;
  activeUtility = null;
  utilitiesOpen = false;
  wormLocked = true;
  phase = "settle";
  retreat = 0;
  shotWait = 0;
  move = 0;
  $("#status").textContent = text;
  updateUI();
}
function addGirder(cx, cy, angle = 0, length = 64) {
  const r = (angle * Math.PI) / 180;
  for (let t = -length / 2; t <= length / 2; t += 1) {
    const gx = Math.round(cx + Math.cos(r) * t),
      gy = Math.round(cy + Math.sin(r) * t);
    for (let n = -3; n <= 3; n++) {
      const x = Math.round(gx + Math.sin(r) * n),
        y = Math.round(gy - Math.cos(r) * n);
      if (x >= 0 && x < W && y >= 0 && y < H) terrain.data[y * W + x] = 1;
    }
  }
  paintTerrain(ctx, terrain, texture);
  terrainDirty = false;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(length, 7, 5),
    new THREE.MeshStandardMaterial({ color: 0x6f8a52, roughness: 0.9 }),
  );
  const ink = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color: 0x17383b }),
  );
  mesh.add(ink);
  mesh.position.set(cx, cy, 18);
  mesh.rotation.z = r;
  group.add(mesh);
  girders.push({ mesh, cx, cy, angle, length });
}
function handleUtilityTarget(e) {
  if (!targetUtility) return;
  const rect = arena.getBoundingClientRect(),
    x = Math.max(
      20,
      Math.min(W - 20, ((e.clientX - rect.left) / rect.width) * W),
    ),
    y = H - ((e.clientY - rect.top) / rect.height) * H;
  const w = worms[current];
  if (targetUtility === "airstrike") {
    if ((ammoFor(ammo[team], "airstrike") ?? 0) <= 0) {
      targetUtility = null;
      activeUtility = null;
      updateUI();
      return;
    }
    ammo[team].airstrike--;
    spawnAirstrike(x);
    finishUtilityTurn("Air strike called. Bombs away!");
    return;
  }
  if (targetUtility === "teleport") {
    const blocked =
      terrain.solid(x, y) ||
      terrain.solid(x - 10, y - 8) ||
      terrain.solid(x + 10, y - 8) ||
      terrain.solid(x, y + 8) ||
      y < waterLevel + 12;
    if (blocked) {
      $("#status").textContent = "Teleport blocked. Choose an empty spot.";
      return;
    }
    utilityAmmo[team].teleport--;
    const oldX = w.x;
    w.x = x;
    w.y = y;
    w.vx = 0;
    w.vy = 0;
    w.ground = false;
    w.renderY = y;
    w.facing = x > oldX ? 1 : -1;
    cameraSnap = true;
    finishUtilityTurn("Teleported. Turn over.");
    return;
  }
  if (targetUtility === "girder") {
    if (Math.hypot(x - w.x, y - w.y) > 260) {
      $("#status").textContent = "Girder out of range. Move closer.";
      return;
    }
    utilityAmmo[team].girder--;
    addGirder(x, y, 0, 64);
    finishUtilityTurn("Girder placed. Turn over.");
  }
}
function useUtility(kind) {
  if (!canAct() || charging) return;
  if (kind === "jetpack" && jetpack.active) {
    stopJetpack();
    closeUtilities();
    return;
  }
  const count = utilityAmmo[team]?.[kind] ?? 0;
  if (count <= 0) {
    $("#utility-status").textContent = "None left. Find a field-kit crate.";
    return;
  }
  if (targetUtility) {
    targetUtility = null;
    activeUtility = null;
    updateUI();
    return;
  }
  if (kind === "rope") {
    toggleRope();
    return;
  }
  if (kind === "jetpack") {
    if (jetpack.active) stopJetpack();
    else startJetpack();
    utilitiesOpen = false;
    updateUI();
    return;
  }
  if (kind === "parachute") {
    parachuteArmed = true;
    activeUtility = null;
    utilitiesOpen = false;
    $("#utility-status").textContent =
      "Parachute armed. It deploys automatically on a hard fall.";
    updateUI();
    return;
  }
  if (kind === "teleport" || kind === "girder") {
    targetUtility = kind;
    activeUtility = kind;
    utilitiesOpen = false;
    $("#status").textContent =
      kind === "teleport"
        ? "Click or tap an empty spot to teleport."
        : "Click or tap to place a girder.";
    updateUI();
    return;
  }
  if (kind === "freeze") {
    for (const w of worms) if (w.team !== team && w.hp > 0) w.frozen = 1;
    utilityAmmo[team].freeze--;
    activeUtility = null;
    finishUtilityTurn("Freeze deployed. The other squad loses a turn.");
  }
}
function startJetpack() {
  if (!canAct() || (utilityAmmo[team]?.jetpack ?? 0) <= 0) return;
  if (rope.attached) stopRope();
  utilityAmmo[team].jetpack--;
  jetpack = {
    active: true,
    fuel: 30,
    owner: current,
    pulse: 0,
    pulseTime: 0,
  };
  activeUtility = "jetpack";
  wormLocked = true;
  const w = worms[current];
  w.ground = false;
  w.vx = 0;
  w.vy = 0;
  utilitiesOpen = false;
  $("#status").textContent =
    "Jet pack on. Up thrusts; left/right steer; R stops.";
  updateUI();
}
function stepJetpack(w, dt) {
  if (!jetpack.active || jetpack.owner !== current) return;
  jetpack.fuel -= dt * 6;
  if (jetpack.pulseTime > 0) {
    jetpack.pulseTime = Math.max(0, jetpack.pulseTime - dt);
    jetpack.fuel -= dt * 8;
  }
  const thrust =
    aimInput + (jetpack.pulseTime > 0 ? jetpack.pulse : 0) + (move ? 0 : 0);
  w.vx += move * 220 * dt;
  w.vy += thrust * 300 * dt;
  w.vy -= GRAVITY * gravityScale * 0.18 * dt;
  w.vx *= 0.995;
  w.vy *= 0.995;
  const px = w.x,
    py = w.y;
  w.x = Math.max(12, Math.min(W - 12, w.x + w.vx * dt));
  w.y = Math.max(12, Math.min(H, w.y + w.vy * dt));
  if (terrain.solid(w.x, w.y - 8)) {
    w.x = px;
    w.y = py;
    w.vx = 0;
    w.vy = 0;
    stopJetpack();
  }
  w.ground = false;
  w.moving = Boolean(move);
  w.facing = move < 0 ? -1 : move > 0 ? 1 : w.facing;
  if (jetpack.fuel <= 0) stopJetpack();
}
function makeRopeLine(anchor, w) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(anchor.x, anchor.y, 30),
    new THREE.Vector3(w.x, w.y + 18, 30),
  ]);
  const material = new THREE.LineBasicMaterial({
    color: 0xf4e4c0,
    transparent: true,
    opacity: 0.95,
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  group.add(line);
  return line;
}
function fireRope() {
  if (!canAct() || charging || targetUtility) return;
  if (rope.attached) {
    releaseRope();
    return;
  }
  const w = worms[current];
  const start = { x: w.x, y: w.y + 18 };
  const r = (angle * Math.PI) / 180;
  let hit = null;
  for (let d = 8; d <= 270; d += 3) {
    const x = start.x + Math.cos(r) * d,
      y = start.y + Math.sin(r) * d;
    if (terrain.solid(x, y)) {
      hit = {
        x: start.x + Math.cos(r) * Math.max(0, d - 4),
        y: start.y + Math.sin(r) * Math.max(0, d - 4),
      };
      break;
    }
  }
  if (!hit) {
    $("#status").textContent = "No rope anchor there. Aim at the island.";
    return;
  }
  rope = {
    attached: true,
    anchor: hit,
    length: Math.hypot(start.x - hit.x, start.y - hit.y),
    mesh: null,
  };
  rope.mesh = makeRopeLine(hit, w);
  w.ground = false;
  w.vx = 0;
  w.vy = 0;
  activeUtility = "rope";
  wormLocked = true;
  utilitiesOpen = false;
  $("#status").textContent =
    "Rope attached. Left/right swing; up/down shorten; R release.";
  updateUI();
}
function releaseRope() {
  if (!rope.attached) return;
  stopRope();
  wormLocked = true;
  $("#status").textContent = "Rope released.";
  updateUI();
}
function toggleRope() {
  if (rope.attached) releaseRope();
  else fireRope();
}
function stepRope(w, dt) {
  if (!rope.attached || w !== worms[current]) return;
  const a = rope.anchor;
  if (aimInput)
    rope.length = Math.max(34, Math.min(300, rope.length - aimInput * 95 * dt));
  let dx = w.x - a.x,
    dy = w.y - a.y,
    len = Math.hypot(dx, dy) || 1;
  const tx = -dy / len,
    ty = dx / len;
  w.vx += tx * move * 240 * dt;
  w.vy += ty * move * 240 * dt;
  w.vy -= GRAVITY * gravityScale * 0.9 * dt;
  w.vx *= 0.998;
  w.vy *= 0.998;
  const px = w.x,
    py = w.y;
  w.x += w.vx * dt;
  w.y += w.vy * dt;
  dx = w.x - a.x;
  dy = w.y - a.y;
  len = Math.hypot(dx, dy) || 1;
  const nx = dx / len,
    ny = dy / len;
  w.x = a.x + nx * rope.length;
  w.y = a.y + ny * rope.length;
  const radial = w.vx * nx + w.vy * ny;
  w.vx -= radial * nx;
  w.vy -= radial * ny;
  w.ground = false;
  w.moving = Boolean(move);
  w.facing = move < 0 ? -1 : move > 0 ? 1 : w.facing;
  if (terrain.solid(w.x, w.y - 8)) {
    w.x = px;
    w.y = py;
    stopRope();
  }
}
function updateRopeVisual(w) {
  if (!rope.mesh || !rope.attached) return;
  const pos = rope.mesh.geometry.attributes.position;
  pos.setXYZ(0, rope.anchor.x, rope.anchor.y, 30);
  pos.setXYZ(1, w.x, w.y + 18, 30);
  pos.needsUpdate = true;
}
function surrenderMatch() {
  if (!matchStarted || phase === "over" || phase === "menu") return;
  const losingTeam = mode === "ai" ? 0 : team;
  for (const w of worms)
    if (w.team === losingTeam) {
      w.hp = 0;
      w.deathPending = false;
      w.dying = 0;
    }
  if (menu.open) menu.close();
  if (format === "best3") {
    const winner = 1 - losingTeam;
    seriesWins = [0, 0];
    seriesWins[winner] = 2;
    finishMatch(winner, true);
  } else finishMatch(1 - losingTeam, false);
  updateUI();
}
function applyPoisonTick() {
  if (!poisoned) return;
  let hits = 0;
  for (const w of worms) {
    if (w.hp <= 0) continue;
    w.hp = Math.max(0, w.hp - 5);
    w.hurt = Math.max(w.hurt, 0.65);
    damageLabel(w, 5);
    hits++;
    if (w.hp === 0) {
      w.deathPending = true;
      w.dying = 0.8;
    }
  }
  if (hits) $("#status").textContent = "Nuclear poison: every worm loses 5 HP.";
  updateUI();
}
function applySuddenDeath() {
  if (sdTriggered) return false;
  sdTriggered = true;
  suddenDeath = true;
  if (suddenDeathType === "water") {
    waterLevel = waterLevelForRound(round);
    water.userData.setLevel?.(waterLevel);
    announce("SUDDEN DEATH — THE WATER RISES");
    return false;
  }
  if (suddenDeathType === "health") {
    for (const w of worms)
      if (w.hp > 0) {
        w.hp = 1;
        w.hurt = Math.max(w.hurt, 0.5);
      }
    announce("SUDDEN DEATH — EVERY WORM HAS 1 HP");
    updateUI();
    return false;
  }
  if (suddenDeathType === "nuke") {
    poisoned = true;
    announce("SUDDEN DEATH — NUCLEAR POISON");
    updateUI();
    return false;
  }
  const totals = [0, 1].map((t) =>
    worms.filter((w) => w.team === t).reduce((sum, w) => sum + w.hp, 0),
  );
  const winner = totals[0] === totals[1] ? null : totals[0] > totals[1] ? 0 : 1;
  announce(
    winner === null
      ? "SUDDEN DEATH — DEAD HEAT"
      : `SUDDEN DEATH — ${winner === 0 ? "MOSS COMPANY" : "CORAL CREW"} LEADS`,
  );
  for (const w of worms)
    if (winner !== null && w.team !== winner) {
      w.hp = 0;
      w.deathPending = false;
      w.dying = 0;
    }
  endGame();
  return true;
}
function coverDraw(ctx, image, x, y, w, h) {
  const scale = Math.max(w / image.width, h / image.height),
    iw = image.width * scale,
    ih = image.height * scale;
  ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}
async function shareResultCard() {
  if (!lastResult) return;
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (backdropMap.image) coverDraw(ctx, backdropMap.image, 0, 0, 1200, 630);
  else {
    ctx.fillStyle = "#173235";
    ctx.fillRect(0, 0, 1200, 630);
  }
  const shade = ctx.createLinearGradient(0, 0, 900, 0);
  shade.addColorStop(0, "rgba(12,38,41,.93)");
  shade.addColorStop(0.62, "rgba(12,38,41,.56)");
  shade.addColorStop(1, "rgba(12,38,41,0)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 1200, 630);
  if (portraitMaps[0].image)
    ctx.drawImage(portraitMaps[0].image, 650, 220, 330, 330);
  if (portraitMaps[1].image)
    ctx.drawImage(portraitMaps[1].image, 875, 270, 300, 300);
  const result =
    lastResult.winner === 0
      ? "MOSS COMPANY WINS"
      : lastResult.winner === 1
        ? "CORAL CREW WINS"
        : "MUTUAL DESTRUCTION";
  ctx.fillStyle = "#d4e36c";
  ctx.font = 'bold 24px "Bricolage Grotesque", sans-serif';
  ctx.fillText("POCKET SIEGE", 64, 92);
  ctx.fillStyle = "#fbf4e3";
  ctx.font = 'bold 56px "Bricolage Grotesque", sans-serif';
  ctx.fillText(result, 62, 190);
  ctx.fillStyle = "#e7dcc0";
  ctx.font = 'bold 26px "Bricolage Grotesque", sans-serif';
  const line = lastResult.series
    ? `BEST OF 3 · ${lastResult.seriesWins[0]}–${lastResult.seriesWins[1]}`
    : `FINAL HEALTH · ${lastResult.score[0]}–${lastResult.score[1]}`;
  ctx.fillText(line, 64, 248);
  if (lastResult.daily) {
    ctx.fillStyle = "#d4e36c";
    ctx.font = 'bold 22px "Bricolage Grotesque", sans-serif';
    ctx.fillText(`DAILY ISLAND · ${lastResult.date}`, 64, 292);
  }
  ctx.fillStyle = "#b9c6aa";
  ctx.font = 'bold 18px "Bricolage Grotesque", sans-serif';
  ctx.fillText(
    `BEST HIT ${record.bestHit}  ·  LONGEST ${record.longest}  ·  ${record.wins}W–${record.losses}L`,
    64,
    350,
  );
  ctx.fillStyle = "#fbf4e3";
  ctx.font = 'bold 21px "Bricolage Grotesque", sans-serif';
  ctx.fillText("PICK YOUR ANGLE. MAKE A LITTLE CHAOS.", 64, 430);
  ctx.fillStyle = "#d4e36c";
  ctx.font = 'bold 18px "Bricolage Grotesque", sans-serif';
  ctx.fillText("rnaud.github.io/pocket-siege", 64, 560);
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) return;
  const file = new File([blob], "pocket-siege-result.png", {
    type: "image/png",
  });
  if (coarsePointer && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "Pocket Siege",
        text: result,
      });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = "pocket-siege-result.png";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function startReplay() {
  if (replaying || !lastShot || lastShot.points.length < 2) return;
  replaying = true;
  cameraSnap = true;
  const full = cameraView(W / 2, H / 2, 1);
  Object.assign(view, full);
  cameraZoom = 1;
  cameraX = W / 2;
  cameraY = H / 2;
  applyView();
  replayClock = performance.now();
  replayDuration = Math.min(2.8, Math.max(1.1, lastShot.points.length * 0.018));
  const points = lastShot.points.map((p) => screen(p.x, p.y));
  aimHUD.replay.path.setAttribute(
    "d",
    points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" "),
  );
  aimHUD.replay.dot.setAttribute("cx", points[0].x);
  aimHUD.replay.dot.setAttribute("cy", points[0].y);
  aimHUD.replay.group.style.display = "";
  $("#replay").disabled = true;
  updateUI();
}
function endReplay() {
  replaying = false;
  aimHUD.replay.group.style.display = "none";
  if (lastShot?.impact) impactFlash(lastShot.impact.x, lastShot.impact.y);
  updateUI();
}
function resetMenuScroll() {
  menu.scrollTop = 0;
  requestAnimationFrame(() => {
    menu.scrollTop = 0;
  });
  setTimeout(() => {
    menu.scrollTop = 0;
  }, 60);
}
function updateSoundButton() {
  $("#sound").setAttribute("aria-pressed", String(sound));
  $("#sound").style.color = sound ? "#c3eb87" : "";
}
function saveSettings() {
  writeSettings({
    sound,
    mode: $("#mode").value,
    difficulty: $("#difficulty").value,
    format: $("#format").value,
    weather: $("#weather").value,
    modifier: $("#modifier").value,
    scheme: $("#scheme").value,
    turnTime: +$("#turn-time").value,
    retreatTime: +$("#retreat-time").value,
    suddenDeath: $("#sudden-death").value,
  });
}
function applySettings() {
  const saved = readSettings();
  const set = (selector, value) => {
    const control = $(selector);
    if (!control || ![...control.options].some((o) => o.value === value))
      return;
    control.value = value;
  };
  set("#mode", saved.mode);
  set("#difficulty", saved.difficulty);
  set("#format", saved.format);
  set("#weather", saved.weather);
  set("#modifier", saved.modifier);
  set("#scheme", saved.scheme);
  set("#turn-time", String(saved.turnTime));
  set("#retreat-time", String(saved.retreatTime));
  set("#sudden-death", saved.suddenDeath);
  sound = saved.sound;
  updateSoundButton();
}
function updateSliders() {
  $("#angle").value = angle;
  $("#angle-value").textContent = Math.round(angle) + "°";
  $("#fire").classList.toggle("charging", charging);
  const specialLabel = {
    mine: "PLACE MINE",
    dynamite: "DROP DYNAMITE",
    shotgun: "FIRE SHOTGUN",
    bat: "SWING BAT",
    airstrike: "CALL AIRSTRIKE",
  }[weapon];
  $("#fire-label").textContent = specialLabel
    ? specialLabel
    : charging
      ? "RELEASE TO FIRE"
      : "HOLD TO FIRE";
  $("#fire small").textContent = specialLabel
    ? coarsePointer
      ? "TAP TARGET OR PLACE"
      : "PRESS SPACE / CLICK"
    : coarsePointer
      ? "HOLD · RELEASE TO FIRE"
      : "HOLD SPACE · RELEASE TO SHOOT";
}
function startCharge(source) {
  if (
    charging ||
    !canAct() ||
    !worms[current].ground ||
    worms[current].knocked ||
    targetUtility ||
    rope.attached ||
    jetpack.active
  )
    return;
  wormLocked = true;
  if (weapon === "mine") {
    placeMine();
    return;
  }
  if (weapon === "dynamite") {
    placeDynamite();
    return;
  }
  if (weapon === "shotgun") {
    fireShotgun();
    return;
  }
  if (weapon === "bat") {
    fireBat();
    return;
  }
  if (weapon === "airstrike") {
    beginAirstrikeTargeting();
    return;
  }
  charging = true;
  chargeSeconds = 0;
  power = 0;
  move = 0;
  aimInput = 0;
  chargeSource = source;
  updateSliders();
  updateUI();
}
function cancelCharge() {
  if (chargeSource === "ai") aiWait = 0.3;
  charging = false;
  chargeSeconds = 0;
  power = 0;
  chargeSource = null;
}
function releaseCharge(source) {
  if (!charging || source !== chargeSource) return;
  charging = false;
  chargeSource = null;
  if (canAct()) fire();
  updateSliders();
  updateUI();
}
function turnFacing(direction) {
  const w = worms[current];
  if (!w || w.facing === direction) return;
  w.facing = direction;
  angle = 180 - angle;
  updateSliders();
}
function setMove(direction) {
  if (targetUtility) return;
  if (canMove()) {
    wormLocked = true;
    move = direction;
    if (!rope.attached && !jetpack.active) turnFacing(direction);
  }
}
function adjustAim(direction, dt) {
  if (!canAct() || charging) return;
  const facing = worms[current].facing,
    elevation = facing > 0 ? angle : 180 - angle;
  const next = Math.max(-85, Math.min(90, elevation + direction * 65 * dt));
  angle = facing > 0 ? next : 180 - next;
  updateSliders();
}
function injure(w, damage, direction = 0) {
  if (w.hp <= 0 || damage <= 0) return;
  w.hp = Math.max(0, w.hp - damage);
  w.hurt = 1.4;
  w.hits++;
  if (direction) w.hitDirection = direction;
  if (w.hp === 0) {
    w.deathPending = true;
    slowMo = Math.max(slowMo, 0.7);
  }
  damageLabel(w, damage, direction);
  if (w === worms[current]) {
    cancelCharge();
    retreat = 0;
    move = 0;
    aimInput = 0;
    if (phase === "aim") {
      phase = "settle";
      shotWait = 0;
    }
  }
  updateUI();
}
function placeMine() {
  if (!canAct() || !worms[current]?.ground || worms[current].knocked) return;
  wormLocked = true;
  if (ammoFor(ammo[team], "mine") <= 0) {
    setWeapon("rocket");
    return;
  }
  const w = worms[current],
    mesh = createMine(mineMap);
  mesh.position.set(w.x, w.y - 4, 18);
  group.add(mesh);
  mines.push({
    x: w.x,
    y: w.y - 4,
    owner: current,
    team,
    arm: 1.2,
    mesh,
    bob: Math.random() * Math.PI * 2,
  });
  ammo[team].mine = Math.max(0, ammo[team].mine - 1);
  if (ammo[team].mine === 0) setWeapon("rocket");
  charging = false;
  chargeSource = null;
  w.recoil = 0.15;
  phase = "settle";
  retreat = retreatSeconds;
  shotWait = 0;
  move = 0;
  shotCount++;
  $("#status").textContent = "Mine planted. Retreat!";
  tone(420, 0.1, "square");
  updateSliders();
  updateUI();
}
function finishAction(message) {
  phase = "settle";
  retreat = retreatSeconds;
  shotWait = 0;
  move = 0;
  wormLocked = true;
  $("#status").textContent = message;
  updateUI();
}
function spendSpecial(kind) {
  ammo[team][kind] = Math.max(0, (ammo[team][kind] ?? 0) - 1);
  if (ammo[team][kind] === 0) setWeapon("rocket");
}
function spawnBomb({
  x,
  y,
  vx = 0,
  vy = 0,
  fuse = 2,
  owner = -1,
  kind = "bomblet",
  grounded = false,
}) {
  const mesh = createProjectile("grenade");
  mesh.position.set(x, y, 40);
  const ball = mesh.children[0];
  if (ball?.material?.color)
    ball.material.color.setHex(
      kind === "dynamite"
        ? 0xb85b45
        : kind === "cluster"
          ? 0xe7a34a
          : kind === "napalm"
            ? 0xff7b3c
            : 0x9caf59,
    );
  group.add(mesh);
  bombs.push({
    x,
    y,
    vx,
    vy,
    fuse,
    owner,
    kind,
    mesh,
    grounded,
    impact: !grounded,
  });
}
function spawnAirstrike(x) {
  for (let i = -2; i <= 2; i++) {
    spawnBomb({
      x: x + i * 34 + (Math.random() - 0.5) * 12,
      y: H - 8,
      vx: (Math.random() - 0.5) * 18,
      vy: -20 - Math.random() * 20,
      fuse: 2.8,
      owner: current,
      kind: "bomblet",
    });
  }
}
function placeDynamite() {
  if (!canAct() || (ammoFor(ammo[team], "dynamite") ?? 0) <= 0) return;
  const w = worms[current];
  spendSpecial("dynamite");
  w.recoil = 0.2;
  shotCount++;
  spawnBomb({
    x: w.x,
    y: w.y + 4,
    fuse: 3,
    owner: current,
    kind: "dynamite",
    grounded: true,
  });
  finishAction("Dynamite dropped. Three-second fuse — retreat!");
  tone(430, 0.12, "square");
}
function fireShotgun() {
  if (!canAct() || (ammoFor(ammo[team], "shotgun") ?? 0) <= 0) return;
  const w = worms[current],
    origin = shot(w, angle, "shotgun"),
    start = terrain.solid(origin.muzzle.x, origin.muzzle.y)
      ? { x: origin.pivot.x, y: origin.pivot.y }
      : { x: origin.muzzle.x, y: origin.muzzle.y },
    r = (angle * Math.PI) / 180;
  let hit = null,
    victim = null;
  for (let d = 4; d <= 300; d += 2) {
    const x = start.x + Math.cos(r) * d,
      y = start.y + Math.sin(r) * d;
    const target = worms.find(
      (t) => t.hp > 0 && (t !== w || d > 28) && hitsWorm(t, x, y, 5),
    );
    if (target) {
      hit = { x, y };
      victim = target;
      break;
    }
    if (terrain.solid(x, y)) {
      hit = { x, y };
      break;
    }
  }
  hit ??= {
    x: start.x + Math.cos(r) * 300,
    y: start.y + Math.sin(r) * 300,
  };
  spendSpecial("shotgun");
  shotCount++;
  wormLocked = true;
  if (victim) {
    const dir = Math.sign(victim.x - w.x) || 1;
    injure(victim, Math.round(WEAPONS.shotgun.damage * blastScale), dir);
    victim.knocked = true;
    victim.ground = false;
    victim.vx = dir * 230;
    victim.vy = 130;
    impactFlash(hit.x, hit.y);
    finishAction(`${w.name} hits ${victim.name} with the shotgun.`);
  } else {
    terrain.carve(hit.x, hit.y, 14);
    terrainDirty = true;
    impactFlash(hit.x, hit.y);
    finishAction("Shotgun blast. Terrain chipped.");
  }
  lastShot = {
    kind: "shotgun",
    shooter: w.name,
    points: [start, hit],
    impact: { ...hit, kind: "shotgun" },
  };
  tone(180, 0.18, "square");
}
function fireBat() {
  if (!canAct() || (ammoFor(ammo[team], "bat") ?? 0) <= 0) return;
  const w = worms[current];
  let victim = null,
    best = 52;
  for (const t of worms) {
    if (t.hp <= 0 || t.team === w.team) continue;
    const d = Math.hypot(t.x - w.x, (t.y - w.y) * 0.7);
    if (d < best) ((best = d), (victim = t));
  }
  spendSpecial("bat");
  shotCount++;
  wormLocked = true;
  if (victim) {
    const dir = Math.sign(victim.x - w.x) || 1;
    injure(victim, WEAPONS.bat.damage, dir);
    victim.knocked = true;
    victim.ground = false;
    victim.vx = dir * 360;
    victim.vy = 165;
    impactFlash(victim.x, victim.y + 20);
    finishAction(`${w.name} sends ${victim.name} flying with the bat.`);
    tone(120, 0.2, "square");
  } else {
    finishAction("Bat swing. Nothing in range.");
    tone(260, 0.1);
  }
}
function beginAirstrikeTargeting() {
  if ((ammoFor(ammo[team], "airstrike") ?? 0) <= 0) return;
  targetUtility = "airstrike";
  activeUtility = "airstrike";
  specialOpen = false;
  wormLocked = true;
  $("#status").textContent = "Click or tap the island to call the airstrike.";
  updateUI();
}
function fire() {
  if (phase !== "aim" || targetUtility || rope.attached || jetpack.active)
    return;
  wormLocked = true;
  const w = worms[current],
    kind = weapon,
    meta = WEAPONS[kind];
  if (kind === "mine") {
    placeMine();
    return;
  }
  if (kind === "dynamite") {
    placeDynamite();
    return;
  }
  if (kind === "shotgun") {
    fireShotgun();
    return;
  }
  if (kind === "bat") {
    fireBat();
    return;
  }
  if (kind === "airstrike") {
    beginAirstrikeTargeting();
    return;
  }
  if (ammoFor(ammo[team], kind) <= 0) {
    setWeapon("rocket");
    return;
  }
  const origin = launchGeometry(w, angle, kind, terrain),
    v = launch(angle, power);
  const launchPoint = terrain.solid(origin.muzzle.x, origin.muzzle.y)
    ? origin.pivot
    : origin.muzzle;
  v.vx *= meta.speed;
  v.vy *= meta.speed;
  const thisFuse = shotFuse ?? fuse,
    thisBounce = shotBounce ?? bounce;
  shotFuse = null;
  shotBounce = null;
  const fromAi = chargeSource === "ai";
  w.recoil = 0.3;
  charging = false;
  chargeSource = null;
  if (fromAi) aiRetreatTime = 1.1;
  updateSliders();
  firedPower = power;
  shotCount++;
  retreat = retreatSeconds;
  if (kind !== "rocket") {
    ammo[team][kind] = Math.max(0, (ammo[team][kind] ?? 0) - 1);
    if (ammo[team][kind] === 0) setWeapon("rocket");
  }
  projectile = {
    ...launchPoint,
    ...v,
    launchX: launchPoint.x,
    launchY: launchPoint.y,
    age: 0,
    fuse: thisFuse,
    bounce: thisBounce,
    owner: current,
    sleeping: false,
    stuck: false,
    attached: null,
    kind,
    mesh: projectileMesh(kind),
    trail: [],
    blocked: launchPoint === origin.muzzle ? origin.blocked : false,
  };
  projectile.mesh.position.set(projectile.x, projectile.y, 40);
  group.add(projectile.mesh);
  lastShot = {
    kind,
    shooter: w.name,
    points: [{ x: projectile.x, y: projectile.y }],
    impact: null,
  };
  phase = "flight";
  bannerTime = 0;
  $("#status").textContent =
    kind === "rocket"
      ? "Rocket away. Incoming!"
      : kind === "mortar"
        ? "Mortar away. Heavy impact incoming!"
        : `${kind === "sticky" ? "Sticky bomb" : "Grenade"} thrown. ${thisFuse}-second fuse. Retreat!`;
  move = 0;
  shotWait = 0;
  tone(550, 0.2, "triangle");
  updateUI();
}
function explode(x, y, kind, ownerIndex = -1) {
  const scale = blastScale;
  const profile =
    kind === "death"
      ? {
          radius: 28 * scale,
          damage: 25 * scale,
          impulse: 220 * scale,
        }
      : {
          radius: WEAPONS[kind].radius * scale,
          damage: WEAPONS[kind].damage * scale,
          impulse: 380 * scale,
        };
  const { radius, damage: maxDamage, impulse } = profile;
  terrain.carve(x, y, radius);
  terrainDirty = true;
  explosions++;
  shakeUntil = performance.now() + 350;
  impactFlash(x, y);
  tone(85, 0.6, "sawtooth");
  if (kind === "cluster") {
    for (let i = 0; i < 4; i++)
      spawnBomb({
        x: x + (Math.random() - 0.5) * 40,
        y: y + 18 + Math.random() * 18,
        vx: (Math.random() - 0.5) * 160,
        vy: 70 + Math.random() * 90,
        fuse: 0.7 + Math.random() * 0.5,
        owner: ownerIndex,
        kind: "bomblet",
      });
  }
  if (kind === "napalm") {
    for (let i = 0; i < 3; i++)
      spawnFire(
        x + (i - 1) * 42 + (Math.random() - 0.5) * 12,
        y - 10,
        ownerIndex,
      );
  }
  const chained = hazards.filter(
    (h) => Math.hypot(h.x - x, h.y - y) < radius + 18,
  );
  for (const h of chained) {
    hazards.splice(hazards.indexOf(h), 1);
    dispose(h.mesh);
    explode(h.x, h.y, "barrel", ownerIndex);
  }
  for (let i = 0; i < 46; i++) {
    const a = Math.random() * Math.PI * 2,
      s = 40 + Math.random() * 210,
      size = 2 + Math.random() * 6;
    const mesh = new THREE.Mesh(debrisGeometry, debrisMaterials[i % 3 ? 0 : 1]);
    mesh.position.set(x, y, 35);
    mesh.scale.setScalar(size);
    group.add(mesh);
    particles.push({
      mesh,
      size,
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.5 + Math.random() * 0.8,
      max: 1.3,
    });
  }
  const reports = [];
  let dealt = 0;
  for (const w of worms) {
    if (w.hp <= 0) continue;
    const factor = blastImpulse(w, x, y, radius + 34, impulse);
    if (factor > 0) {
      const damage = Math.max(1, Math.round(factor * maxDamage));
      const direction = Math.sign(w.x - x) || 1;
      injure(w, damage, direction);
      if (ownerIndex >= 0 && worms[ownerIndex]?.team !== w.team)
        dealt += damage;
      reports.push(`${w.name} −${damage}${w.hp === 0 ? " · KO" : ""}`);
    }
  }
  if (dealt > 0) {
    const best = recordBest(record, { bestHit: dealt });
    if (best.bestHit !== record.bestHit) {
      record = best;
      writeRecord(record);
      updateRecordUI();
    }
  }
  if (reports.length) hitStop = Math.max(hitStop, 0.06);
  $("#status").textContent = reports.length
    ? reports.join("   /   ")
    : "Terrain destroyed. No worms hit.";
  updateUI();
}
function spawnDust(x, y) {
  const mesh = new THREE.Mesh(dustGeometry, dustMaterial),
    size = 2 + Math.random() * 3;
  mesh.position.set(x, y, 30);
  mesh.scale.setScalar(size);
  group.add(mesh);
  particles.push({
    mesh,
    size,
    x,
    y,
    vx: (Math.random() - 0.5) * 18,
    vy: 8 + Math.random() * 14,
    life: 0.4,
    max: 0.4,
  });
}
function impactFlash(x, y) {
  const p = screen(x, y),
    flash = document.createElement("span");
  flash.className = "impact-flash";
  flash.style.left = p.x + "px";
  flash.style.top = p.y + "px";
  $("#damage").appendChild(flash);
  setTimeout(() => flash.remove(), 600);
}
function damageLabel(w, n, direction = 0) {
  const p = screen(w.x, w.y + 30),
    el = document.createElement("span");
  el.className = "damage-number";
  el.textContent =
    typeof n === "number"
      ? `${direction < 0 ? "←" : direction > 0 ? "→" : ""}−${n}`
      : n;
  el.style.left = p.x + "px";
  el.style.top = p.y + "px";
  $("#damage").appendChild(el);
  setTimeout(() => el.remove(), 1300);
}
function finishMatch(winner, series) {
  phase = "over";
  cameraSnap = true;
  aimHUD.guide.style.display = "none";
  const name =
    winner === 0
      ? "MOSS COMPANY"
      : winner === 1
        ? "CORAL CREW"
        : "MUTUAL DESTRUCTION";
  announce(
    winner === null
      ? "MUTUAL DESTRUCTION!"
      : series
        ? `${name} WINS THE SERIES!`
        : `${name} WINS!`,
  );
  announceUntil = Infinity;
  $("#turn-label").textContent = series ? "SERIES COMPLETE" : "MATCH COMPLETE";
  $("#status").textContent =
    format === "best3"
      ? `Final series ${seriesWins[0]}–${seriesWins[1]}. Tap New match for another.`
      : "Good game. Tap New match for another round.";
  updateSeriesHUD();
  const score = [0, 1].map((t) =>
    worms.filter((w) => w.team === t).reduce((sum, w) => sum + w.hp, 0),
  );
  lastResult = {
    winner,
    series: Boolean(series),
    seriesWins: [...seriesWins],
    score,
    daily: Boolean(daily),
    date: new Date().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    mode,
  };
  if (mode === "ai" || daily) {
    record = applyMatchResult(record, {
      won: winner === 0,
      ai: mode === "ai",
      daily: Boolean(daily),
      dateKey: daily?.date,
      draw: winner === null,
    });
    writeRecord(record);
  }
  updateRecordUI();
  updateUI();
}
function endGame() {
  const a = worms.some((w) => w.team === 0 && w.hp > 0),
    b = worms.some((w) => w.team === 1 && w.hp > 0);
  const winner = a && !b ? 0 : b && !a ? 1 : null;
  if (format === "best3" && winner !== null) {
    seriesWins = nextSeriesWins(seriesWins, winner);
    const wonSeries = seriesWinner(seriesWins);
    if (wonSeries !== null) return finishMatch(wonSeries, true);
    phase = "break";
    breakTimer = 4.5;
    aimHUD.guide.style.display = "none";
    announce(
      `${winner ? "CORAL CREW" : "MOSS COMPANY"} TAKES ROUND ${seriesRound}`,
    );
    $("#turn-label").textContent = "ROUND OVER";
    $("#status").textContent =
      `Series ${seriesWins[0]}–${seriesWins[1]}. Next island incoming…`;
    updateSeriesHUD();
    updateUI();
    return;
  }
  if (format === "best3" && winner === null) {
    if (seriesRound >= 9) return finishMatch(null, true);
    phase = "break";
    breakTimer = 4.5;
    aimHUD.guide.style.display = "none";
    announce("MUTUAL DESTRUCTION — NEXT ISLAND");
    $("#turn-label").textContent = "ROUND OVER";
    $("#status").textContent =
      `Series ${seriesWins[0]}–${seriesWins[1]}. Next island incoming…`;
    updateSeriesHUD();
    updateUI();
    return;
  }
  finishMatch(winner, false);
}
function nextTurn() {
  if ([0, 1].some((t) => !worms.some((w) => w.team === t && w.hp > 0)))
    return endGame();
  team = 1 - team;
  if (team === 0) {
    round++;
    if (
      !crate &&
      (crateRain ? round % 2 === 0 : round >= 3 && round % 3 === 0)
    ) {
      spawnCrate();
      announce("SUPPLY DROP INBOUND");
    }
    if (!sdTriggered && round >= 6) {
      if (applySuddenDeath()) return;
    }
    if (suddenDeath && suddenDeathType === "water") {
      const nextWater = waterLevelForRound(round);
      if (nextWater > waterLevel) {
        waterLevel = nextWater;
        water.userData.setLevel?.(waterLevel);
        announce("THE WATER IS RISING");
      }
    }
  }
  beginTurn();
}
function jump(kind = "forward") {
  if (rope.attached) {
    rope.length = Math.max(
      34,
      Math.min(300, rope.length + (kind === "up" ? -45 : 45)),
    );
    return;
  }
  if (jetpack.active) {
    jetpack.pulse = kind === "backflip" ? -1 : 1;
    jetpack.pulseTime = 0.22;
    return;
  }
  if (!canMove()) return;
  wormLocked = true;
  const w = worms[current];
  const double = lastJump.kind === kind && jumpClock - lastJump.time < 0.28;
  if (!w.ground && !double) return;
  if (kind === "backflip" || (kind === "up" && double)) {
    w.vy = 190;
    w.vx = -w.facing * 50;
  } else if (kind === "up") {
    w.vy = 155;
    w.vx = 0;
  } else {
    w.vy = 140;
    w.vx = w.facing * (double ? -65 : 65);
  }
  w.ground = false;
  lastJump = { kind: double ? null : kind, time: jumpClock };
  tone(300, 0.1);
}
function startAiTurn() {
  const w = worms[current];
  const aiAlive = worms.filter((t) => t.team === 1 && t.hp > 0).length;
  const playerAlive = worms.filter((t) => t.team === 0 && t.hp > 0).length;
  if ((utilityAmmo[1]?.freeze ?? 0) > 0 && aiAlive < playerAlive) {
    utilityAmmo[1].freeze--;
    for (const target of worms)
      if (target.team === 0 && target.hp > 0) target.frozen = 1;
    phase = "settle";
    retreat = 0;
    shotWait = 0;
    move = 0;
    $("#status").textContent =
      "The computer freezes your squad. Your next turn is lost.";
    updateUI();
    return;
  }
  const reposition = planMove({
    terrain,
    me: w,
    waterLevel,
    difficulty,
    crate,
    random: Math.random,
  });
  if (reposition && w.ground) {
    aiMoveTime = reposition.time;
    aiMoveDirection = reposition.direction;
    w.facing = reposition.direction;
    aiWait = Infinity;
    $("#status").textContent = "The computer is repositioning…";
    return;
  }
  aiAim();
}
function aiAim() {
  const w = worms[current];
  const started = performance.now();
  const plan = planTurn({
    terrain,
    worms,
    me: w,
    wind,
    waterLevel,
    difficulty,
    ammo: ammo[1],
    fuse: 2,
    bounce: 0.55,
    gravityScale,
    blastScale,
  });
  lastAiPlanMs = performance.now() - started;
  const chosen = plan ?? {
    weapon: "rocket",
    angle: w.facing < 0 ? 135 : 45,
    power: 60,
    fuse: 0,
    bounce: 0.55,
  };
  aiPlan = chosen;
  angle = chosen.angle;
  aiPower = chosen.power;
  shotFuse = WEAPONS[chosen.weapon].timed ? chosen.fuse || 2 : null;
  shotBounce = chosen.bounce ?? 0.55;
  weapon = chosen.weapon;
  setWeapon(weapon);
  w.facing = Math.cos((angle * Math.PI) / 180) < 0 ? -1 : 1;
  power = 0;
  charging = true;
  chargeSource = "ai";
  chargeSeconds = 0;
  aiWait = Infinity;
  updateSliders();
  $("#status").textContent =
    `Computer lines up the ${WEAPONS[weapon].label.toLowerCase()}…`;
}
function step(dt) {
  if (menu.open || document.hidden) return;
  if (replaying) return;
  if (hitStop > 0) {
    hitStop = Math.max(0, hitStop - dt);
    return;
  }
  if (phase === "break") {
    breakTimer = Math.max(0, breakTimer - dt);
    if (breakTimer === 0) {
      seriesRound++;
      reset({ keepSeries: true });
    }
    return;
  }
  for (const w of worms) w.moving = false;
  jumpClock += dt;
  bannerTime = Math.max(0, bannerTime - dt);
  if (retreat > 0) {
    retreat = Math.max(0, retreat - dt);
    if (retreat === 0) {
      move = 0;
      updateUI();
    }
  }
  if (phase === "aim") {
    time -= dt;
    if (time <= 0) {
      cancelCharge();
      stopRope();
      stopJetpack();
      parachuteArmed = false;
      phase = "settle";
      shotWait = 0;
      move = 0;
      aimInput = 0;
      updateUI();
    }
    if (charging) {
      chargeSeconds += dt;
      power = chargePower(chargeSeconds);
      if (power >= (chargeSource === "ai" ? aiPower : 100)) {
        charging = false;
        chargeSource = null;
        fire();
      }
    }
    if (aimInput && !rope.attached && !jetpack.active) adjustAim(aimInput, dt);
    if (team === 1 && mode === "ai") {
      if (aiMoveTime > 0) {
        aiMoveTime = Math.max(0, aiMoveTime - dt);
        const w = worms[current];
        if (w.ground && !w.knocked)
          w.moving = walkWorm(w, terrain, aiMoveDirection, dt);
        if (aiMoveTime === 0) aiAim();
      } else {
        aiWait -= dt;
        if (aiWait <= 0 && phase === "aim" && worms[current].ground)
          startAiTurn();
      }
    }
  }
  if (canMove() && move && !rope.attached && !jetpack.active) {
    const w = worms[current];
    w.moving = walkWorm(w, terrain, move, dt);
  }
  if (
    team === 1 &&
    mode === "ai" &&
    aiRetreatTime > 0 &&
    retreat > 0 &&
    !charging
  ) {
    aiRetreatTime = Math.max(0, aiRetreatTime - dt);
    const w = worms[current];
    if (w.ground && !w.knocked) {
      const target = worms
        .filter((t) => t.team !== w.team && t.hp > 0)
        .sort((a, b) => Math.abs(a.x - w.x) - Math.abs(b.x - w.x))[0];
      let direction = target ? (target.x > w.x ? -1 : 1) : -w.facing;
      if (w.y - 10 < waterLevel + 35) direction = w.x < W / 2 ? 1 : -1;
      w.moving = walkWorm(w, terrain, direction, dt);
    }
  }
  for (const w of worms) {
    w.hurt = Math.max(0, w.hurt - dt);
    w.recoil = Math.max(0, w.recoil - dt);
    if (w.dying > 0) {
      w.dying = Math.max(0, w.dying - dt);
      if (w.dying === 0 && w.deathPending) {
        w.deathPending = false;
        explode(w.x, w.y + 6, "death");
      }
    }
    w.g.visible = w.hp > 0 || w.deathPending || w.dying > 0;
    if ((w.hp <= 0 && !w.deathPending) || w.dying > 0) continue;
    let result = { fallDamage: 0 };
    if (w === worms[current] && jetpack.active) {
      stepJetpack(w, dt);
    } else if (w === worms[current] && rope.attached) {
      stepRope(w, dt);
    } else {
      if (w === worms[current] && parachuteArmed && !w.ground && w.vy < -240) {
        parachuteArmed = false;
        utilityAmmo[team].parachute = Math.max(
          0,
          utilityAmmo[team].parachute - 1,
        );
        w.vy = Math.max(w.vy, -70);
        $("#status").textContent = `${w.name}'s parachute deploys.`;
        updateUI();
      }
      result = stepWorm(w, terrain, dt, gravityScale);
    }
    if (result.fallDamage) injure(w, result.fallDamage);
    if (w.y - 10 < waterLevel || w.x < -30 || w.x > W + 30) {
      w.hp = 0;
      w.deathPending = false;
      w.drowned = true;
      w.dying = 0.65;
      w.hurt = 0.65;
      slowMo = Math.max(slowMo, 0.5);
      impactFlash(w.x, waterLevel);
      tone(150, 0.3);
      damageLabel(w, "SPLASH");
      if (w === worms[current]) {
        cancelCharge();
        retreat = 0;
        move = 0;
        if (phase === "aim") {
          phase = "settle";
          shotWait = 0;
        }
      }
      updateUI();
    } else if (w.deathPending && w.ground && Math.abs(w.vx) < 2) w.dying = 0.8;
  }
  if (crate) {
    const collector = worms.find(
      (w) =>
        !crate.falling &&
        w.hp > 0 &&
        Math.hypot(w.x - crate.x, w.y + 20 - crate.y) < 30,
    );
    if (collector) collectCrate(collector);
  }
  for (let i = phase === "over" ? -1 : mines.length - 1; i >= 0; i--) {
    const mine = mines[i];
    if (mine.arm > 0) {
      mine.arm = Math.max(0, mine.arm - dt);
      continue;
    }
    const victim = worms.find(
      (w) => w.hp > 0 && Math.hypot(w.x - mine.x, w.y + 20 - mine.y) < 34,
    );
    if (!victim) continue;
    mines.splice(i, 1);
    dispose(mine.mesh);
    explode(mine.x, mine.y, "mine", mine.owner);
  }
  if (phase === "aim") updateUI();
  if (projectile) {
    const p = projectile;
    const ox = p.x,
      oy = p.y;
    if (!p.stuck && p.sleeping && !terrain.solid(p.x, p.y - 4))
      p.sleeping = false;
    if (p.attached) {
      p.x = p.attached.w.x + p.attached.dx;
      p.y = p.attached.w.y + p.attached.dy;
    }
    if (!p.sleeping && !p.stuck) {
      if (p.kind === "homing") {
        const owner = worms[p.owner];
        const target = worms
          .filter((t) => t.hp > 0 && t.team !== owner?.team)
          .sort(
            (a, b) =>
              Math.hypot(a.x - p.x, a.y - p.y) -
              Math.hypot(b.x - p.x, b.y - p.y),
          )[0];
        if (target) {
          const speed = Math.hypot(p.vx, p.vy),
            current = Math.atan2(p.vy, p.vx),
            desired = Math.atan2(target.y + 17 - p.y, target.x - p.x);
          let delta =
            ((desired - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          delta = Math.max(-2.8 * dt, Math.min(2.8 * dt, delta));
          p.vx = Math.cos(current + delta) * speed;
          p.vy = Math.sin(current + delta) * speed;
        }
      }
      integrate(p, dt, WEAPONS[p.kind].wind ? wind : 0, gravityScale);
    }
    p.age += dt;
    let hit = p.blocked;
    p.blocked = false;
    const distance = Math.hypot(p.x - ox, p.y - oy),
      steps = Math.max(1, Math.ceil(distance / 2));
    for (let s = 1; s <= steps && !hit; s++) {
      const x = ox + ((p.x - ox) * s) / steps,
        y = oy + ((p.y - oy) * s) / steps;
      if (
        terrain.solid(x, y) ||
        worms.some(
          (w, i) =>
            w.hp > 0 && (i !== p.owner || p.age > 0.25) && hitsWorm(w, x, y, 3),
        )
      ) {
        p.x = x;
        p.y = y;
        hit = true;
        break;
      }
    }
    let boom =
      (["rocket", "mortar"].includes(p.kind) && hit) ||
      (["grenade", "sticky"].includes(p.kind) && p.age >= p.fuse);
    if (hit && p.kind === "sticky" && !p.stuck) {
      p.stuck = true;
      p.vx = 0;
      p.vy = 0;
      const w = worms.find(
        (w, i) =>
          w.hp > 0 &&
          (i !== p.owner || p.age > 0.25) &&
          hitsWorm(w, p.x, p.y, 3),
      );
      if (w) p.attached = { w, dx: p.x - w.x, dy: p.y - w.y };
    }
    if (hit && p.kind === "grenade") {
      const victim = worms.find(
        (w, i) =>
          w.hp > 0 &&
          (i !== p.owner || p.age > 0.25) &&
          hitsWorm(w, p.x, p.y, 3),
      );
      let n = victim
        ? { x: p.x - victim.x, y: p.y - victim.y - 17 }
        : terrainNormal(terrain, p.x, p.y, p.vx, p.vy);
      const l = Math.hypot(n.x, n.y) || 1;
      n = { x: n.x / l, y: n.y / l };
      reflectVelocity(p, n, p.bounce);
      p.x = ox + n.x * 0.3;
      p.y = oy + n.y * 0.3;
      if (n.y > 0.5 && Math.hypot(p.vx, p.vy) < 16) {
        p.vx = 0;
        p.vy = 0;
        p.sleeping = true;
      }
    }
    p.mesh.position.set(p.x, p.y, 40);
    if (lastShot) {
      const lastPoint = lastShot.points[lastShot.points.length - 1];
      if (!lastPoint || Math.hypot(p.x - lastPoint.x, p.y - lastPoint.y) > 6)
        lastShot.points.push({ x: p.x, y: p.y });
    }
    p.mesh.rotation.z =
      p.kind === "rocket" ? Math.atan2(p.vy, p.vx) : p.age * 5;
    if (Math.floor(p.age * 60) !== Math.floor((p.age - dt) * 60)) {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 28) p.trail.shift();
    }
    if (boom || p.y < waterLevel || p.x < -50 || p.x > W + 50 || p.age > 12) {
      if (boom && p.y > waterLevel) {
        if (lastShot) lastShot.impact = { x: p.x, y: p.y, kind: p.kind };
        const distance = Math.hypot(p.x - p.launchX, p.y - p.launchY);
        const best = recordBest(record, { longest: distance });
        if (best.longest !== record.longest) {
          record = best;
          writeRecord(record);
          updateRecordUI();
        }
        explode(p.x, p.y, p.kind, p.owner);
      }
      group.remove(p.mesh);
      projectile = null;
      phase = "settle";
      shotWait = 0;
      updateUI();
    }
  }
  stepBombs(dt);
  stepFires(dt);
  if (crate?.falling) {
    crate.vy -= 220 * dt;
    crate.y += crate.vy * dt;
    crate.mesh.position.set(crate.x, crate.y, 18);
    if (crate.y <= crate.targetY) {
      crate.y = crate.targetY;
      crate.falling = false;
      crate.vy = 0;
      announce("SUPPLY CRATE LANDED");
    }
  }
  if (phase === "settle") {
    const settled =
      !projectile &&
      bombs.length === 0 &&
      retreat <= 0 &&
      worms.every(
        (w) =>
          !w.deathPending &&
          w.dying <= 0 &&
          (w.hp <= 0 || (w.ground && Math.abs(w.vx) < 2 && Math.abs(w.vy) < 2)),
      );
    shotWait = settled ? shotWait + dt : 0;
    if (shotWait > 0.7) nextTurn();
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    integrate(p, dt, 0, gravityScale);
    p.life -= dt;
    p.mesh.position.set(p.x, p.y, 35);
    p.mesh.scale.setScalar(Math.max(0.01, (p.life / p.max) * p.size));
    if (p.life <= 0) {
      group.remove(p.mesh);
      particles.splice(i, 1);
    }
  }
}
function screen(x, y) {
  return {
    x: ((x - view.x) / view.w) * arena.clientWidth,
    y: ((view.y + view.h - y) / view.h) * arena.clientHeight,
  };
}
function resize() {
  renderer.setSize(arena.clientWidth, arena.clientHeight, false);
  const correction = arena.clientHeight / H / (arena.clientWidth / W);
  const aspect = arena.clientWidth / arena.clientHeight;
  const imageAspect = backdropMap.image
    ? backdropMap.image.width / backdropMap.image.height
    : 16 / 9;
  backdropMap.repeat.set(
    Math.min(1, aspect / imageAspect),
    Math.min(1, imageAspect / aspect),
  );
  backdropMap.offset.set(
    (1 - backdropMap.repeat.x) / 2,
    (1 - backdropMap.repeat.y) / 2,
  );
  for (const w of worms) {
    w.g.scale.x = correction;
    w.visualSize = Math.max(70, (31 * H) / arena.clientHeight);
  }
}
new ResizeObserver(() => requestAnimationFrame(resize)).observe(arena);
function frame(now) {
  requestAnimationFrame(frame);
  const frameDt = Math.min((now - last) / 1000, 0.1);
  const slow = slowMo > 0 && !reducedMotion;
  if (slowMo > 0) slowMo = Math.max(0, slowMo - frameDt);
  accumulator += frameDt * (slow ? 0.35 : 1);
  last = now;
  arena.classList.toggle("slow-mo", slow);
  while (accumulator >= 1 / 120) {
    step(1 / 120);
    accumulator -= 1 / 120;
  }
  const camTarget = chooseCameraTarget({
    phase,
    projectile,
    worms,
    active: worms[current],
  });
  if (cameraSnap) {
    cameraZoom = camTarget.zoom;
    cameraX = camTarget.cx;
    cameraY = camTarget.cy;
    cameraSnap = false;
  } else {
    const ease = 1 - Math.exp(-frameDt * 4.5);
    cameraZoom += (camTarget.zoom - cameraZoom) * ease;
    cameraX += (camTarget.cx - cameraX) * ease;
    cameraY += (camTarget.cy - cameraY) * ease;
  }
  const nextView = cameraView(cameraX, cameraY, cameraZoom);
  view.x = nextView.x;
  view.y = nextView.y;
  view.w = nextView.w;
  view.h = nextView.h;
  view.zoom = nextView.zoom;
  applyView();
  if (replaying) {
    const t = Math.min(
      1,
      (now - replayClock) / 1000 / Math.max(0.1, replayDuration),
    );
    const points = lastShot?.points ?? [];
    if (points.length > 1) {
      const pos = t * (points.length - 1),
        index = Math.min(points.length - 1, Math.floor(pos)),
        next = Math.min(points.length - 1, index + 1),
        fraction = pos - index,
        a = points[index],
        b = points[next],
        p = screen(a.x + (b.x - a.x) * fraction, a.y + (b.y - a.y) * fraction);
      aimHUD.replay.dot.setAttribute("cx", p.x);
      aimHUD.replay.dot.setAttribute("cy", p.y);
    }
    if (t >= 1) endReplay();
  }
  const canReplay =
    !replaying &&
    !menu.open &&
    (phase === "aim" || phase === "over") &&
    (lastShot?.points?.length ?? 0) > 1;
  if (canReplay !== replayReady) {
    replayReady = canReplay;
    $("#replay").disabled = !canReplay;
  }
  updateAimHUD();
  updateRopeVisual(worms[current]);
  const aimBox =
    phase === "aim" && !menu.open && worms[current]?.hp > 0 && lastAim?.reticle
      ? {
          x: lastAim.reticle.x,
          y: lastAim.reticle.y + 10,
          width: 54,
          height: 78,
        }
      : null;
  const labelBoxes = aimBox ? [aimBox] : [];
  // Read every label size before writing positions, so six labels cost one layout pass, not six.
  for (const w of worms) {
    w.labelW = w.label.offsetWidth;
    w.labelH = w.label.offsetHeight;
  }
  for (const w of worms) {
    const size = w.visualSize || 64;
    const active = w === worms[current];

    // The terrain mask is integer-based; glide the sprite over its 1px steps.
    const targetY = w.y;
    if (!Number.isFinite(w.renderY)) w.renderY = targetY;
    const gap = targetY - w.renderY;
    if (Math.abs(gap) > 32) w.renderY = targetY;
    else w.renderY += gap * Math.min(0.55, frameDt * 26);
    w.g.position.set(w.x, w.renderY, 15);
    if (w.knocked && Math.hypot(w.vx, w.vy) > 150 && now - w.dustAt > 50) {
      w.dustAt = now;
      spawnDust(w.x, w.renderY + 12);
    }

    const facing = w.facing * (w.team ? -1 : 1);
    const moving = active && w.moving && w.ground;
    const bounce =
      menu.open || reducedMotion
        ? 0
        : Math.sin(now * (moving ? 0.019 : 0.003) + w.x) * (moving ? 3 : 1.2);
    w.body.scale.set(
      size * facing * (1 + bounce * 0.008),
      size * (1 - bounce * 0.006),
      1,
    );
    w.body.position.y = size / 2 - 12 + bounce;
    w.body.rotation.z = moving
      ? Math.sin(now * 0.02) * 0.065
      : Math.max(-0.15, Math.min(0.15, -w.vx * 0.001));
    const hurt = w.hurt / 1.4,
      flinch = reducedMotion ? 0 : Math.sin(hurt * Math.PI * 5) * hurt;
    w.body.scale.x *= 1 + Math.abs(flinch) * 0.14;
    w.body.scale.y *= 1 - Math.abs(flinch) * 0.16;
    w.body.rotation.z += flinch * 0.32 * w.hitDirection;
    w.body.material.map =
      w.hurt > 0.35 ? hurtMaps[w.team] : soldierMaps[w.team];
    w.body.material.color.setHex(
      w.hurt > 0.75 && Math.floor(w.hurt * 14) % 2 ? 0xff806c : 0xffffff,
    );
    w.body.material.opacity =
      w.hp > 0 || (w.deathPending && !w.dying) ? 1 : Math.min(1, w.dying * 1.4);
    if (w.hp <= 0 && w.dying > 0) {
      w.body.rotation.z += (1 - w.dying) * w.hitDirection * 1.7;
      w.body.position.y -= 20 * (1 - w.dying);
    }
    const a = active ? angle : w.facing < 0 ? 155 : 25,
      geometry = shot(w, a);
    const correction = w.g.scale.x;
    w.rig.pivot.position.set(
      (geometry.pivot.x - w.x) / correction,
      geometry.pivot.y - w.renderY,
      10,
    );
    w.rig.pivot.rotation.z = geometry.visualAngle;
    w.rig.pivot.scale.set(
      geometry.rigScale,
      (Math.cos((a * Math.PI) / 180) < 0 ? -1 : 1) * geometry.rigScale,
      1,
    );
    w.rig.pivot.visible = w.hp > 0 && w.hurt < 0.75;
    w.rig.barrel.visible = !active || ["rocket", "mortar"].includes(weapon);
    w.rig.grenade.visible = active && ["grenade", "sticky"].includes(weapon);
    w.rig.grenade.children[0].material.color.setHex(
      weapon === "sticky" ? 0xe96e57 : 0x9caf59,
    );
    w.rig.barrel.scale.y = active && weapon === "mortar" ? 1.4 : 1;
    w.rig.barrel.position.x = -Math.sin((w.recoil / 0.3) * Math.PI) * 7;
    w.rig.flash.visible = w.recoil > 0.19 && weapon === "rocket";
    w.rig.flash.scale.setScalar(0.8 + Math.sin(now * 0.09) * 0.2);
    w.stars.visible = w.hp > 0 && w.hurt > 0;
    w.stars.position.set(0, size + 30, 20);
    w.stars.children.forEach((star, i) => {
      const a = now * 0.007 + (i * Math.PI * 2) / 3;
      star.position.set(Math.cos(a) * 17, Math.sin(a) * 5, 0);
      star.rotation.z = a;
    });
    w.label.classList.toggle("hurt", w.hurt > 0);
    w.shadow.visible = w.ground && w.hp > 0;
    const p = screen(w.x, w.renderY + size - 7);
    if (w.hp > 0) {
      const width = w.labelW,
        height = w.labelH;
      p.x = Math.max(
        width / 2 + 4,
        Math.min(arena.clientWidth - width / 2 - 4, p.x),
      );
      // Labels are positioned by their bottom edge, so compare centers and half-heights.
      const topSafe = coarsePointer ? 46 : 54;
      const anchorY = p.y;
      if (p.y - height < topSafe) p.y = topSafe + height;
      let guard = 0;
      while (
        guard++ < 16 &&
        labelBoxes.some(
          (b) =>
            Math.abs(b.x - p.x) < (b.width + width) / 2 + 5 &&
            Math.abs(b.y - (p.y - height / 2)) < (b.height + height) / 2 + 5,
        )
      ) {
        // Fan labels downward from the HUD strip; only climb if the floor is near.
        const down = p.y + height + 6;
        if (down + height <= arena.clientHeight - 34) p.y = down;
        else p.y = Math.max(topSafe + height, p.y - height - 6);
      }
      if (p.y - height < topSafe) p.y = topSafe + height;
      labelBoxes.push({ x: p.x, y: p.y - height / 2, width, height });
    }
    w.label.style.left = p.x + "px";
    w.label.style.top = p.y + "px";
  }
  if (crate) {
    crate.mesh.position.y = crate.y + Math.sin(now * 0.003 + crate.bob) * 2;
    if (crate.mesh.userData.beacon)
      crate.mesh.userData.beacon.rotation.y = now * 0.002;
  }
  for (const mine of mines) {
    mine.mesh.rotation.z = Math.sin(now * 0.002 + mine.bob) * 0.08;
    if (mine.mesh.userData.light)
      mine.mesh.userData.light.visible =
        mine.arm > 0 ? Math.floor(now / 160) % 2 === 0 : true;
  }
  if (phase === "break") {
    $("#status").textContent =
      `Round over. Next island in ${Math.ceil(breakTimer)}…`;
  }
  $("#turn-banner").classList.toggle("shown", bannerTime > 0 && !menu.open);
  const timerHtml = `${retreat > 0 ? Math.ceil(retreat) : Math.max(0, Math.ceil(time))}<small> ${retreat > 0 ? "RETREAT" : "SEC"}</small>`;
  if (timerHtml !== timerKey) {
    timerKey = timerHtml;
    $("#timer").innerHTML = timerHtml;
  }
  if (now > announceUntil && $("#announcement").style.opacity !== "0")
    $("#announcement").style.opacity = 0;
  water.userData.update(reducedMotion ? 0 : now * 0.001);
  motes.forEach((m, i) => {
    m.position.x = (i * 127 + now * 0.007) % W;
    m.position.y = 150 + ((i * 73) % 450) + Math.sin(now * 0.0007 + i) * 12;
  });
  const shake = reducedMotion ? 0 : Math.max(0, shakeUntil - now) / 350;
  camera.position.x = shake * Math.sin(now * 0.09) * 5;
  camera.position.y = shake * Math.cos(now * 0.07) * 4;
  if (terrainDirty) {
    terrainDirty = false;
    paintTerrain(ctx, terrain, texture);
  }
  renderer.render(scene, camera);
}
function setWeapon(kind) {
  if (ammoFor(ammo[team], kind) <= 0) kind = "rocket";
  specialOpen = false;
  weapon = kind;
  teamWeapon[team] = kind;
  $("#grenade-settings").hidden = !["grenade", "sticky"].includes(kind);
  document
    .querySelectorAll("[data-weapon]")
    .forEach((b) => b.classList.toggle("selected", b.dataset.weapon === kind));
  updateSliders();
  updateUI();
}
$("#angle").addEventListener("input", (e) => {
  if (!canAct() || charging) return;
  angle = +e.target.value;
  worms[current].facing = Math.cos((angle * Math.PI) / 180) < 0 ? -1 : 1;
  updateSliders();
});
$("#fire").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  startCharge("pointer");
  if (charging) e.currentTarget.setPointerCapture(e.pointerId);
});
$("#fire").addEventListener("pointerup", (e) => {
  e.preventDefault();
  releaseCharge("pointer");
});
for (const event of ["pointercancel", "lostpointercapture"])
  $("#fire").addEventListener(event, () => {
    if (chargeSource === "pointer") {
      cancelCharge();
      updateSliders();
      updateUI();
    }
  });
$("#fire").addEventListener("contextmenu", (e) => e.preventDefault());
$("#replay").onclick = startReplay;
$("#share").onclick = shareResultCard;
$("#select-worm").onclick = () => cycleWorm(1);
$("#skip").onclick = skipTurn;
$("#surrender").onclick = surrenderMatch;
$("#utilities-toggle").onclick = toggleUtilities;
$("#special-toggle").onclick = () => {
  if (!canAct()) return;
  specialOpen = !specialOpen;
  if (specialOpen) utilitiesOpen = false;
  updateUI();
};
for (const button of document.querySelectorAll("[data-utility]"))
  button.onclick = () => useUtility(button.dataset.utility);
$("#jump").onclick = () => jump("forward");
$("#backflip").onclick = () => jump("backflip");
$("#fuse").onchange = (e) => {
  if (canAct() && !charging) fuse = +e.target.value;
};
$("#bounce").onchange = (e) => {
  if (canAct() && !charging) bounce = +e.target.value;
};
document.querySelectorAll("[data-weapon]").forEach(
  (b) =>
    (b.onclick = () => {
      if (canAct() && !charging) setWeapon(b.dataset.weapon);
    }),
);
document.querySelectorAll("[data-move]").forEach((b) => {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    setMove(+b.dataset.move);
    b.setPointerCapture(e.pointerId);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, () => (move = 0));
});
let aiming = false;
function pointerAim(e) {
  if (!canAct() || charging || targetUtility || rope.attached || jetpack.active)
    return;
  const rect = arena.getBoundingClientRect(),
    x = ((e.clientX - rect.left) / rect.width) * W,
    y = H - ((e.clientY - rect.top) / rect.height) * H,
    w = worms[current];
  let a =
    (Math.atan2(y - shot(w).pivot.y, x - shot(w).pivot.x) * 180) / Math.PI;
  if (a < -90) a += 360;
  angle = Math.max(-85, Math.min(265, a));
  w.facing = Math.cos((angle * Math.PI) / 180) < 0 ? -1 : 1;
  updateSliders();
}
arena.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button, a, input, select")) return;
  if (targetUtility) {
    handleUtilityTarget(e);
    return;
  }
  aiming = true;
  arena.setPointerCapture(e.pointerId);
  pointerAim(e);
});
arena.addEventListener("pointermove", (e) => {
  if (aiming) pointerAim(e);
});
for (const event of ["pointerup", "pointercancel"])
  arena.addEventListener(event, () => (aiming = false));
window.addEventListener("keydown", (e) => {
  if (menu.open) return;
  const controlled = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    " ",
    "Enter",
    "Backspace",
    "Tab",
    "r",
    "j",
    "p",
    "t",
    "g",
    "f",
    "F1",
    "F2",
    "F3",
    "F4",
    "w",
    "s",
    "W",
    "S",
  ];
  if (controlled.includes(e.key)) e.preventDefault();
  if (e.key === "Tab") {
    cycleWorm(e.shiftKey ? -1 : 1);
    return;
  }
  if (e.key.toLowerCase() === "r") {
    useUtility("rope");
    return;
  }
  if (e.key.toLowerCase() === "j") {
    useUtility("jetpack");
    return;
  }
  if (e.key.toLowerCase() === "p") {
    useUtility("parachute");
    return;
  }
  if (e.key.toLowerCase() === "t") {
    useUtility("teleport");
    return;
  }
  if (e.key.toLowerCase() === "g") {
    useUtility("girder");
    return;
  }
  if (e.key.toLowerCase() === "f") {
    useUtility("freeze");
    return;
  }
  if (e.key === " ") {
    if (!e.repeat) startCharge("keyboard");
    return;
  }
  if (e.key === "ArrowLeft" || e.key === "a") setMove(-1);
  if (e.key === "ArrowRight" || e.key === "d") setMove(1);
  if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") aimInput = 1;
  if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") aimInput = -1;
  if (e.key === "Enter" && !e.repeat) jump("forward");
  if (e.key === "Backspace" && !e.repeat) jump("up");
  if (canAct() && !charging) {
    if (e.key === "F1") setWeapon("rocket");
    if (e.key === "F2") setWeapon("grenade");
    if (e.key === "F3") setWeapon("mortar");
    if (e.key === "F4") setWeapon("sticky");
    if (e.key.toLowerCase() === "m") setWeapon("mine");
    if (["grenade", "sticky"].includes(weapon) && /^[1-5]$/.test(e.key)) {
      fuse = +e.key;
      $("#fuse").value = fuse;
    }
    if (
      ["grenade", "sticky"].includes(weapon) &&
      ["+", "=", "-"].includes(e.key)
    ) {
      bounce = e.key === "-" ? 0.3 : 0.7;
      $("#bounce").value = bounce;
    }
  }
});
window.addEventListener("keyup", (e) => {
  if (e.key === " ") {
    e.preventDefault();
    releaseCharge("keyboard");
  }
  if (["ArrowLeft", "ArrowRight", "a", "d"].includes(e.key)) move = 0;
  if (["ArrowUp", "ArrowDown", "w", "s", "W", "S"].includes(e.key))
    aimInput = 0;
});
function releaseInputs() {
  move = 0;
  aimInput = 0;
  cancelCharge();
  updateSliders();
  updateUI();
}
window.addEventListener("blur", releaseInputs);
document.addEventListener("visibilitychange", () => {
  releaseInputs();
  last = performance.now();
});
$("#help").onclick = () => {
  releaseInputs();
  $(".instructions").open = true;
  updateRecordUI();
  menu.showModal();
  resetMenuScroll();
  updateUI();
};
$("#restart").onclick = () => {
  releaseInputs();
  $(".instructions").open = false;
  updateRecordUI();
  menu.showModal();
  resetMenuScroll();
  updateUI();
};
$("#daily").addEventListener("click", () => {
  const { key, seed } = dailySeed();
  daily = { date: key, seed };
  $("#mode").value = "ai";
  $("#format").value = "single";
  $("#weather").value = "clear";
  $("#modifier").value = "standard";
  $("#scheme").value = "classic";
  syncMenuOptions();
  saveSettings();
  matchStarted = true;
  reset({ seed, isDaily: true });
  menu.close();
});
$("#sound").onclick = () => {
  sound = !sound;
  updateSoundButton();
  saveSettings();
  tone(440);
};
$("#start").onclick = () => {
  matchStarted = true;
  reset();
};
menu.addEventListener("close", () => {
  matchStarted = true;
  if (phase === "menu") reset();
  updateUI();
});
if (coarsePointer) $("#fire small").textContent = "HOLD · RELEASE TO FIRE";
const difficultyRow = $("#difficulty-row");
function syncMenuOptions() {
  difficultyRow.hidden = $("#mode").value !== "ai";
}
$("#mode").addEventListener("change", () => {
  syncMenuOptions();
  saveSettings();
});
function markSchemeCustom() {
  const select = $("#scheme");
  if (select && select.value !== "custom") select.value = "custom";
}
for (const selector of [
  "#difficulty",
  "#format",
  "#weather",
  "#modifier",
  "#turn-time",
  "#retreat-time",
  "#sudden-death",
]) {
  $(selector).addEventListener("change", () => {
    markSchemeCustom();
    saveSettings();
  });
}
$("#scheme").addEventListener("change", (e) => {
  const preset = SCHEMES[e.target.value];
  if (!preset) {
    saveSettings();
    return;
  }
  $("#format").value = preset.format;
  $("#weather").value = preset.weather;
  $("#modifier").value = preset.modifier;
  $("#turn-time").value = String(preset.turnTime);
  $("#retreat-time").value = String(preset.retreatTime);
  $("#sudden-death").value = preset.suddenDeath;
  syncMenuOptions();
  saveSettings();
});
applySettings();
syncMenuOptions();
updateRecordUI();
reset();
menu.showModal();
resetMenuScroll();
updateUI();
resize();
prewarmShaders();
requestAnimationFrame(frame);
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const registerServiceWorker = () =>
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {});
  if (document.readyState === "complete") registerServiceWorker();
  else window.addEventListener("load", registerServiceWorker);
}
// Read-only diagnostics for regression checks and reproducible bug reports.
window.siege = {
  getState: () => ({
    assetsReady,
    aim: lastAim,
    phase,
    charging,
    power,
    firedPower,
    shotCount,
    retreat,
    fuse,
    bounce,
    current,
    team,
    round,
    wind,
    explosions,
    weapon,
    teamWeapon: [...teamWeapon],
    difficulty,
    mode,
    format,
    weather,
    modifier,
    gravityScale,
    blastScale,
    turnSeconds,
    turnTime,
    retreatSeconds,
    scheme,
    stockpile,
    crateRain,
    wormLocked,
    suddenDeathType,
    sdTriggered,
    poisoned,
    seriesWins: [...seriesWins],
    seriesRound,
    breakTimer: Math.round(breakTimer * 10) / 10,
    slowMo: Math.round(slowMo * 10) / 10,
    camera: {
      x: Math.round(view.x),
      y: Math.round(view.y),
      zoom: Math.round(view.zoom * 100) / 100,
    },
    crate: crate ? { x: crate.x, y: crate.y, kind: crate.kind } : null,
    girders: girders.map((g) => ({
      x: Math.round(g.cx),
      y: Math.round(g.cy),
      angle: g.angle,
    })),
    projectile: projectile
      ? {
          kind: projectile.kind,
          x: Math.round(projectile.x),
          y: Math.round(projectile.y),
          vx: Math.round(projectile.vx),
          vy: Math.round(projectile.vy),
          age: Math.round(projectile.age * 10) / 10,
        }
      : null,
    bombs: bombs.map((b) => ({
      x: Math.round(b.x),
      y: Math.round(b.y),
      kind: b.kind,
      fuse: Math.round(b.fuse * 10) / 10,
    })),
    fires: fires.map((f) => ({
      x: Math.round(f.x),
      y: Math.round(f.y),
      life: Math.round(f.life * 10) / 10,
    })),
    hazards: hazards.map((h) => ({ x: Math.round(h.x), y: Math.round(h.y) })),
    mines: mines.map((m) => ({
      x: Math.round(m.x),
      y: Math.round(m.y),
      arm: Math.round(m.arm * 10) / 10,
      team: m.team,
    })),
    daily: daily ? { date: daily.date, seed: daily.seed } : null,
    record: { ...record, daily: { ...record.daily } },
    ammo: ammo.map((loadout) => ({ ...loadout })),
    utilities: { ...utilityAmmo[team] },
    activeUtility,
    targetUtility,
    rope: {
      attached: rope.attached,
      length: Math.round(rope.length),
      anchor: rope.anchor,
    },
    jetpack: {
      active: jetpack.active,
      fuel: Math.round(jetpack.fuel * 10) / 10,
    },
    parachuteArmed,
    frozen: worms.map((w) => w.frozen ?? 0),
    waterLevel,
    suddenDeath,
    hitStop,
    lastAiPlanMs: Math.round(lastAiPlanMs * 10) / 10,
    aiRetreatTime: Math.round(aiRetreatTime * 10) / 10,
    activeWorm: worms[current]?.name ?? null,
    replaying,
    lastShot: lastShot
      ? { points: lastShot.points.length, impact: lastShot.impact }
      : null,
    lastResult,
    aiPlan: aiPlan
      ? {
          weapon: aiPlan.weapon,
          angle: Math.round(aiPlan.angle),
          power: Math.round(aiPlan.power),
          score: Math.round(aiPlan.score),
          samples: aiPlan.samples,
        }
      : null,
    terrainPixels: terrain.data.reduce((a, b) => a + b, 0),
    worms: worms.map(
      ({
        name,
        hp,
        x,
        y,
        vx,
        vy,
        ground,
        knocked,
        hurt,
        hits,
        recoil,
        rig,
        renderY,
        moving,
        deathPending,
      }) => ({
        name,
        hp,
        x,
        y,
        vx,
        vy,
        ground,
        knocked,
        deathPending,
        hurt,
        hits,
        recoil,
        renderY,
        moving,
        weaponRotation: rig.pivot.rotation.z,
        pose: hurt > 0.35 ? "hurt" : recoil > 0 ? "fire" : "idle",
      }),
    ),
    projectile: projectile
      ? {
          x: projectile.x,
          y: projectile.y,
          vx: projectile.vx,
          vy: projectile.vy,
          age: projectile.age,
          fuse: projectile.fuse,
          kind: projectile.kind,
          stuck: projectile.stuck,
        }
      : null,
  }),
};
// Dev-only hooks let the layout/series tests finish rounds without a long match.
if (import.meta.env.DEV) {
  window.siege.debug = {
    knockout(teamIndex = 1) {
      for (const w of worms) {
        if (w.team !== teamIndex) continue;
        w.hp = 0;
        w.deathPending = false;
        w.dying = 0;
      }
      updateUI();
      endGame();
    },
    skipBreak() {
      if (phase === "break") breakTimer = 0;
    },
    collectCrate() {
      if (crate) collectCrate(worms[current]);
    },
    hit(teamIndex = 1, damage = 200) {
      for (const w of worms) if (w.team === teamIndex) injure(w, damage, 1);
    },
    triggerSuddenDeath() {
      return applySuddenDeath();
    },
    explodeAt(x = 600, y = 350, kind = "cluster") {
      explode(x, y, kind, 0);
    },
    setAmmo(teamIndex = 0, kind = "grenade", value = 5) {
      ammo[teamIndex][kind] = value;
      updateUI();
    },
    setCrateKind(kind = "special") {
      if (crate) crate.kind = kind;
    },
  };
}
