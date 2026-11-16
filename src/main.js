import { nativeDragonBallBody, nativeDragonBallHit, nativeDragonBallEvent } from "./armageddon/dragon-ball.js";
import { attachNativeFirePunchFlight, stepNativeFirePunchFlight } from "./armageddon/worm-flight.js";
import { startOriginalFirePunch, updateOriginalFirePunch } from "./armageddon/art.js";
import { carveNativeToolMask } from "./armageddon/terrain-cut-mask.js";
import firePunchCut from "./armageddon/fire-punch-cut.json";
import { bodyBlocked } from "./physics.js";
import { startOriginalAxe, stepOriginalAxe } from "./armageddon/art.js";
import { nativeBatRequest } from "./armageddon/bat.js";
import { nativeProdRequest } from "./armageddon/prod.js";
import { nativeProjectileDepth } from "./armageddon/projectile-lifetime.js";
import { nativeMineBase, nativeMineBody, NATIVE_MINE_FRICTION } from "./armageddon/mine-body.js";
import { nativeMineBlast } from "./armageddon/mine-blast.js";
import { nativeMineContact } from "./armageddon/mine-contact.js";
import { nativeMineArt } from "./armageddon/mine-art.js";
import { nativeMineWater } from "./armageddon/mine-water.js";
import { nativeMineStateEvents } from "./armageddon/mine-state.js";
import { nativeMineHit, nativeMineHitBodies } from "./armageddon/mine-hit.js";
import { nativeMineCameraRequest } from "./armageddon/mine-camera.js";
import { nativeMineRegistration } from "./armageddon/mine-registration.js";
import { NativeRenderOrder } from "./armageddon/render-order.js";
import { nativeWaterSound } from "./armageddon/water-audio.js";
import { nativeSimpleBodyTick, nativeSimpleBounce, nativeBodyAwake } from "./armageddon/motion.js";
import { nativeWormReceiver } from "./armageddon/worm-receiver.js";
import { NativeMineDudPool, nativeMineExpiry } from "./armageddon/mine-expiry.js";
import { nativeMineTimer, nativeMineInitialTimer, NATIVE_MINE_MASK, NATIVE_MINE_DAMAGE } from "./armageddon/mine-timer.js";
import { playNativeMineSound } from "./armageddon/audio.js";
import { nativeMineProximity } from "./armageddon/mine-proximity.js";
import { NativeCameraFraming } from "./armageddon/camera-framing.js";
import { NativeCameraPriority, nativeProjectileCameraRequest, nativeWormCameraRequest } from "./armageddon/camera-priority.js";
import { playNativeProjectileContactSound, playNativeProjectileReleaseSound, playNativeProjectileFuse } from "./armageddon/audio.js";
import {
  stepNativeHurtFlight,
  nativeWormContactBody,
  applyNativeWormContact,
} from "./armageddon/hurt-flight.js";
import { nativeSceneCollision } from "./armageddon/collision-scene.js";
import { nativeDirectHitResponse } from "./armageddon/direct-hit-response.js";
import { nativeBloodBurst, nativeBloodAmount } from "./armageddon/blood.js";
import { nativeBlastResponse } from "./armageddon/blast-response.js";
import { nativeDamageAccounting } from "./armageddon/damage-accounting.js";
import { nativeBlastDamage } from "./armageddon/blast-damage.js";
import {
  nativeDebrisBurst,
  nativeDebrisBody,
  nativeDebrisTick,
} from "./armageddon/debris.js";
import { carveNativeCrater } from "./armageddon/crater-mask.js";
import { nativeAreaDamage } from "./armageddon/area-damage.js";
import { applyNativeWeaponImpulse } from "./armageddon/worm-flight.js";
import { nativeHitscanResolution } from "./armageddon/hitscan-resolution.js";
import { nativeHitscanTerrain } from "./armageddon/hitscan-terrain.js";
import { nativeHitscanBody, nativeWormHitscanBodies } from "./armageddon/hitscan-body.js";
import { nativeHitscanRays } from "./armageddon/hitscan-spread.js";
import { nativeBurstTick, nativeRecoilTick, nativePostFire } from "./armageddon/recoil.js";
import { nativeLaunchAudio } from "./armageddon/launch-audio.js";
import { nativeCasing } from "./armageddon/casing.js";
import {
  nativeHitscanWeapon,
  nativeBulletLaunch,
} from "./armageddon/hitscan-art.js";
import {
  createImpactBag,
  nativeExplosionArt,
} from "./armageddon/explosion-art.js";
import {
  nativeDeathSmoke,
  nativeSmokeBody,
  nativeSmokeTick,
} from "./armageddon/smoke.js";
import { nextVisualRandom } from "./armageddon/numeric.js";
import { createOriginalGrave, stepOriginalGrave } from "./armageddon/graves.js";
import { updateOriginalTarget } from "./armageddon/target-hud.js";
import { nativeSightGeometry } from "./armageddon/sight-geometry.js";
import { stepOriginalSight } from "./armageddon/sight.js";
import { updateOriginalCharge } from "./armageddon/charge-hud.js";
import { updateOriginalCrosshair } from "./armageddon/crosshair-hud.js";
import { updateOriginalSelection } from "./armageddon/selection-hud.js";
import {
  loadOriginalNumbers,
  updateOriginalTimer,
} from "./armageddon/number-hud.js";
import {
  loadOriginalWindHUD,
  updateOriginalWindHUD,
} from "./armageddon/wind-hud.js";
import {
  loadOriginalGirders,
  stampOriginalGirder,
} from "./armageddon/girders.js";
import { originalMapSpawns } from "./armageddon/map-placement.js";
import {
  originalMapCatalog,
  loadOriginalMap,
  createOriginalMap,
} from "./armageddon/maps.js";
import {
  loadOriginalHUDIcons,
  originalHUDIcon,
  HUD_ICONS,
  updateOriginalHUDIcons,
} from "./armageddon/hud-icons.js";
import {
  addNativeParticle,
  nativeParticleRequest,
  stepNativeParticles,
} from "./armageddon/particles.js";
import nativeSpriteIds from "./armageddon/sprite-ids.json";
import { nativeBubble, nativeBubbleTick } from "./armageddon/bubble.js";
import { nativeSpriteFrame } from "./armageddon/animation.js";
import {
  loadOriginalDecorations,
  placeOriginalDecorations,
} from "./armageddon/terrain-decoration.js";
import {
  nativeProjectileLaunchGeometry,
  createNativeAirstrike,
  stepNativeAirstrike,
  nativeProjectileCollision,
  attachNativeProjectile,
  stepNativeProjectile,
  nativeProjectileDetonationEvents,
  nativeProjectileChildren,
  nativeProjectilePlacementHit,
} from "./armageddon/projectile-runtime.js";
import { nativeWormState, nativeWormCollisionType } from "./armageddon/worm-collision-type.js";
import { nativeChargeTick } from "./armageddon/power.js";
import { freezeTeam } from "./armageddon/freeze.js";
import {
  WEAPON_SLOTS,
  advanceNativeDelays,
  createWeaponDelays,
  weaponDelay,
} from "./armageddon/delays.js";
import { MatchRandom } from "./armageddon/random.js";
import { addAmmo, spendAmmo, displayAmmo } from "./armageddon/inventory.js";
import {
  loadOriginalArt,
  originalVisual,
  createOriginalVisual,
  createNativeProjectileVisual,
  createOriginalObject,
  updateOriginalObject,
  updateOriginalProjectile,
  projectileSprites,
  originalWormFrame,
  startOriginalRecoil,
  startOriginalPreparation,
  stepOriginalPreparation,
  startOriginalLanding,
  stepOriginalLanding,
  startOriginalJump,
  stepOriginalJump,
  startOriginalParachute,
  startOriginalTeleport,
  stepOriginalJetpack,
  stepOriginalWalking,
  startOriginalDeath,
  startOriginalHurt,
  startOriginalRecovery,
  stepOriginalRecovery,
  stepOriginalDeath,
  stopOriginalJetpack,
  stepOriginalTeleport,
  setOriginalRope,
  stepOriginalParachute,
  startOriginalDrowning,
  stepOriginalDrowning,
} from "./armageddon/art.js";
import {
  playOriginalSound,
  playNativeSpeech,
  playNativeHitVoice,
  playNativeRecoverySound,
  playNativeWaterSound,
  playNativeLandingSound,
  playNativeDeathVoice,
} from "./armageddon/audio.js";
import { LOGIC_STEP_SECONDS } from "./armageddon/clock.js";
import { playSound } from "./sound.js";
import { fragments } from "./weapon-behavior.js";
import { pixelBrush } from "./pixel-draw.js";
import { mountPixelHUD, updateHudPower, updateHudTeams } from "./pixel-hud.js";
import { loadOriginalWormLabels, updateOriginalWormLabel } from "./armageddon/worm-label.js";
import { pixelViewport } from "./pixel-art.js";
import { createWater, loadOriginalWater } from "./water.js";
import * as THREE from "three";
import "./style.css";
import "./pixel-hud.css";
import {
  Terrain,
  setWorldDimensions,
  clearBodyPath,
  blastExposure,
  W,
  H,
  WATER,
  launch,
  integrate,
  sweepProjectile,
  shotGeometry,
  hitsWorm,
  blastImpulse,
  walkWorm,
  stepWorm,
  terrainNormal,
  reflectVelocity,
  launchGeometry,
  GRAVITY,
} from "./physics.js";
import {
  createAimOverlay,
} from "./combat-visuals.js";
import {
  loadOriginalTerrain,
  paintOriginalBackdrop,
  createTerrainDebris,
  updateTerrainDebris,
} from "./armageddon/terrain.js";
import { paintTerrain } from "./terrain-paint.js";
import {
  WEAPONS,
  WEAPON_ORDER,
  SPECIAL_WEAPONS,
  freshAmmo,
  ammoFor,
  waterLevelForRound,
} from "./weapons.js";
import { planTurn, planMove, planRetreat } from "./ai.js";
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
const matchRandom = new MatchRandom(0);
let mineDudPool = new NativeMineDudPool();
let nativeRenderOrder = new NativeRenderOrder();
const nativeCamera = new NativeCameraPriority();
let nativeCameraFocus = null;
let nativeCameraFraming = null;
let pendingWormCamera = [];
const logicRandom = () => matchRandom.logic();
const visualRandom = () => matchRandom.visual();
const $ = (s) => document.querySelector(s);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = matchMedia("(pointer: coarse)").matches;
const arena = $("#arena"),
  menu = $("#menu");
// Fit the reference composition in the available space on every device.
const battlefieldFrame = document.createElement("div");
battlefieldFrame.id = "battlefield-frame";
arena.before(battlefieldFrame);
battlefieldFrame.appendChild(arena);
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
renderer.setPixelRatio(1);
mountPixelHUD(arena);
$("#scene").appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#153b3d");
const camera = new THREE.OrthographicCamera(0, W, H, 0, 0.1, 2000);
camera.position.z = 1000;
const view = { ...FULL_VIEW };
const targetMarker = document.createElement("canvas");
targetMarker.width = targetMarker.height = 60;
targetMarker.setAttribute("aria-label", "Homing target");
targetMarker.style.cssText =
  "position:absolute;width:60px;height:60px;image-rendering:pixelated;pointer-events:none;z-index:8";
arena.appendChild(targetMarker);
let overview = false;
window.addEventListener("siege-overview", (event) => {
  overview = event.detail;
  resize();
  cameraSnap = true;
});
let cameraZoom = 1,
  cameraX = W / 2,
  cameraY = H / 2,
  cameraSnap = true;
function applyView() {
  const px = view.w / (renderer.domElement.width || 1);
  const py = view.h / (renderer.domElement.height || 1);
  view.x = Math.round(view.x / px) * px;
  view.y = Math.round(view.y / py) * py;
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
ctx.imageSmoothingEnabled = false;
const texture = new THREE.CanvasTexture(canvas);
texture.colorSpace = THREE.SRGBColorSpace;
texture.minFilter = texture.magFilter = THREE.NearestFilter;
texture.generateMipmaps = false;
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
let configuredDelays = {};
let weaponDelays = [createWeaponDelays(), createWeaponDelays()];
const availableAmmo = (loadout, kind) =>
  ammoFor(loadout, kind, weaponDelays[team]);
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
  graves = [],
  bombs = [],
  airstrikes = [],
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
  homingTarget = null,
  shotgunRemaining = 0,
  pendingFire = null,
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
  aiRetreatDirection = 0,
  lastAiPlanMs = 0,
  aiPlan = null,
  hitStop = 0;
let charging = false,
  chargeFixed = 0,
  chargeSource = null,
  aimInput = 0,
  retreat = 0,
  fuse = 3,
  bounce = 0.55,
  firedPower = 0,
  shotCount = 0,
  lastJump = { kind: null, time: -1 },
  jumpClock = 0;
let selectionTick = 0;
let uiKey = "",
  terrainDirty = false,
  timerKey = "";
let lastShot = null,
  replaying = false,
  replayClock = 0,
  replayDuration = 1,
  replayReady = false,
  lastResult = null;
let assetsReady = false;
let originalArtError = null;
const originalAssets = Promise.all([
  loadOriginalArt(),
  loadOriginalTerrain(),
  loadOriginalWater(),
  loadOriginalHUDIcons(),
  loadOriginalWindHUD(),
  loadOriginalNumbers(),
  loadOriginalWormLabels(),
  loadOriginalGirders(),
])
  .then(() =>
    Promise.all([
      loadOriginalDecorations($("#terrain-theme").value),
      loadOriginalDecorations("forest"),
    ]),
  )
  .then(() => {
    updateOriginalHUDIcons();
    mountCurrentMenuArt();
    updateOriginalWindHUD(wind);
    timerKey = "";
    terrainDirty = true;
  })
  .catch((error) => {
    originalArtError = error.message;
    console.error("Original sprite loading failed", error);
    throw error;
  });
function mountCurrentMenuArt() {
  for (const canvas of document.querySelectorAll("canvas[data-art]")) {
    const name = canvas.dataset.art === "soldier" ? "wblink1" : projectileSprites[canvas.dataset.art] ?? "mineoff";
    const visual = originalVisual(name);
    if (!visual) throw new Error(`Missing current menu art: ${name}`);
    const source = canvas.dataset.art === "soldier" ? visual.map.image : originalHUDIcon(HUD_ICONS[canvas.dataset.art] ?? "grenade");
    canvas.width = source.width; canvas.height = source.height;
    canvas.dataset.originalSprite = name;
    canvas.getContext("2d").drawImage(source,0,0);
  }
}
const backdropMap = new THREE.CanvasTexture(document.createElement("canvas"));
backdropMap.colorSpace = THREE.SRGBColorSpace;
backdropMap.minFilter = backdropMap.magFilter = THREE.NearestFilter;
backdropMap.generateMipmaps = false;
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(W, H),
  new THREE.MeshBasicMaterial({ map: backdropMap }),
);
backdrop.position.set(W / 2, H / 2, -180);
group.add(backdrop);
function updateOriginalBackdrop() {
  if (!terrain || backdrop.userData.originalTheme === terrain.theme) return;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  if (!paintOriginalBackdrop(canvas.getContext("2d"), terrain.theme, WATER))
    return;
  backdropMap.dispose();
  backdropMap.image = canvas;
  backdropMap.needsUpdate = true;
  backdrop.userData.originalTheme = terrain.theme;
}
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
let water = createWater(W, WATER);
group.add(water);
// Debris and projectiles share GPU resources; only one prototype per kind is built.
const debrisGeometry = new THREE.PlaneGeometry(2, 2);
const debrisMaterials = [
  new THREE.MeshBasicMaterial({ color: 0xc4a578 }),
  new THREE.MeshBasicMaterial({ color: 0xffce70 }),
];
const debrisPrototype = new THREE.Mesh(debrisGeometry, debrisMaterials[0]);
debrisPrototype.visible = false;
debrisPrototype.frustumCulled = false;
group.add(debrisPrototype);
function projectileMesh(kind) {
  const mesh = createOriginalVisual(projectileSprites[kind]);
  if (!mesh) throw new Error(`Missing current projectile art: ${kind}`);
  return mesh;
}
function releaseProjectileMesh(mesh) { if (mesh) group.remove(mesh); }
function prewarmShaders() { renderer.compile(scene, camera); }
function createWorm(t, i, x, spawnY = null) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.03,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  body.position.set(0, 22, 24);
  body.scale.set(64, 64, 1);
  g.add(body);
  const rig = { pivot: new THREE.Group() };
  rig.pivot.visible = false;
  g.add(rig.pivot);
  const stars = new THREE.Group();
  stars.visible = false;
  g.add(stars);
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
  label.style.setProperty("--worm-color", t ? "#ef9d89" : "#b7c86a");
  label.style.color = t ? "#a94a3d" : "#4d6b3a";
  label.innerHTML = `<span class="worm-label-name">${names[t][i]}</span><strong>100</strong>`;
  $("#labels").appendChild(label);
  group.add(g);
  const y =
    spawnY ??
    Math.max(...[-4, -2, 0, 2, 4].map((dx) => terrain.surface(x + dx))) + 8;
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
    updateOriginalCrosshair(
      aimHUD.crosshair,
      worms[current].team,
      angle,
      worms[current].originalSight,
    );
    const geometry = shot(worms[current]);
    const worm = worms[current];
    const sight = worm.originalSight;
    const nativeGeometry = nativeSightGeometry(
      Math.round(worm.x * 65536),
      Math.round((H - worm.y) * 65536),
      sight?.aim ?? 0x8000,
      Math.cos((angle * Math.PI) / 180) < 0 ? -1 : 1,
      sight?.opening ?? 0,
    );
    const projectSight = (x, y) => screen(x >> 16, H - (y >> 16));
    const origin = projectSight(nativeGeometry.x, nativeGeometry.y);
    const target = projectSight(
      (nativeGeometry.x + nativeGeometry.dx) | 0,
      (nativeGeometry.y + nativeGeometry.dy) | 0,
    );
    updateOriginalCharge(
      aimHUD.chargeSprites,
      charging ? chargeFixed : 0,
      origin,
      target,
      arena.clientWidth,
      arena.clientHeight,
      { geometry: nativeGeometry, project: projectSight },
    );
    aimHUD.reticle.setAttribute(
      "transform",
      `translate(${Math.round(target.x / 2) * 2},${Math.round(target.y / 2) * 2})`,
    );
    const aimText = charging
      ? `${Math.round(power)}%`
      : `${Math.round(angle)}°`;
    if (aimHUD.text.textContent !== aimText) aimHUD.text.textContent = aimText;
    aimHUD.charge.style.display = charging ? "" : "none";
    aimHUD.charge.setAttribute("stroke-dasharray", `${power} 100`);
    lastAim = {
      ...geometry,
      reticle: target,
      angle,
      nativeSight: nativeGeometry,
    };
  }
  aimHUD.tag.hidden = !projectile;
  if (projectile) {
    const p = screen(projectile.x, projectile.y);
    aimHUD.tag.style.left =
      Math.max(48, Math.min(arena.clientWidth - 48, p.x)) + "px";
    aimHUD.tag.style.top =
      Math.max(14, Math.min(arena.clientHeight - 25, p.y - 22)) + "px";
    aimHUD.tag.textContent = WEAPONS[projectile.kind].timed
      ? `✹ ${Math.max(0, projectile.nativeTimer ? projectile.nativeTimer.remaining / 1000 : projectile.fuse - projectile.age).toFixed(1)}s`
      : p.y < 0
        ? projectile.kind === "mortar"
          ? "↑ MORTAR"
          : "↑ ROCKET"
        : "➶";
  }
  aimHUD.trail.setAttribute("d", "");
}
function announce(text) {
  $("#announcement").textContent = text;
  $("#announcement").style.opacity = 1;
  announceUntil = performance.now() + 2200;
}
const soundTimes = new Map();
function sfx(kind) {
  if (!sound) return;
  const now = performance.now();
  if (now - (soundTimes.get(kind) ?? -1000) < (kind === "bounce" ? 100 : 45))
    return;
  soundTimes.set(kind, now);
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  playOriginalSound(audio, kind, () => playSound(audio, kind));
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
function stopBurstSound(burst = pendingFire?.burst) {
  burst?.playback?.stop();
  if (burst) burst.playback = null;
}
function stopProjectileSound(p = projectile) {
  p?.nativeFusePlayback?.stop();
  if (p) p.nativeFusePlayback = null;
}
function reset({ keepSeries = false, seed = null, isDaily = false } = {}) {
  cancelCharge();
  uiKey = "";
  timerKey = "";
  selectionTick = 0;
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
  weaponDelays = [0, 1].map(() =>
    createWeaponDelays(isDaily ? {} : configuredDelays),
  );
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
  shotgunRemaining = 0;
  stopBurstSound();
  pendingFire = null;
  homingTarget = null;
  fuse = 3;
  bounce = 0.55;
  $("#fuse").value = "3";
  $("#bounce").value = "0.55";
  lastJump = { kind: null, time: -1 };
  for (const w of worms) {
    w.nativeHitVoicePlayback?.stop();
    dispose(w.g);
    w.label.remove();
  }
  stopProjectileSound();
  if (projectile) releaseProjectileMesh(projectile.mesh);
  projectile = null;
  if (crate) {
    dispose(crate.mesh);
    crate = null;
  }
  for (const effect of originalEffects) dispose(effect.mesh);
  originalEffects.length = 0;
  for (const p of nativeParticles) dispose(p.mesh);
  nativeParticles.length = 0;
  for (const p of originalSmoke) dispose(p.mesh);
  originalSmoke.length = 0;
  for (const p of originalDebris) dispose(p.mesh);
  originalDebris.length = 0;
  for (const bubble of waterBubbles) dispose(bubble.mesh);
  waterBubbles.length = 0;
  for (const p of particles) releaseParticle(p.mesh);
  particles = [];
  for (const m of mines) dispose(m.mesh);
  mines = [];
  for (const g of girders) dispose(g.mesh);
  girders = [];
  for (const grave of graves) dispose(grave.mesh);
  graves = [];
  for (const b of bombs) { b.nativeFusePlayback?.stop(); dispose(b.mesh); }
  bombs = [];
  for (const strike of airstrikes) if(strike.mesh) dispose(strike.mesh);
  airstrikes = [];
  nativeCamera.reset();
  nativeCameraFocus = null;
  nativeCameraFraming = null;
  pendingWormCamera = [];
  for (const f of fires) dispose(f.mesh);
  fires = [];
  for (const h of hazards) dispose(h.mesh);
  hazards = [];
  const matchSeed = seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  matchRandom.reset(matchSeed);
  mineDudPool = new NativeMineDudPool();
  nativeRenderOrder = new NativeRenderOrder();
  smokeRandom = matchSeed >>> 0;
  impactBag = createImpactBag();
  bubbleSeed = matchSeed >>> 0;
  const layout = isDaily ? "fern" : $("#map-layout").value;
  const authored = createOriginalMap(layout);
  const width = authored?.width ?? 1200,
    height = authored?.height ?? 650;
  if (W !== width || H !== height) {
    setWorldDimensions(width, height);
    texture.dispose();
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;
    for (const mesh of [land, backdrop]) {
      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(W, H);
      mesh.position.x = W / 2;
      mesh.position.y = H / 2;
    }
    backdrop.userData.originalTheme = null;
    group.remove(water);
    water.geometry.dispose();
    water.material.map.dispose();
    water.material.dispose();
    water = createWater(W, WATER);
    group.add(water);
    Object.assign(view, cameraView(W / 2, H / 2, 1));
    cameraX = W / 2;
    cameraY = H / 2;
    cameraZoom = 1;
    cameraSnap = true;
  }
  terrain =
    authored ??
    new Terrain(matchSeed, layout.startsWith("original:") ? "fern" : layout);
  terrain.seed = matchSeed;
  terrain.theme = isDaily ? "forest" : $("#terrain-theme").value;
  if (!authored) placeOriginalDecorations(terrain, W, H);
  $(".location span").textContent =
    {
      fern: "FERN ISLAND",
      highlands: "HIGHLANDS",
      archipelago: "ARCHIPELAGO",
      forts: "FORTS",
      caverns: "CAVERNS",
      bridges: "BRIDGES",
    }[terrain.layout] ??
    terrain.layout.replace("original:", "").replace(".img", "").toUpperCase();
  paintTerrain(ctx, terrain, texture);
  updateOriginalBackdrop();
  terrainDirty = false;
  const slots = [180, 340, 490, 710, 860, 1020];
  const spawns = authored
    ? originalMapSpawns(
        terrain,
        waterLevel,
        slots.map((x) => x / 1200),
      )
    : slots.map((x) => ({ x, y: null }));
  worms = spawns.map((p, index) =>
    createWorm(index < 3 ? 0 : 1, index % 3, p.x, p.y),
  );
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
function crateSprite(kind, falling) {
  const prefix = kind === "health" ? "m" : kind === "utility" ? "u" : "w";
  return `${prefix}crate${falling ? 2 : 1}`;
}
function spawnCrate() {
  if (crate || !terrain) return;
  for (let tries = 0; tries < 40; tries++) {
    const x = 150 + logicRandom() * (W - 300),
      ground = terrain.surface(x);
    if (ground < waterLevel + 30) continue;
    if (worms.some((w) => w.hp > 0 && Math.abs(w.x - x) < 60)) continue;
    const kind = PICKUP_KINDS[Math.floor(logicRandom() * PICKUP_KINDS.length)],
      mesh =
        createOriginalObject(crateSprite(kind, true), -10),
      targetY = ground + 10;
    mesh.position.set(x, H + 34, 18);
    group.add(mesh);
    crate = {
      x,
      y: H + 34,
      targetY,
      kind,
      mesh,
      bob: visualRandom() * Math.PI * 2,
      falling: true,
      artAge: 0,
      vy: 0,
    };
    return;
  }
}
function spawnHazards() {
  if (hazards.length || !terrain) return;
  for (let i = 0; i < 2; i++) {
    for (let tries = 0; tries < 30; tries++) {
      const x = 180 + logicRandom() * (W - 360),
        ground = terrain.surface(x);
      if (ground < waterLevel + 50) continue;
      if (worms.some((w) => w.hp > 0 && Math.abs(w.x - x) < 70)) continue;
      if (crate && Math.abs(crate.x - x) < 55) continue;
      if (hazards.some((h) => Math.abs(h.x - x) < 70)) continue;
      const mesh = createOriginalObject("oildrum1", -14);
      mesh.position.set(x, ground + 14, 17);
      group.add(mesh);
      hazards.push({ x, y: ground + 14, mesh });
      break;
    }
  }
}
function spawnFire(x, y, owner = -1) {
  const mesh = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const flame = createOriginalObject("flame1");
    if (!flame) continue;
    flame.position.x = (i - 1) * 18;
    mesh.add(flame);
  }
  mesh.position.set(Math.round(x), Math.round(y), 26);
  group.add(mesh);
  fires.push({ x, y, owner, mesh, life: 5.5, tick: 0 });
}
function stepBombs(dt) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    if (b.nativeBody) {
      if (sound && b.nativeTimer.loopSound && !b.nativeFusePlayback) {
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        audio.resume();
        b.nativeFusePlayback = playNativeProjectileFuse(audio, b.nativeFuseSound);
      }
      const result = stepNativeProjectile(b, {
        height: H, waterLevel, wind, gravityScale, frame: matchRandom.frame,
        solid: (x, y) => terrain.solid(x, H - y),
        random: () => matchRandom.logicUint(),
        collisionBody: hit => hit >= 2 ? nativeWormContactBody(worms[hit - 2], H) : { type: 1, vx: 0, vy: 0 },
        updateCollisionBody: (hit, body) => { if (hit >= 2) applyNativeWormContact(worms[hit - 2], body); },
      }, (x, y, body) => nativeProjectileCollision(b, x, y, terrain, worms, H, body));
      b.age += dt;
      if (!b.nativeTimer.loopSound || result.removed || result.detonate) {
        b.nativeFusePlayback?.stop();
        b.nativeFusePlayback = null;
      }
      b.mesh.position.set(b.x, b.y, 40);
      updateOriginalProjectile(b.mesh, b.kind, b.vx, b.vy, b.age,
        Boolean(b.nativeBody.submerged), false, b.nativeRender);
      if (sound && (result.sounds.length || result.events.some(e => e.operation === "sound"))) {
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        audio.resume();
        for (const request of result.sounds) playNativeWaterSound(audio, request);
        for (const event of result.events)
          if (event.operation === "sound" && !event.timer)
            b.nativeContactPlayback = playNativeProjectileContactSound(audio, event.request, b.nativeContactPlayback);
      }
      if (result.removed || result.detonate) {
        bombs.splice(i, 1);
        releaseProjectileMesh(b.mesh);
        if (result.detonate) {
          const packet = nativeProjectileDetonationEvents(b, () => matchRandom.logicUint())
            .find(event => event.operation === "blast")?.request;
          if (packet) explode(b.x, b.y, b.kind, b.owner, packet);
        }
      }
      continue;
    }
    b.fuse -= dt;
    b.age += dt;
    if (b.grounded) {
      updateOriginalObject(
        b.mesh,
        b.sprite,
        b.age,
        Math.min(65535, Math.floor((b.age / b.initialFuse) * 65536)),
      );
    } else if (b.mesh.userData.originalSprite) {
      const frame = originalVisual(b.sprite);
      const turn =
        b.sprite === "airmisl"
          ? Math.atan2(b.vx, b.vy) / (Math.PI * 2)
          : b.age * 0.8;
      const index =
        ((Math.round(turn * frame.count) % frame.count) + frame.count) %
        frame.count;
      b.mesh.material.map = originalVisual(b.sprite, index).map;
      b.mesh.userData.originalFrame = index;
    }
    if (
      b.grounded &&
      b.fuse < 1.5 &&
      Math.floor(b.fuse * 4) !== Math.floor((b.fuse + dt) * 4)
    )
      sfx("fuse");
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
    f.mesh.children.forEach((flame, i) =>
      updateOriginalObject(flame, "flame1", 5.5 - f.life + i * 0.17),
    );
    if (f.life <= 0) {
      dispose(f.mesh);
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
    const utility = pool[Math.floor(logicRandom() * pool.length)];
    utilityAmmo[w.team][utility] = addAmmo(utilityAmmo[w.team][utility], 1);
    label = `+1 ${UTILITIES[utility].label}`;
  } else if (kind === "special") {
    const special =
      SPECIAL_WEAPONS[Math.floor(logicRandom() * SPECIAL_WEAPONS.length)];
    ammo[w.team][special] = addAmmo(ammo[w.team][special], 1);
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
  const inventory = weaponDelays[team];
  weaponDelays[team] = advanceNativeDelays(inventory.turns, inventory.delays);
  shotgunRemaining = 0;
  homingTarget = null;
  stopRope();
  stopJetpack();
  targetUtility = null;
  activeUtility = null;
  parachuteArmed = false;
  utilitiesOpen = false;
  specialOpen = false;
  // Native team event 0x41C broadcasts thaw (0x412) before turn setup.
  const thawing = worms.some(
    (w) => w.team === team && w.hp > 0 && w.frozen > 0,
  );
  for (const w of worms) if (w.team === team) w.frozen = 0;
  if (thawing) sfx("unfreeze");
  applyPoisonTick();
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
  wind = (logicRandom() - 0.5) * windMax;
  slowMo = 0;
  angle = team ? 135 : 45;
  active.facing = team ? -1 : 1;
  if (
    team === 1 &&
    mode === "ai" &&
    displayAmmo(utilityAmmo[1]?.parachute ?? 0) > 0
  )
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
  updateOriginalWindHUD(wind);
  $(".location span").textContent = daily
    ? "DAILY ISLAND"
    : ({
        fern: "FERN ISLAND",
        highlands: "HIGHLANDS",
        archipelago: "ARCHIPELAGO",
        forts: "FORTS",
        caverns: "CAVERNS",
        bridges: "BRIDGES",
      }[terrain.layout] ??
      terrain.layout
        .replace("original:", "")
        .replace(".img", "")
        .toUpperCase());
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
  // Only touch the DOM when its underlying simulation state changed.
  const loadout = ammo[team] ?? {};
  // Recovery can finish without changing HP or knocked state. Refresh controls
  // whenever action eligibility changes, including native hurt/recovery gates.
  const key = `${canAct()}|${!!pendingFire}|${weaponDelays[team].delays.join(",")}|${shotgunRemaining}|${current}|${phase}|${team}|${mode}|${weapon}|${replaying}|${charging}|${retreat > 0}|${menu.open}|${wormLocked}|${suddenDeath}|${poisoned}|${utilitiesOpen}|${activeUtility}|${targetUtility}|${rope.attached}|${Math.ceil(rope.length)}|${jetpack.active}|${Math.ceil(jetpack.fuel)}|${Object.values(loadout).join(",")}|${specialOpen}|${worms.map((w) => `${w.hp}:${w.knocked}`).join(",")}`;
  if (key === uiKey) return;
  uiKey = key;
  updateHudTeams(worms, team);
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
    (!shotgunRemaining && availableAmmo(loadout, weapon) <= 0) ||
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
    WEAPONS[weapon]?.special === "airstrike" ||
    ["prod", "axe", "firepunch", "dragonball"].includes(weapon);
  document.querySelectorAll("[data-weapon]").forEach((button) => {
    const count = availableAmmo(loadout, button.dataset.weapon);
    const delay = weaponDelay(weaponDelays[team], button.dataset.weapon);
    button.querySelector("small").textContent =
      delay < 0
        ? "LOCK"
        : delay > 0
          ? `WAIT ${delay}`
          : count === Infinity
            ? "∞"
            : count;
    button.title =
      delay < 0
        ? "Unavailable this match"
        : delay > 0
          ? `Available after ${delay} more team turns`
          : WEAPONS[button.dataset.weapon].label;
    button.disabled =
      !canAct() || charging || shotgunRemaining > 0 || count <= 0;
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.weapon === weapon),
    );
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
      select.textContent = `⇥ ${index}/${roster.length}`;
      select.setAttribute(
        "aria-label",
        `Select worm ${index} of ${roster.length}`,
      );
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
    const count = displayAmmo(utilityLoadout[kind] ?? 0);
    button.querySelector("small").textContent =
      count === Infinity ? "∞" : count;
    button.disabled =
      !canAct() ||
      charging ||
      shotgunRemaining > 0 ||
      (count <= 0 && activeUtility !== kind) ||
      (activeUtility !== null && activeUtility !== kind);
    button.classList.toggle("selected", activeUtility === kind);
  });
  updateOriginalHUDIcons();
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
            : WEAPONS[targetUtility]?.special === "airstrike"
              ? "✈ AIM"
              : parachuteArmed
                ? "☂ CHUTE"
                : "KIT";
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
    !pendingFire &&
    !worms[current]?.originalRecovery &&
    !worms[current]?.nativeHurtBody &&
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
    !worms[current]?.knocked &&
    !worms[current]?.originalRecovery &&
    !worms[current]?.nativeHurtBody
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
  for (const w of worms) w.originalRope = null;
  if (rope.cuff) {
    group.remove(rope.cuff);
    rope.cuff.geometry.dispose();
    rope.cuff.material.dispose();
  }
  if (rope.mesh) {
    group.remove(rope.mesh);
    rope.mesh.geometry.dispose();
    rope.mesh.material.dispose();
  }
  rope = { attached: false, anchor: null, length: 0, mesh: null };
  if (activeUtility === "rope") activeUtility = null;
}
function stopJetpack() {
  for (const w of worms) stopOriginalJetpack(w);
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
  const index = Math.max(0, Math.min(8, 4 - Math.round(angle / 22.5)));
  const name = `grd${length > 72 ? "l" : "s"}${index}`;
  const original = stampOriginalGirder(terrain, W, H, cx, cy, name);
  if (!original) return false;
  paintTerrain(ctx, terrain, texture);
  terrainDirty = false;
  // Keep placement metadata; artwork is part of the destructible terrain.
  const mesh = new THREE.Group();
  girders.push({ mesh, cx, cy, angle, length, original });
  return true;
}
function handleUtilityTarget(e) {
  if (!targetUtility) return;
  const rect = arena.getBoundingClientRect(),
    x = Math.max(
      20,
      Math.min(
        W - 20,
        view.x + ((e.clientX - rect.left) / rect.width) * view.w,
      ),
    ),
    y = view.y + (1 - (e.clientY - rect.top) / rect.height) * view.h;
  const w = worms[current];
  if (WEAPONS[targetUtility]?.special === "homing") {
    homingTarget = { x, y };
    targetUtility = null;
    activeUtility = null;
    impactFlash(x, y);
    $("#status").textContent = "Target set. Aim, then hold fire to launch.";
    updateSliders();
    updateUI();
    return;
  }
  if (WEAPONS[targetUtility]?.special === "airstrike") {
    if ((availableAmmo(ammo[team], targetUtility) ?? 0) <= 0) {
      targetUtility = null;
      activeUtility = null;
      updateUI();
      return;
    }
    const strikeKind = targetUtility;
    ammo[team][strikeKind] = spendAmmo(ammo[team][strikeKind]);
    spawnAirstrike(x, y, strikeKind);
    finishUtilityTurn(`${WEAPONS[strikeKind].label} called. Bombs away!`);
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
    utilityAmmo[team].teleport = spendAmmo(utilityAmmo[team].teleport);
    w.vx = w.vy = 0;
    startOriginalTeleport(w, x, y);
    queueWormCamera(w);
    finishUtilityTurn("Teleporting. Turn ends after arrival.");
    return;
  }
  if (targetUtility === "girder") {
    if (Math.hypot(x - w.x, y - w.y) > 260) {
      $("#status").textContent = "Girder out of range. Move closer.";
      return;
    }
    utilityAmmo[team].girder = spendAmmo(utilityAmmo[team].girder);
    addGirder(x, y, 0, 64);
    finishUtilityTurn("Girder placed. Turn over.");
  }
}
function useUtility(kind) {
  if (!canAct() || charging || shotgunRemaining) return;
  if (kind === "jetpack" && jetpack.active) {
    stopJetpack();
    closeUtilities();
    return;
  }
  const count = displayAmmo(utilityAmmo[team]?.[kind] ?? 0);
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
    freezeTeam(worms, team);
    sfx("freeze");
    utilityAmmo[team].freeze = spendAmmo(utilityAmmo[team].freeze);
    activeUtility = null;
    finishUtilityTurn(
      "Your squad is frozen and protected until your next turn.",
    );
  }
}
function startJetpack() {
  if (!canAct() || displayAmmo(utilityAmmo[team]?.jetpack ?? 0) <= 0) return;
  if (rope.attached) stopRope();
  utilityAmmo[team].jetpack = spendAmmo(utilityAmmo[team].jetpack);
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
  w.originalParachute = null;
  stepOriginalJetpack(w, 0, 0);
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
  if (!clearBodyPath(terrain, px, py, w.x, w.y)) {
    w.x = px;
    w.y = py;
    w.vx = 0;
    w.vy = 0;
  }
  w.ground = false;
  w.moving = Boolean(move);
  w.facing = move < 0 ? -1 : move > 0 ? 1 : w.facing;
  stepOriginalJetpack(w, move, thrust);
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
  rope.cuff = createOriginalVisual("ropecuff");
  if (rope.cuff) group.add(rope.cuff);
  updateRopeVisual(w);
  w.ground = false;
  w.originalParachute = null;
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
    dy = w.y + 18 - a.y,
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
  dy = w.y + 18 - a.y;
  len = Math.hypot(dx, dy) || 1;
  const nx = dx / len,
    ny = dy / len;
  if (len > rope.length) {
    w.x = a.x + nx * rope.length;
    w.y = a.y + ny * rope.length - 18;
    const radial = Math.max(0, w.vx * nx + w.vy * ny);
    w.vx -= radial * nx;
    w.vy -= radial * ny;
  }
  w.ground = false;
  w.moving = Boolean(move);
  w.facing = move < 0 ? -1 : move > 0 ? 1 : w.facing;
  if (!clearBodyPath(terrain, px, py, w.x, w.y)) {
    w.x = px;
    w.y = py;
    w.vx = 0;
    w.vy = 0;
  }
}
function updateRopeVisual(w) {
  if (!rope.mesh || !rope.attached) return;
  const bodyAngle = Math.round(
    (Math.atan2(rope.anchor.y - (w.y + 18), w.x - rope.anchor.x) * 0x10000) /
      (Math.PI * 2),
  );
  setOriginalRope(w, bodyAngle);
  if (rope.cuff) {
    const art = originalVisual("ropecuff");
    const index = nativeSpriteFrame(art.count, art.flags, bodyAngle + 0x8100);
    rope.cuff.material.map = originalVisual("ropecuff", index).map;
    rope.cuff.userData.originalFrame = index;
    rope.cuff.position.set(rope.anchor.x, rope.anchor.y, 31);
  }
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
    if (w.hp <= 0 || w.frozen > 0) continue;
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
  const scale = Math.ceil(Math.max(w / image.width, h / image.height)),
    iw = image.width * scale,
    ih = image.height * scale;
  ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}
async function shareResultCard() {
  if (!lastResult) return;
  await document.fonts.load('24px "Siege Pixel"');
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  if (backdropMap.image) coverDraw(ctx, backdropMap.image, 0, 0, 1200, 630);
  else {
    ctx.fillStyle = "#173235";
    ctx.fillRect(0, 0, 1200, 630);
  }
  ctx.fillStyle = "#38283f";
  ctx.fillRect(0, 0, 630, 630);
  const portrait = originalVisual("wblink1")?.map.image;
  if (portrait) {
    ctx.drawImage(portrait,650,220,portrait.width*8,portrait.height*8);
    ctx.drawImage(portrait,875,270,portrait.width*8,portrait.height*8);
  }
  const result =
    lastResult.winner === 0
      ? "MOSS COMPANY WINS"
      : lastResult.winner === 1
        ? "CORAL CREW WINS"
        : "MUTUAL DESTRUCTION";
  ctx.fillStyle = "#efc58b";
  ctx.font = '24px "Siege Pixel"';
  ctx.fillText("POCKET SIEGE", 64, 92);
  ctx.fillStyle = "#ffe4af";
  ctx.font = '32px "Siege Pixel"';
  ctx.fillText(result, 62, 190);
  ctx.fillStyle = "#e7dcc0";
  ctx.font = '24px "Siege Pixel"';
  const line = lastResult.series
    ? `BEST OF 3 · ${lastResult.seriesWins[0]}–${lastResult.seriesWins[1]}`
    : `FINAL HEALTH · ${lastResult.score[0]}–${lastResult.score[1]}`;
  ctx.fillText(line, 64, 248);
  if (lastResult.daily) {
    ctx.fillStyle = "#efc58b";
    ctx.font = '16px "Siege Pixel"';
    ctx.fillText(`DAILY ISLAND · ${lastResult.date}`, 64, 292);
  }
  ctx.fillStyle = "#d3aa91";
  ctx.font = '16px "Siege Pixel"';
  ctx.fillText(
    `BEST HIT ${record.bestHit} · LONGEST ${record.longest}`,
    64,
    350,
  );
  ctx.fillText(`${record.wins} WINS / ${record.losses} LOSSES`, 64, 382);
  ctx.fillStyle = "#ffe4af";
  ctx.font = '16px "Siege Pixel"';
  ctx.fillText("PICK YOUR ANGLE. MAKE A LITTLE CHAOS.", 64, 430);
  ctx.fillStyle = "#efc58b";
  ctx.font = '16px "Siege Pixel"';
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
    weaponDelays: configuredDelays,
    mode: $("#mode").value,
    difficulty: $("#difficulty").value,
    format: $("#format").value,
    weather: $("#weather").value,
    mapLayout: $("#map-layout").value,
    terrainTheme: $("#terrain-theme").value,
    modifier: $("#modifier").value,
    scheme: $("#scheme").value,
    turnTime: +$("#turn-time").value,
    retreatTime: +$("#retreat-time").value,
    suddenDeath: $("#sudden-death").value,
  });
}
function applySettings() {
  const saved = readSettings();
  configuredDelays = saved.weaponDelays;
  syncDelayControl();
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
  set("#map-layout", saved.mapLayout);
  set("#terrain-theme", saved.terrainTheme);
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
    shotgun: shotgunRemaining ? "SECOND SHOT" : "FIRE SHOTGUN",
    handgun: "FIRE HANDGUN",
    uzi: "FIRE UZI",
    minigun: "FIRE MINIGUN",
    prod: "PROD",
    axe: "SWING AXE",
    firepunch: "FIRE PUNCH",
    dragonball: "DRAGON BALL",
    homing: homingTarget ? null : "SET TARGET",
    pigeon: homingTarget ? null : "SET TARGET",
    magic: homingTarget ? null : "SET TARGET",
    bat: "SWING BAT",
    airstrike: "CALL AIRSTRIKE",
    postal: "CALL POSTAL STRIKE",
  }[weapon];
  $("#fire-label").textContent = specialLabel
    ? specialLabel
    : charging
      ? "RELEASE"
      : "FIRE";
  $("#fire").classList.toggle("special-action", Boolean(specialLabel));
  $("#fire small").textContent = specialLabel
    ? coarsePointer
      ? "TAP TO PLACE"
      : "SPACE / CLICK"
    : coarsePointer
      ? "HOLD / RELEASE"
      : "HOLD SPACE";
}
function startCharge(source) {
  if (!shotgunRemaining && availableAmmo(ammo[team], weapon) <= 0) return;
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
  if (WEAPONS[weapon]?.special === "homing" && !homingTarget) {
    targetUtility = weapon;
    $("#status").textContent =
      "Click or tap a target. Use MAP to see the whole battlefield.";
    updateUI();
    return;
  }
  if (weapon === "mine") {
    placeMine();
    return;
  }
  if (weapon === "dynamite") {
    placeDynamite();
    return;
  }
  if (WEAPONS[weapon]?.special === "hitscan") {
    fireBulletWeapon(false, weapon);
    return;
  }
  if (weapon === "dragonball") { fireDragonBall(); return; }
  if (weapon === "firepunch") { firePunch(); return; }
  if (weapon === "axe") { fireAxe(); return; }
  if (weapon === "prod") { fireProd(); return; }
  if (weapon === "bat") {
    fireBat();
    return;
  }
  if (WEAPONS[weapon]?.special === "airstrike") {
    beginAirstrikeTargeting();
    return;
  }
  charging = true;
  chargeFixed = 0;
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
  chargeFixed = 0;
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
function injure(w, damage, direction = 0, native = false) {
  // Frozen state 0x88 bypasses weapon damage in events 0x404/0x433.
  if (w.hp <= 0 || damage <= 0) return;
  if (w.frozen > 0) {
    sfx("frozenhit");
    return;
  }
  const previousHp = w.hp;
  const accounting = nativeDamageAccounting(
    {
      hp: w.hp,
      total: w.damageTaken ?? 0,
      displayed: 0,
      reset: 0,
      resetActive: false,
      team: w.team,
      worm: worms.indexOf(w),
      state: 0x65,
    },
    damage,
  );
  w.hp = accounting.hp;
  w.damageTaken = accounting.total;
  const actualDamage = previousHp - w.hp;
  if (!native) {
    w.originalHurt = null;
    w.nativeHurtBody = null;
    w.originalRecovery = null;
  }
  w.hurt = 1.4;
  sfx("hit");
  w.hits++;
  if (direction) w.hitDirection = direction;
  if (w.hp === 0) {
    w.deathPending = true;
    slowMo = Math.max(slowMo, 0.7);
  }
  damageLabel(w, actualDamage, direction);
  if (w === worms[current]) {
    shotgunRemaining = 0;
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
function removeMine(index) {
  const mine = mines[index];
  nativeRenderOrder.release(mine.nativeOrderId);
  mine.impactPlayback?.stop?.();
  dispose(mine.mesh);
  mines.splice(index, 1);
}
function placeMine() {
  if (!canAct() || !worms[current]?.ground || worms[current].knocked) return;
  wormLocked = true;
  if (availableAmmo(ammo[team], "mine") <= 0) {
    setWeapon("rocket");
    return;
  }
  const w = worms[current],
    mesh = createOriginalObject("mineoff", 4);
  const release = nativeProjectileLaunchGeometry("mine", w, angle, 0, H, () => matchRandom.logicUint());
  const mine = {
    ...release,
    owner: current,
    team,
    arm: nativeMineInitialTimer().arm / 1000,
    nativeTimer: { ...nativeMineInitialTimer(), damage: NATIVE_MINE_DAMAGE, placed: 1, forceBlast: 0, dud: 0 },
    nativeWater: { bubbleProgress: 0, waterFlagsSet: 0, splashActive: 0 },
    mesh,
    bob: visualRandom() * Math.PI * 2,
  };
  mine.nativeBody = nativeMineBody(nativeMineBase(NATIVE_MINE_FRICTION), {
    x: Math.round(release.x * 65536), y: Math.round((H - release.y) * 65536),
    vx: Math.round(release.vx / 50 * 65536), vy: Math.round(-release.vy / 50 * 65536),
  }, mine.nativeTimer.arm, NATIVE_MINE_FRICTION, (x, y, body) =>
    nativeSceneCollision(mine, body, x / 65536, H - y / 65536, terrain, worms, H));
  mine.x = mine.nativeBody.x / 65536;
  mine.y = H - mine.nativeBody.y / 65536;
  mesh.position.set(mine.x, mine.y, 18);
  group.add(mesh);
  const mineSlots = Array(24).fill(null);
  for (const old of mines) mineSlots[old.nativeSlot] = {
    frame: old.nativeCreatedFrame, x: old.nativeBody.x, y: old.nativeBody.y,
  };
  const registration = nativeMineRegistration(mineSlots, matchRandom.frame, team === 0 ? 2 : 0);
  mine.nativeOrderId = nativeRenderOrder.allocate();
  for (const call of registration.calls) {
    if (call.operation === "effect") spawnNativeParticleRequest(call.request);
    else if (call.operation === "delete") {
      const oldIndex = mines.findIndex(old => old.nativeSlot === registration.slot);
      if (oldIndex >= 0) removeMine(oldIndex);
    }
  }
  mine.nativeSlot = registration.slot;
  mine.nativeCreatedFrame = registration.registeredFrame;
  mines.push(mine);
  ammo[team].mine = spendAmmo(ammo[team].mine);
  if (ammo[team].mine === 0) setWeapon("rocket");
  charging = false;
  chargeSource = null;
  w.recoil = 0.15;
  startOriginalRecoil(w, "mine", angle, matchRandom.frame);
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
  ammo[team][kind] = spendAmmo(ammo[team][kind]);
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
  sprite = kind === "dynamite" ? "dynamite" : "clustlet",
}) {
  const mesh =
    (grounded
      ? createOriginalObject(sprite, -4)
      : createOriginalVisual(sprite));
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
    sprite,
    initialFuse: fuse,
    age: 0,
  });
}
// Original teleport entry and relocation both dispatch004D6760.
function queueWormCamera(w) {
  const request = nativeWormCameraRequest({
    x: Math.round(w.x * 65536), y: Math.round((H - w.y) * 65536),
    active: w === worms[current] ? 1 : 0, state: nativeWormState(w),
    motion: [Math.round(w.vx / 50 * 65536), Math.round(-w.vy / 50 * 65536), 0, 0, 0],
  }, {
    left: 0, right: W * 65536, top: -256 * 65536, bottom: nativeProjectileDepth(Math.floor(H - waterLevel)),
    sameTeam: w.team === team, override: false,
  });
  if (request) pendingWormCamera.push(request);
}
function spawnAirstrike(x, y, kind = "airstrike") {
  const direction = Number($("#strike-direction").value);
  const strike = createNativeAirstrike(x,y,direction,current,H,gravityScale,kind);
  strike.mesh = createNativeProjectileVisual({sprite: strike.sprite});
  if (strike.mesh) {
    strike.mesh.position.set(strike.body.x / 65536,H - strike.body.y / 65536,45);
    strike.mesh.scale.x = Math.abs(strike.mesh.scale.x) * (direction > 0 ? -1 : 1);
    group.add(strike.mesh);
  }
  airstrikes.push(strike);
  nativeCamera.reset();
  nativeCameraFocus = null;
  // The host viewport supplies world units; depth stays zero during tracking.
  nativeCameraFraming = new NativeCameraFraming(
    Math.round(cameraX * 65536), Math.round((H - cameraY) * 65536), 1000 * 65536,
  );
  sfx("airstrike");
}
function stepAirstrikes() {
  for (let i=airstrikes.length-1; i>=0; i--) {
    const strike=airstrikes[i], result=stepNativeAirstrike(strike,H);
    for (const call of result.calls) {
      if (call.operation === "camera") nativeCamera.offer(...call.request);
    }
    for (const missile of result.missiles) {
      if (nativeProjectilePlacementHit(missile,terrain,worms,H)) {
        const packet=nativeProjectileDetonationEvents(missile,()=>matchRandom.logicUint())
          .find(event=>event.operation==="blast")?.request;
        if(packet) explode(missile.x,missile.y,missile.kind,missile.owner,packet);
        continue;
      }
      missile.mesh=createNativeProjectileVisual(missile.nativeRender);
      missile.mesh.position.set(missile.x,missile.y,40);
      group.add(missile.mesh); bombs.push(missile);
    }
    if(strike.mesh) {
      strike.mesh.position.set(strike.body.x/65536,H-strike.body.y/65536,45);
      updateOriginalObject(strike.mesh,strike.mesh.userData.originalSprite,0,strike.body.progress);
    }
    if(result.removed) {
      if(strike.mesh) dispose(strike.mesh);
      airstrikes.splice(i,1);
    }
  }
}

function placeDynamite() {
  if (!canAct() || (availableAmmo(ammo[team], "dynamite") ?? 0) <= 0) return;
  const w = worms[current];
  spendSpecial("dynamite");
  w.recoil = 0.2;
  startOriginalRecoil(w, "dynamite", angle, matchRandom.frame);
  shotCount++;
  const body = {
    ...nativeProjectileLaunchGeometry("dynamite", w, angle, 0, H, () => matchRandom.logicUint()),
    fuse: 5, bounce: 0.3, owner: current, kind: "dynamite", age: 0,
  };
  attachNativeProjectile(body, H);
  if (sound) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    playNativeProjectileReleaseSound(audio, body.nativeRelease);
  }
  if (nativeProjectilePlacementHit(body, terrain, worms, H)) {
    const packet = nativeProjectileDetonationEvents(body, () => matchRandom.logicUint())
      .find(event => event.operation === "blast")?.request;
    if (packet) explode(body.x, body.y, body.kind, body.owner, packet);
  } else {
    body.mesh = createOriginalVisual("dynamite");
    body.mesh.position.set(body.x, body.y, 40);
    group.add(body.mesh);
    bombs.push(body);
  }
  finishAction("Dynamite dropped. Five-second fuse — retreat!");
}
function applyNativeAreaRequest(targets, request) {
  applyNativeHitPackets(targets, nativeAreaDamage(targets, request));
}
function applyNativeHitPackets(targets, dispatches) {
    for (const dispatch of dispatches) {
      if (dispatch.sound?.[0] === 0x61) sfx("batimpact");
      if (dispatch.sound?.[0] === 0x21) sfx("axeimpact");
      if (dispatch.sound?.[0] === 0x65) sfx("firepunchimpact");
      if (dispatch.effect) spawnNativeParticleRequest(dispatch.effect);
      if (!dispatch.packet) continue;
      const mine = targets[dispatch.body].mine;
      if (mine) {
        mine.nativeBody = nativeMineHit(mine.nativeBody, dispatch.packet);
        continue;
      }
      const victim = targets[dispatch.body].worm;
      const [, , , vx, vy] = dispatch.packet;
      const response = nativeDirectHitResponse(
        {
          state: nativeWormState(victim),
          health: victim.hp,
          vx: Math.round((victim.vx * 65536) / 50),
          vy: Math.round((-victim.vy * 65536) / 50),
          x: Math.round(victim.x * 65536),
          y: Math.round((H - victim.y) * 65536),
          fieldB0: 0,
          accumulated: victim.nativeBlastAccumulated ?? 0,
          seen: victim.nativeDirectHitFrame === matchRandom.frame ? 1 : 0,
        },
        dispatch.packet,
        0, // Host scheme delay adapter; native scheme receiver state remains partial.
        1,
        {
          frame: matchRandom.frame,
          previousFrame: victim.nativeHitVoiceFrame ?? 0,
          nextRandom: () => matchRandom.logicUint(),
        },
      );
      if (response.result.seen) victim.nativeDirectHitFrame = matchRandom.frame;
      victim.nativeBlastAccumulated = response.result.accumulated;
      victim.nativeBlastResponseState = response.result.state;
      for (const call of response.output) {
        if (call.state) startOriginalHurt(victim, call.state);
        if (call.base) {
          applyNativeWeaponImpulse(victim, vx, vy);
          victim.knocked = true;
          victim.ground = false;
        }
        if (call.sound) sfx("frozenhit");
        if (call.voice) {
          victim.nativeHitVoiceFrame = call.voice.frame;
          if (sound) {
            audio ??= new (window.AudioContext || window.webkitAudioContext)();
            audio.resume();
            victim.nativeHitVoicePlayback = playNativeHitVoice(
              audio,
              call.voice,
              victim.nativeHitVoicePlayback,
            );
          }
        }
        if (call.blood)
          for (const request of nativeBloodBurst(
            ...call.blood,
            nativeBloodAmount,
            0,
            Math.round(0x3d70 * gravityScale),
            () => matchRandom.logicUint(),
          ))
            spawnNativeParticleRequest(request);
        if (call.health) injure(victim, call.health[0], Math.sign(vx), true);
      }
    }
}
function beginWeaponPreparation(worm, kind, aim) {
  if (!startOriginalPreparation(worm, kind, aim)) return false;
  if (sound && worm.originalPreparation.sounds.length) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    // Fire Punch/Dragon Ball emit speech slots10/15. Tick-time shotgun
    // reload remains a separate sound-effect event.
    for (const slot of worm.originalPreparation.sounds)
      playNativeSpeech(audio, slot);
  }
  return true;
}

function fireBulletWeapon(prepared = false, kind = "shotgun", burst = null) {
  const config = nativeHitscanWeapon(kind, burst);
  const rayConfig = config.ray, resolutionConfig = config.resolution;
  if (
    (!prepared && !canAct()) ||
    (!burst?.spent && !(kind === "shotgun" && shotgunRemaining) && (availableAmmo(ammo[team], kind) ?? 0) <= 0)
  )
    return;
  if (!prepared && beginWeaponPreparation(worms[current], kind, angle)) {
    pendingFire = { worm: worms[current], angle, kind, stage: "prepare",
      burst: kind === "shotgun" ? null : { ordinal: 1, total: config.total, delay: config.interval, trigger: 0, actions: 1, maxActions: 1, spent: false } };
    wormLocked = true;
    move = aimInput = 0;
    charging = false;
    chargeSource = null;
    updateUI();
    return;
  }
  const w = worms[current],
    launch = nativeBulletLaunch(config, w, angle, H, () => matchRandom.logicUint()),
    start = { x: launch.x / 65536, y: H - launch.y / 65536 };
  startOriginalRecoil(w, kind, angle, matchRandom.frame);
  const release = nativeLaunchAudio(config.record, { loop: burst?.playback ? 1 : 0, burst: 0, ordinal: burst?.ordinal ?? 1, flag: 0, team: w.team });
  spawnNativeParticleRequest(
    nativeCasing(
      release.casing,
      w.facing,
      Math.round(w.x * 65536),
      Math.round((H - w.y) * 65536),
      Math.round(0x3d70 * gravityScale),
      () => matchRandom.visualUint(),
    ),
  );
  const ray = nativeHitscanRays(
    [
      w.team,
      current,
      launch.x,
      launch.y,
      launch.vx,
      launch.vy,
      0,
      0,
      0,
      0,
      0,
    ],
    rayConfig.count,
    rayConfig.spread,
    () => matchRandom.logicUint(),
  )[0];
  const targets = [...nativeWormHitscanBodies(worms, w, H), ...nativeMineHitBodies(mines)].sort((a, b) => a.type - b.type);
  const bodyHit = nativeHitscanBody(
    targets,
    ray[2] >> 16,
    ray[3] >> 16,
    ray[4],
    ray[5],
    rayConfig.range,
    rayConfig.collisionMask,
  );
  const terrainDistance = nativeHitscanTerrain(
    ray[2] >> 16,
    ray[3] >> 16,
    ray[4],
    ray[5],
    rayConfig.range,
    (x, y) => terrain.solid(x, H - y),
  );
  const resolution = nativeHitscanResolution(
    ray,
    resolutionConfig,
    bodyHit.distance,
    terrainDistance,
    () => matchRandom.logicUint(),
  );
  const effect = resolution.event ?? resolution.effect;
  const hit = { x: effect[1] / 65536, y: H - effect[2] / 65536 };
  if (kind === "shotgun") {
    if (!shotgunRemaining) {
      ammo[team].shotgun = spendAmmo(ammo[team].shotgun);
      shotgunRemaining = 2;
    }
    shotgunRemaining--;
  } else if (!burst.spent) {
    ammo[team][kind] = spendAmmo(ammo[team][kind]);
    burst.spent = true;
  }
  shotCount++;
  wormLocked = true;
  if (resolution.area) {
    // 004F7DA0 selects every nearby body, including self, and emits 0x433.
    applyNativeAreaRequest(targets, resolution.area);
    terrain.craterRim ??= new Uint8Array(W * H);
    carveNativeCrater(
      terrain.data,
      W,
      H,
      effect[1] >> 16,
      effect[2] >> 16,
      Math.imul(resolutionConfig.extentFactor, effect[4]),
      terrain.craterRim,
    );
    spawnOriginalDebris(effect[1], effect[2], effect[4]);
    terrainDirty = true;
  }
  spawnExplosionArt(
    hit.x,
    hit.y,
    resolution.event ? effect[4] : effect[3],
    effect[0],
  );
  if (kind !== "shotgun") {
    pendingFire = { worm: w, angle, kind, stage: "recoil", burst,
      recoilDelay: nativePostFire(config.record, 0).delay };
    updateUI();
  } else if (shotgunRemaining && w.hp > 0 && !w.knocked) {
    $("#status").textContent =
      "One shot left. Move or adjust your aim, then fire again.";
    updateSliders();
    updateUI();
  } else {
    shotgunRemaining = 0;
    finishAction("Shotgun volley complete. Retreat!");
  }
  lastShot = {
    kind,
    frame: matchRandom.frame,
    shooter: w.name,
    points: [start, hit],
    impact: { ...hit, kind },
  };
  if (kind === "shotgun") sfx("shotgun");
  else if (sound) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const playback = playNativeProjectileReleaseSound(audio, release);
    if (burst && playback) burst.playback = playback;
  }
}
function dispatchFirePunchCalls(w, calls) {
  for (const call of calls) {
    if (call.operation === "terrain") {
      terrain.craterRim ??= new Uint8Array(W * H);
      carveNativeToolMask(terrain.data, W, H, firePunchCut, call.request[1], call.request[2], terrain.craterRim);
      terrainDirty = true;
    } else if (call.operation === "particle") spawnNativeParticleRequest(call.request);
    else if (call.operation === "camera") queueWormCamera(w);
    else if (call.operation === "area") {
      const targets = [...nativeWormHitscanBodies(worms,w,H), ...nativeMineHitBodies(mines)].sort((a,b)=>a.type-b.type);
      applyNativeAreaRequest(targets,call.request);
    }
  }
}
function fireDragonBall(prepared = false) {
  if ((!prepared && !canAct()) || availableAmmo(ammo[team], "dragonball") <= 0) return;
  const w = worms[current];
  if (!prepared && beginWeaponPreparation(w, "dragonball", angle)) {
    pendingFire = {worm:w, angle, kind:"dragonball", stage:"prepare"};
    wormLocked = true; move = aimInput = 0; charging = false; chargeSource = null;
    updateUI(); return;
  }
  const config = nativeHitscanWeapon("dragonball");
  const launch = nativeBulletLaunch(config, w, w.facing < 0 ? 180 : 0, H, () => matchRandom.logicUint());
  const body = nativeDragonBallBody(config.record,
    [team + 1, current, launch.x, launch.y, launch.vx, launch.vy, 0, 0, 0, 30, 0]);
  spendSpecial("dragonball"); shotCount++;
  startOriginalRecoil(w, "dragonball", angle, matchRandom.frame);
  projectile = {kind:"dragonball", owner:current, age:0, x:body.x/65536, y:H-body.y/65536,
    vx:body.direction/65536*300, vy:0, nativeDragonBall:body,
    mesh:createOriginalVisual(nativeSpriteIds.sprites[body.sprite].name)};
  projectile.mesh.scale.x = body.direction < 0 ? -1 : 1;
  projectile.mesh.position.set(projectile.x, projectile.y, 40);
  group.add(projectile.mesh);
  lastShot = {kind:"dragonball", shooter:w.name, points:[{x:projectile.x,y:projectile.y}], impact:null};
  phase = "flight"; retreat = retreatSeconds; shotWait = 0;
  move = aimInput = 0; charging = false; chargeSource = null;
  sfx("dragonball");
  $("#status").textContent = "Dragon Ball away. Retreat!";
  updateUI();
}
function stepDragonBall() {
  const p = projectile;
  const targets = [...nativeWormHitscanBodies(worms, worms[p.owner], H), ...nativeMineHitBodies(mines)]
    .sort((a,b) => a.type - b.type);
  const result = nativeDragonBallEvent(p.nativeDragonBall, 0x3ea,
    {left:0,right:W*65536}, {
      solid:(x,y)=>terrain.solid(x,H-y),
      hit:body=>{
        const hit = nativeDragonBallHit(body, targets);
        for (const call of hit.calls) {
          if (call.operation === "damage") applyNativeHitPackets(targets,[{body:call.receiver,packet:call.request}]);
          if (call.operation === "sound") sfx("dragonballimpact");
        }
        return hit.hit;
      },
    });
  p.nativeDragonBall = result.body; p.age += LOGIC_STEP_SECONDS;
  p.x = result.body.x/65536; p.y = H-result.body.y/65536;
  p.mesh.position.set(Math.round(p.x),Math.round(p.y),40);
  updateOriginalProjectile(p.mesh,p.kind,p.vx,0,p.age,false,false,
    {sprite:result.body.sprite,progress:result.body.progress});
  if (lastShot) lastShot.points.push({x:p.x,y:p.y});
  for (const call of result.calls) {
    if (call.operation === "particle") spawnNativeParticleRequest(call.request);
    if (call.operation === "camera") pendingWormCamera.push(call.request);
    if (call.operation === "delete") {
      if (lastShot) lastShot.impact = {x:p.x,y:p.y,kind:p.kind};
      releaseProjectileMesh(p.mesh); projectile = null;
      phase = "settle"; shotWait = 0; updateUI();
    }
  }
}
function firePunch(prepared = false) {
  if ((!prepared && !canAct()) || availableAmmo(ammo[team], "firepunch") <= 0) return;
  const w = worms[current];
  if (!prepared && beginWeaponPreparation(w,"firepunch",angle)) {
    pendingFire = {worm:w, angle, kind:"firepunch", stage:"prepare"};
    wormLocked = true; move = aimInput = 0; charging = false; chargeSource = null;
    updateUI(); return;
  }
  spendSpecial("firepunch"); shotCount++;
  const record = nativeHitscanWeapon("firepunch").record;
  const calls = attachNativeFirePunchFlight(w, {height:H}, record["0x7c"]);
  startOriginalFirePunch(w);
  dispatchFirePunchCalls(w,calls);
  pendingFire = {worm:w, angle, kind:"firepunch", stage:"firepunch", spent:true};
  updateUI();
}
function fireAxe(prepared = false) {
  if ((!prepared && !canAct()) || availableAmmo(ammo[team], "axe") <= 0) return;
  const w = worms[current];
  if (!prepared && beginWeaponPreparation(w, "axe", angle)) {
    pendingFire = { worm:w, angle, kind:"axe", stage:"prepare" };
    wormLocked = true;
    move = aimInput = 0;
    charging = false;
    chargeSource = null;
    updateUI();
    return;
  }
  spendSpecial("axe");
  shotCount++;
  startOriginalAxe(w);
  pendingFire = { worm:w, angle, kind:"axe", stage:"axe", spent:true };
  updateUI();
}
function fireProd(prepared = false) {
  if ((!prepared && !canAct()) || (availableAmmo(ammo[team], "prod") ?? 0) <= 0) return;
  const w = worms[current];
  if (!prepared && beginWeaponPreparation(w, "prod", angle)) {
    pendingFire = { worm: w, angle, kind: "prod", stage: "prepare" };
    wormLocked = true;
    move = aimInput = 0;
    charging = false;
    chargeSource = null;
    updateUI();
    return;
  }
  const config = nativeHitscanWeapon("prod");
  const targets = [...nativeWormHitscanBodies(worms, w, H), ...nativeMineHitBodies(mines)].sort((a,b) => a.type - b.type);
  applyNativeAreaRequest(targets, nativeProdRequest(config.record,
    Math.round(w.x * 65536), Math.round((H - w.y) * 65536), w.facing));
  spendSpecial("prod");
  shotCount++;
  wormLocked = true;
  startOriginalRecoil(w, "prod", angle, matchRandom.frame);
  finishAction("Prod complete. Retreat!");
}
function fireBat(prepared = false) {
  if ((!prepared && !canAct()) || (availableAmmo(ammo[team], "bat") ?? 0) <= 0) return;
  const w = worms[current];
  if (!prepared && beginWeaponPreparation(w, "bat", angle)) {
    pendingFire = { worm: w, angle, kind: "bat", stage: "prepare" };
    wormLocked = true;
    move = aimInput = 0;
    charging = false;
    chargeSource = null;
    updateUI();
    return;
  }
  const config = nativeHitscanWeapon("bat");
  const launch = nativeBulletLaunch(config, w, angle, H, () => matchRandom.logicUint());
  const targets = [...nativeWormHitscanBodies(worms, w, H), ...nativeMineHitBodies(mines)].sort((a,b) => a.type - b.type);
  applyNativeAreaRequest(targets, nativeBatRequest(config.record,
    launch.x, launch.y, launch.vx, launch.vy, w.facing));
  spendSpecial("bat");
  shotCount++;
  wormLocked = true;
  startOriginalRecoil(w, "bat", angle, matchRandom.frame);
  if (sound) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    playNativeProjectileReleaseSound(audio, nativeLaunchAudio(config.record,
      { loop: 0, burst: 0, ordinal: 1, flag: 0, team: w.team }));
  }
  finishAction("Bat swing complete. Retreat!");
}
function beginAirstrikeTargeting() {
  if ((availableAmmo(ammo[team], weapon) ?? 0) <= 0) return;
  targetUtility = weapon;
  activeUtility = weapon;
  specialOpen = false;
  wormLocked = true;
  $("#status").textContent = `Click or tap the island to call ${WEAPONS[weapon].label}.`;
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
  if (WEAPONS[kind]?.special === "hitscan") {
    fireBulletWeapon(false, kind);
    return;
  }
  if (kind === "dragonball") { fireDragonBall(); return; }
  if (kind === "firepunch") { firePunch(); return; }
  if (kind === "axe") { fireAxe(); return; }
  if (kind === "prod") { fireProd(); return; }
  if (kind === "bat") {
    fireBat();
    return;
  }
  if (WEAPONS[kind]?.special === "airstrike") {
    beginAirstrikeTargeting();
    return;
  }
  if (availableAmmo(ammo[team], kind) <= 0) {
    setWeapon("rocket");
    return;
  }
  if (WEAPONS[kind]?.special === "homing" && !homingTarget) return;
  const selectedTarget = homingTarget ? { ...homingTarget } : null;
  const origin = launchGeometry(w, angle, kind, terrain),
    nativeVelocity = nativeProjectileLaunchGeometry(kind, w, angle, power, H, () => matchRandom.logicUint()),
    v = nativeVelocity ?? launch(angle, power);
  const launchPoint = nativeVelocity ?? (terrain.solid(origin.muzzle.x, origin.muzzle.y)
    ? origin.pivot
    : origin.muzzle);
  if (!nativeVelocity) {
    v.vx *= meta.speed;
    v.vy *= meta.speed;
  }
  const thisFuse = shotFuse ?? fuse,
    thisBounce = shotBounce ?? bounce;
  shotFuse = null;
  shotBounce = null;
  const fromAi = chargeSource === "ai";
  w.recoil = 0.3;
  startOriginalRecoil(w, kind, angle, matchRandom.frame);
  charging = false;
  chargeSource = null;
  if (fromAi) {
    const route = planRetreat({
      terrain,
      me: w,
      worms,
      waterLevel,
      danger: worms
        .filter((t) => t.hp > 0 && t.team !== w.team)
        .sort((a, b) => Math.abs(a.x - w.x) - Math.abs(b.x - w.x))[0],
    });
    aiRetreatTime = route?.time ?? 0;
    aiRetreatDirection = route?.direction ?? 0;
  }
  updateSliders();
  firedPower = power;
  shotCount++;
  retreat = retreatSeconds;
  if (kind !== "rocket" || ammo[team].rocket !== undefined) {
    ammo[team][kind] = spendAmmo(ammo[team][kind]);
    if (ammo[team][kind] === 0) setWeapon("rocket");
  }
  projectile = {
    ...launchPoint,
    ...v,
    target: selectedTarget,
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
    blocked: launchPoint === origin.muzzle ? origin.blocked : false,
  };
  attachNativeProjectile(projectile, H);
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
    WEAPONS[kind]?.special === "homing"
      ? `${WEAPONS[kind].label} away. Tracking your marked target!`
      : kind === "rocket"
        ? "Rocket away. Incoming!"
        : kind === "mortar"
          ? "Mortar away. Heavy impact incoming!"
          : `${kind === "sticky" ? "Sticky bomb" : "Grenade"} thrown. ${thisFuse}-second fuse. Retreat!`;
  move = 0;
  shotWait = 0;
  if (projectile.nativeRelease) {
    if (sound) {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      playNativeProjectileReleaseSound(audio, projectile.nativeRelease);
    }
  } else sfx(kind);
  if (projectile.nativeBody && nativeProjectilePlacementHit(projectile, terrain, worms, H)) {
    explodeProjectile(projectile);
    releaseProjectileMesh(projectile.mesh);
    projectile = null;
    phase = "settle";
  }
  updateUI();
}
function explodeProjectile(p) {
  if (lastShot) lastShot.impact = { x: p.x, y: p.y, kind: p.kind };
  const distance = Math.hypot(p.x - p.launchX, p.y - p.launchY);
  const best = recordBest(record, { longest: distance });
  if (best.longest !== record.longest) {
    record = best;
    writeRecord(record);
    updateRecordUI();
  }
  const nativePacket = p.nativeDetonation
    ? nativeProjectileDetonationEvents(p, () => matchRandom.logicUint())
        .find(event => event.operation === "blast")?.request
    : null;
  explode(p.x, p.y, p.kind, p.owner, nativePacket);
  if (p.nativeDetonation) {
    nativeProjectileChildren(p, H, () => matchRandom.logicUint(), child => {
      if (nativeProjectilePlacementHit(child, terrain, worms, H)) {
        const packet = nativeProjectileDetonationEvents(child, () => matchRandom.logicUint())
          .find(event => event.operation === "blast")?.request;
        if (packet) explode(child.x, child.y, child.kind, child.owner, packet);
        return;
      }
      child.mesh = createNativeProjectileVisual(child.nativeRender);
      child.mesh.position.set(child.x, child.y, 40);
      group.add(child.mesh);
      bombs.push(child);
    });
  }
}
function explode(x, y, kind, ownerIndex = -1, nativePacket = null) {
  const sourceX = x, sourceY = y;
  if (nativePacket) {
    x = nativePacket[1] / 65536;
    y = H - nativePacket[2] / 65536;
  }
  const nativeStrength = nativePacket ? nativePacket[4] : kind === "death" ? 30 : null;
  const nativePush = nativePacket ? nativePacket[3] : 100;
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
          impulse: (WEAPONS[kind].impulse ?? 350) * scale,
        };
  const { radius, damage: maxDamage, impulse } = profile;
  const exposure = new Map(
    worms.map((w) => [w, blastExposure(terrain, x, y, w.x, w.y + 17)]),
  );
  if (nativeStrength !== null) {
    // Native projectile packets and death strength30 feed the shared crater
    // and debris primitives without browser weapon radius/scale multipliers.
    const nativeX = Math.round(x * 65536),
      nativeY = Math.round((H - y) * 65536);
    terrain.craterRim ??= new Uint8Array(W * H);
    carveNativeCrater(
      terrain.data,
      W,
      H,
      nativeX >> 16,
      nativeY >> 16,
      nativeStrength,
      terrain.craterRim,
    );
    spawnOriginalDebris(nativeX, nativeY, nativeStrength);
  } else terrain.carve(x, y, radius);
  terrainDirty = true;
  explosions++;
  shakeUntil = performance.now() + 350;
  hitStop = Math.max(hitStop, reducedMotion ? 0 : 0.055);
  spawnExplosionArt(x, y, nativeStrength ?? Math.round(maxDamage));
  sfx("explosion");
  for (const fragment of nativePacket ? [] : fragments(kind)) {
    spawnBomb({ x: sourceX, y: sourceY + 8, ...fragment, owner: ownerIndex });
  }
  if (kind === "napalm") {
    for (let i = 0; i < 3; i++)
      spawnFire(
        x + (i - 1) * 42 + (logicRandom() - 0.5) * 12,
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
    const a = visualRandom() * Math.PI * 2,
      s = 40 + visualRandom() * 210,
      size = 2 + visualRandom() * 6;
    const mesh =
      createTerrainDebris(terrain.theme, i) ||
      new THREE.Mesh(debrisGeometry, debrisMaterials[i % 3 ? 0 : 1]);
    mesh.position.set(x, y, 35);
    if (!mesh.userData.originalTerrainDebris) mesh.scale.setScalar(size);
    group.add(mesh);
    particles.push({
      mesh,
      size,
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.5 + visualRandom() * 0.8,
      max: 1.3,
      age: 0,
    });
  }
  const reports = [];
  let dealt = 0;
  if (nativeStrength !== null) {
    const packet = nativePacket ?? [1, Math.round(x * 65536), Math.round((H - y) * 65536), nativePush, nativeStrength, 0];
    for (const mine of mines) {
      if (mine.nativeBody)
        mine.nativeBody = nativeMineBlast(mine.nativeBody, packet).body;
    }
  }
  for (const w of worms) {
    if (w.hp <= 0) continue;
    const nativeState = nativeWormState(w);
    if (nativeStrength !== null && [0x84, 0x85, 0x87, 0x6d, 0x75].includes(nativeState)) continue;
    const native =
      nativeStrength !== null
        ? nativeBlastDamage(
            {
              x: Math.round(w.x * 65536),
              y: Math.round((H - w.y) * 65536),
              impulseScale: 65536,
            },
            Math.round(x * 65536),
            Math.round((H - y) * 65536),
            nativePush,
            nativeStrength,
          )
        : null;
    if (native)
      for (const [vx, vy] of native.impulses) {
        applyNativeWeaponImpulse(w, vx, vy);
        w.knocked = true;
        w.ground = false;
      }
    let receivedDamage = native?.damage;
    if (native) {
      const response = nativeBlastResponse(
        {
          state: nativeState,
          vx: Math.round((w.vx * 65536) / 50),
          vy: Math.round((-w.vy * 65536) / 50),
          fieldB0: 0,
          accumulated: w.nativeBlastAccumulated ?? 0,
          facing: w.facing,
          x: Math.round(w.x * 65536),
          y: Math.round((H - w.y) * 65536),
        },
        native.damage,
        false,
        1,
        [Math.round(x * 65536), Math.round((H - y) * 65536)],
      );
      for (const call of response.output) {
        if (call.state) startOriginalHurt(w, call.state);
        if (!call.blood) continue;
        for (const request of nativeBloodBurst(
          ...call.blood,
          nativeBloodAmount,
          0,
          Math.round(0x3d70 * gravityScale),
          () => matchRandom.logicUint(),
        ))
          spawnNativeParticleRequest(request);
      }
      w.nativeBlastAccumulated = response.result.accumulated;
      w.nativeBlastResponseState = response.result.state;
      w.facing = response.result.facing;
      w.vx = response.result.vx / 65536 * 50;
      w.vy = -response.result.vy / 65536 * 50;
      receivedDamage =
        response.output.find((call) => call.health)?.health[0] ?? 0;
    }
    const factor = native
      ? receivedDamage
      : blastImpulse(w, x, y, radius + 34, impulse * exposure.get(w));
    if (factor > 0) {
      const damage = native
        ? receivedDamage
        : Math.max(1, Math.round(factor * maxDamage * exposure.get(w)));
      const direction = Math.sign(w.x - x) || 1;
      if (w.frozen > 0) {
        sfx("frozenhit");
        reports.push(`${w.name} · FROZEN`);
        continue;
      }
      const hpBefore = w.hp;
      injure(w, damage, direction, !!native);
      const actualDamage = hpBefore - w.hp;
      if (ownerIndex >= 0 && worms[ownerIndex]?.team !== w.team)
        dealt += actualDamage;
      reports.push(`${w.name} −${actualDamage}${w.hp === 0 ? " · KO" : ""}`);
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
  if (reports.length && !reducedMotion) hitStop = Math.max(hitStop, 0.085);
  $("#status").textContent = reports.length
    ? reports.join("   /   ")
    : "Terrain destroyed. No worms hit.";
  updateUI();
}
function releaseParticle(mesh) {
  if (mesh.userData.originalTerrainDebris) dispose(mesh);
  else group.remove(mesh);
}
function spawnDust(x, y) {
  const art = originalVisual("skdsmoke");
  if (art)
    spawnNativeParticle(
      "skdsmoke",
      x,
      y,
      0,
      0,
      Math.trunc((0x51e * art.rate) / art.count),
    );
}
const originalDebris = [];
function spawnOriginalDebris(x, y, strength) {
  const requests = nativeDebrisBurst(
    x,
    y,
    Math.trunc((strength << 16) / 8) + 2,
    Math.trunc(strength / 6),
    originalDebris.length,
    () => matchRandom.visualUint(),
  );
  for (const request of requests) {
    const body = nativeDebrisBody(request);
    const mesh = createOriginalVisual("flame1");
    if (!mesh) continue;
    mesh.scale.x = body.sprite & 0x40000 ? -1 : 1;
    mesh.position.set(Math.round(x / 65536), Math.round(H - y / 65536), 35);
    group.add(mesh);
    originalDebris.push({ ...body, mesh });
  }
}
function updateOriginalDebris() {
  for (let i = originalDebris.length - 1; i >= 0; i--) {
    const p = originalDebris[i];
    const tick = nativeDebrisTick(
      p,
      Math.round(0x3d70 * gravityScale),
      Math.floor(H - waterLevel),
      () => (smokeRandom = nextVisualRandom(smokeRandom)),
    );
    spawnOriginalSmoke(tick.smoke);
    if (tick.sounds.length) sfx("sizzle");
    if (!tick.alive) {
      dispose(p.mesh);
      originalDebris.splice(i, 1);
      continue;
    }
    Object.assign(p, tick.body);
    const art = originalVisual("flame1"),
      frame = nativeSpriteFrame(art.count, art.flags, p.progress);
    p.mesh.material.map = originalVisual("flame1", frame).map;
    p.mesh.userData.originalFrame = frame;
    p.mesh.position.set(
      Math.round(p.x / 65536),
      Math.round(H - p.y / 65536),
      35,
    );
  }
}
const originalSmoke = [];
let smokeRandom = 0;
let impactBag = createImpactBag();
function spawnExplosionArt(x, y, strength, mode = 1) {
  const requests = nativeExplosionArt(
    mode,
    Math.round(x * 65536),
    Math.round((H - y) * 65536),
    strength,
    () => matchRandom.visualUint(),
    impactBag,
  );
  spawnOriginalSmoke(requests.smoke);
  for (const request of requests.effects) spawnNativeParticleRequest(request);
}
function spawnDeathSmoke(worm) {
  const requests = nativeDeathSmoke(
    Math.round(worm.x * 65536),
    Math.round((H - worm.y) * 65536),
    new TextEncoder().encode(worm.name).length,
    () => matchRandom.visualUint(),
  );
  spawnOriginalSmoke(requests);
}
function spawnOriginalSmoke(requests) {
  for (const request of requests) {
    const body = nativeSmokeBody(request),
      name = nativeSpriteIds.sprites[body.sprite].name;
    const mesh = createOriginalVisual(name);
    if (!mesh) continue;
    mesh.position.set(
      Math.round(body.x / 65536),
      Math.round(H - body.y / 65536),
      36,
    );
    group.add(mesh);
    originalSmoke.push({ ...body, mesh, name });
  }
}
function updateOriginalSmoke() {
  for (let i = originalSmoke.length - 1; i >= 0; i--) {
    const p = originalSmoke[i];
    const tick = nativeSmokeTick(
      p,
      () => (smokeRandom = nextVisualRandom(smokeRandom)),
    );
    if (!tick.alive) {
      dispose(p.mesh);
      originalSmoke.splice(i, 1);
      continue;
    }
    Object.assign(p, tick.body);
    const art = originalVisual(p.name),
      frame = nativeSpriteFrame(art.count, art.flags, p.progress);
    p.mesh.material.map = originalVisual(p.name, frame).map;
    p.mesh.userData.originalFrame = frame;
    p.mesh.position.set(
      Math.round(p.x / 65536),
      Math.round(H - p.y / 65536),
      36,
    );
  }
}
const nativeParticles = [];
function spawnNativeParticleRequest(request) {
  if (!request || nativeParticles.length >= 64) return;
  const body = nativeParticleRequest(request),
    name = nativeSpriteIds.sprites[body.sprite]?.name;
  if (!name) return;
  const mesh = createOriginalVisual(name);
  if (!mesh) return;
  mesh.scale.x = body.mirror ? -1 : 1;
  mesh.position.set(
    Math.round(body.x / 65536),
    Math.round(H - body.y / 65536),
    35,
  );
  group.add(mesh);
  addNativeParticle(nativeParticles, { ...body, name, mesh });
}

function spawnNativeParticle(name, x, y, vx, vy, step) {
  if (nativeParticles.length >= 64) return;
  const mesh = createOriginalVisual(name);
  if (!mesh) return;
  mesh.position.set(Math.round(x), Math.round(y), 35);
  group.add(mesh);
  addNativeParticle(nativeParticles, {
    mesh,
    name,
    x: Math.round(x * 65536),
    y: Math.round((H - y) * 65536),
    vx: vx | 0,
    vy: vy | 0,
    ax: 0,
    ay: 0,
    progress: 0,
    end: 65536,
    step: step | 0,
  });
}
function updateNativeParticles() {
  for (const p of stepNativeParticles(nativeParticles)) dispose(p.mesh);
  for (const p of nativeParticles) {
    const art = originalVisual(p.name);
    const index = nativeSpriteFrame(art.count, art.flags, p.progress);
    p.mesh.material.map = originalVisual(p.name, index).map;
    p.mesh.userData.originalFrame = index;
    p.mesh.position.set(
      Math.round(p.x / 65536),
      Math.round(H - p.y / 65536),
      35,
    );
  }
}
function emitProjectileTrail(p) {
  const trail = p.nativeTrail;
  if (!trail) return;
  const [id, rate, speed, bubbles] = trail.fields;
  const inWater = p.y < waterLevel;
  // 004E44A0 accumulates source record rates in 16.16, independently of
  // rendering. The browser supplies the water and resting-state predicates.
  trail.progress =
    (trail.progress +
      Math.trunc(((inWater ? bubbles : rate) << 16) / (inWater ? 200 : 25))) |
    0;
  while (trail.progress > 65535) {
    trail.progress -= 65536;
    if (inWater) {
      spawnWaterBubble(
        p.x,
        p.y,
        0,
        ((matchRandom.visualUint() >>> 16) % 3) + 1,
      );
    } else if (id && !p.sleeping) {
      const vy = (matchRandom.visualUint() & 65535) - 32768;
      const vx = (matchRandom.visualUint() & 65535) - 32768;
      const name = nativeSpriteIds.sprites[id]?.name;
      if (name)
        spawnNativeParticle(
          name,
          p.x,
          p.y,
          vx,
          vy,
          Math.trunc(Math.imul(speed, 0x147a) / 100),
        );
    }
  }
}
const originalEffects = [];
const waterBubbles = [];
let bubbleSeed = 42;
function spawnWaterBubble(x, y, facing, size) {
  if (waterBubbles.length >= 96 || y > waterLevel) return;
  const name = `water/bubble${size}`;
  const mesh = createOriginalVisual(name);
  if (!mesh) return;
  mesh.position.set(Math.round(x), Math.round(y), 46);
  group.add(mesh);
  waterBubbles.push({
    mesh,
    name,
    state: nativeBubble(
      Math.round(x * 65536),
      Math.round((H - y) * 65536),
      facing * 0x30000,
      0,
      size,
    ),
  });
}
function stepWaterBubbles() {
  for (let i = waterBubbles.length - 1; i >= 0; i--) {
    const bubble = waterBubbles[i];
    const result = nativeBubbleTick(
      bubble.state,
      bubbleSeed,
      Math.floor(H - waterLevel),
    );
    bubbleSeed = result.seed;
    if (!result.alive) {
      dispose(bubble.mesh);
      waterBubbles.splice(i, 1);
      continue;
    }
    bubble.state = result.bubble;
    const art = originalVisual(bubble.name);
    const index = nativeSpriteFrame(
      art.count,
      art.flags,
      bubble.state.progress,
    );
    bubble.mesh.material.map = originalVisual(bubble.name, index).map;
    bubble.mesh.userData.originalFrame = index;
    bubble.mesh.position.set(
      Math.round(bubble.state.x / 65536),
      Math.round(H - bubble.state.y / 65536),
      46,
    );
  }
}

function impactFlash(x, y, name = "expow") {
  const mesh = createOriginalVisual(name);
  if (!mesh) return;
  mesh.position.set(Math.round(x), Math.round(y), 45);
  group.add(mesh);
  originalEffects.push({ mesh, name, age: 0 });
}
function stepOriginalEffects(dt) {
  for (let i = originalEffects.length - 1; i >= 0; i--) {
    const effect = originalEffects[i];
    effect.age += dt;
    const frame = originalVisual(effect.name);
    const index = Math.floor(effect.age * frame.rate);
    if (index >= frame.count) {
      dispose(effect.mesh);
      originalEffects.splice(i, 1);
    } else effect.mesh.material.map = originalVisual(effect.name, index).map;
  }
}
function damageLabel(w, n, direction = 0) {
  const now = performance.now();
  if (
    typeof n === "number" &&
    w.damageNotice?.el.isConnected &&
    now < w.damageNotice.until
  ) {
    w.damageNotice.total += n;
    w.damageNotice.until = now + 220;
    w.damageNotice.el.textContent = `${direction < 0 ? "←" : direction > 0 ? "→" : ""}−${w.damageNotice.total}`;
    return;
  }
  const p = screen(w.x, w.y + 30),
    el = document.createElement("span");
  el.className = "damage-number";
  if (typeof n === "number")
    w.damageNotice = { el, total: n, until: now + 220 };
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
  if (!w.ground && !double && !(w.groundGrace > 0)) {
    if (w.vy < 0) w.jumpQueued = { kind, until: jumpClock + 0.12 };
    return;
  }
  w.groundGrace = 0;
  w.jumpQueued = null;
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
  startOriginalJump(w, kind === "backflip" || (kind === "up" && double));
  lastJump = { kind: double ? null : kind, time: jumpClock };
  sfx("jump");
}
function startAiTurn() {
  const w = worms[current];
  const aiAlive = worms.filter((t) => t.team === 1 && t.hp > 0).length;
  const playerAlive = worms.filter((t) => t.team === 0 && t.hp > 0).length;
  if (displayAmmo(utilityAmmo[1]?.freeze ?? 0) > 0 && aiAlive < playerAlive) {
    utilityAmmo[1].freeze = spendAmmo(utilityAmmo[1].freeze);
    freezeTeam(worms, 1);
    sfx("freeze");
    phase = "settle";
    retreat = 0;
    shotWait = 0;
    move = 0;
    $("#status").textContent =
      "The computer freezes its squad for protection. Your turn is next.";
    updateUI();
    return;
  }
  const reposition = planMove({
    terrain,
    me: w,
    waterLevel,
    difficulty,
    crate,
    worms,
    random: logicRandom,
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
    delays: weaponDelays[1],
    fuse: 2,
    bounce: 0.55,
    gravityScale,
    blastScale,
    random: logicRandom,
  });
  lastAiPlanMs = performance.now() - started;
  if (!plan) {
    time = 0;
    aiWait = Infinity;
    return;
  }
  const chosen = plan;
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
  chargeFixed = 0;
  aiWait = Infinity;
  updateSliders();
  $("#status").textContent =
    `Computer lines up the ${WEAPONS[weapon].label.toLowerCase()}…`;
}
function step(dt) {
  if (menu.open || document.hidden) { stopBurstSound(); stopProjectileSound(); return; }
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
  nativeCamera.beginFrame();
  selectionTick = (selectionTick + 1) | 0;
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
      chargeFixed = nativeChargeTick(1, chargeFixed).power;
      power = (chargeFixed / 65536) * 100;
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
      w.moving =
        aiRetreatDirection !== 0 &&
        walkWorm(w, terrain, aiRetreatDirection, dt);
    }
  }
  for (const w of worms) {
    stepOriginalSight(
      w,
      weapon,
      angle,
      w === worms[current] &&
        phase === "aim" &&
        w.hp > 0 &&
        !w.frozen &&
        !targetUtility &&
        !rope.attached &&
        !jetpack.active,
    );
    stepOriginalWalking(w);
    w.groundGrace = w.ground ? 0.08 : Math.max(0, (w.groundGrace || 0) - dt);
    w.landing = Math.max(0, (w.landing || 0) - dt);
    stepOriginalLanding(w);
    stepOriginalJump(w);
    stepOriginalParachute(w);
    w.hurt = Math.max(0, w.hurt - dt);
    w.recoil = Math.max(0, w.recoil - dt);
    if (w.dying > 0) {
      if (w.drowned) {
        w.y -= 24 * dt;
        if (stepOriginalDrowning(w))
          spawnWaterBubble(
            w.x + w.facing * 3,
            w.y + 5,
            w.facing,
            (matchRandom.visualUint() & 3) + 1,
          );
      }
      if (w.deathPending && !w.drowned) {
        if (!w.originalDeath) startOriginalDeath(w);
        w.dying = stepOriginalDeath(w, () => matchRandom.visualUint()) ? 0 : 1;
        if (w.originalDeathVoice && sound) {
          audio ??= new (window.AudioContext || window.webkitAudioContext)();
          audio.resume();
          playNativeDeathVoice(audio, w.originalDeathVoice);
        }
      } else w.dying = Math.max(0, w.dying - dt);
      if (w.dying === 0 && w.deathPending) {
        w.deathPending = false;
        explode(w.x, w.y - 10, "death");
        spawnDeathSmoke(w);
        const grave = createOriginalGrave(w);
        if (grave) {
          graves.push(grave);
          group.add(grave.mesh);
        }
      }
    }
    w.g.visible = w.hp > 0 || w.deathPending || w.dying > 0;
    if ((w.hp <= 0 && !w.deathPending) || w.dying > 0) continue;
    if (w.originalTeleport) {
      const teleport = stepOriginalTeleport(w);
      if (teleport?.relocate) queueWormCamera(w);
      continue;
    }
    if (w.originalFirePunch && !w.originalHurt && !w.frozen) {
      const result = stepNativeFirePunchFlight(w, {
        height:H, waterLevel, gravityScale, frame:matchRandom.frame,
        random:()=>matchRandom.logicUint(),
      }, (x,y)=>bodyBlocked(terrain,x,y)?1:0,
      w.originalFirePunch.player.current.id, nativeHitscanWeapon("firepunch").record);
      updateOriginalFirePunch(w,result.calls);
      dispatchFirePunchCalls(w,result.calls);
      if (result.finished) {
        w.originalFirePunch = null;
        startOriginalRecoil(w,"firepunch",angle,matchRandom.frame);
        if (pendingFire?.worm === w) pendingFire.stage = "firepunch-recoil";
      }
      continue;
    }
    if (w.originalRecovery) {
      for (const call of stepOriginalRecovery(w)) {
        if (call.operation === "sound" && sound) {
          audio ??= new (window.AudioContext || window.webkitAudioContext)();
          w.nativeHitVoicePlayback = playNativeRecoverySound(
            audio,
            call.request,
            w.nativeHitVoicePlayback,
          );
        }
        if (call.operation === "state") {
          w.hurt = 0;
          w.knocked = false;
          w.nativeHurtBody = null;
        }
      }
      continue;
    }
    let result = { fallDamage: 0 };
    if (w === worms[current] && jetpack.active) {
      stepJetpack(w, dt);
    } else if (w === worms[current] && rope.attached) {
      stepRope(w, dt);
    } else {
      if (w === worms[current] && parachuteArmed && !w.ground && w.vy < -240) {
        parachuteArmed = false;
        utilityAmmo[team].parachute = spendAmmo(utilityAmmo[team].parachute);
        startOriginalParachute(w);
        w.vy = Math.max(w.vy, -70);
        $("#status").textContent = `${w.name}'s parachute deploys.`;
        updateUI();
      }
      // Preserve the existing browser fall-speed limit throughout deployment;
      // the original body-force/drag transition is a separate physics port.
      if (w.originalParachute) w.vy = Math.max(w.vy, -70);
      if (w.originalHurt && !w.frozen) {
        result = stepNativeHurtFlight(
          w,
          {
            height: H,
            waterLevel,
            gravityScale,
            frame: matchRandom.frame,
            index: worms.indexOf(w),
            random: () => matchRandom.logicUint(),
            collisionBody: (hit) =>
              hit >= 2
                ? nativeWormContactBody(worms[hit - 2], H)
                : { type: 1, vx: 0, vy: 0 },
            updateCollisionBody: (hit, body) => {
              if (hit >= 2) applyNativeWormContact(worms[hit - 2], body);
            },
          },
          (x, y, body) =>
            nativeSceneCollision(w, body, x, y, terrain, worms, H),
        );
        for (const call of result.events) {
          if (call.receiverHit >= 2) {
            const target = worms[call.receiverHit - 2];
            if (call.operation === "state") {
              startOriginalHurt(target, call.target);
              target.ground = false;
              target.knocked = true;
              target.hurt = Math.max(target.hurt, 1.4);
            }
            if (call.operation === "voice" && sound) {
              audio ??= new (window.AudioContext || window.webkitAudioContext)();
              target.nativeHitVoicePlayback = playNativeHitVoice(audio,
                { index: call.slot }, target.nativeHitVoicePlayback);
            }
            continue;
          }
          if (call.operation === "health") injure(w, call.request[0], 0, true);
          if (call.operation === "particle")
            spawnNativeParticleRequest(call.request);
          if (call.operation === "voice" && sound) {
            audio ??= new (window.AudioContext || window.webkitAudioContext)();
            w.nativeHitVoicePlayback = playNativeHitVoice(
              audio,
              { index: call.slot },
              w.nativeHitVoicePlayback,
            );
          }
          if (call.operation === "state") {
            if (call.target === 0x76) {
              const calls = startOriginalRecovery(
                w,
                call.previous,
                result.body.maxVy,
                result.body.field250,
                () => matchRandom.logicUint(),
              );
              for (const event of calls)
                if (event.operation === "sound" && sound) {
                  audio ??= new (
                    window.AudioContext || window.webkitAudioContext
                  )();
                  w.nativeHitVoicePlayback = playNativeRecoverySound(
                    audio,
                    event.request,
                    w.nativeHitVoicePlayback,
                  );
                }
              w.nativeHurtBody = null;
              w.hurt = 0;
              w.knocked = false;
            } else if (call.target === 0x65) {
              w.originalHurt = null;
              w.nativeHurtBody = null;
              w.hurt = 0;
              w.knocked = false;
            } else startOriginalHurt(w, call.target);
          }
        }
      } else result = stepWorm(w, terrain, dt, gravityScale);
      if (w.originalParachute) w.vy = Math.max(w.vy, -70);
    }
    if (result.landed && w.ground && !w.landing) {
      w.landing = 0.16;
      const landingSound = startOriginalLanding(
        w,
        result.landingSpeed,
        w.originalParachute ? 0x7d : 0x65,
      );
      w.originalParachute = null;
      if (landingSound && sound) {
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        audio.resume();
        playNativeLandingSound(audio, landingSound);
      } else if (!landingSound) sfx("land");
    }
    if (result.fallDamage) injure(w, result.fallDamage);
    if (
      w === worms[current] &&
      w.ground &&
      w.jumpQueued &&
      jumpClock <= w.jumpQueued.until &&
      !result.fallDamage
    )
      jump(w.jumpQueued.kind);
    if (w.jumpQueued && jumpClock > w.jumpQueued.until) w.jumpQueued = null;
    if (w.y - 10 < waterLevel || w.x < -30 || w.x > W + 30) {
      w.hp = 0;
      w.deathPending = false;
      w.originalParachute = null;
      w.drowned = true;
      w.dying = 0.65;
      w.y = Math.min(w.y, waterLevel - 8);
      startOriginalDrowning(w);
      w.hurt = 0.65;
      slowMo = Math.max(slowMo, 0.5);

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
    } else if (w.deathPending && w.ground && Math.abs(w.vx) < 2) {
      startOriginalDeath(w);
      w.dying = 1;
    }
  }
  for (let i = graves.length - 1; i >= 0; i--) {
    if (!stepOriginalGrave(graves[i], terrain, dt, waterLevel, gravityScale)) {
      dispose(graves[i].mesh);
      graves.splice(i, 1);
    } else {
      const grave = graves[i];
      for (let n = 0; n < grave.bubbleRequests; n++)
        spawnWaterBubble(
          grave.x,
          grave.y,
          0,
          (matchRandom.visualUint() & 3) + 1,
        );
    }
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
  const mineCameraRequests = [];
  for (let i = phase === "over" ? -1 : mines.length - 1; i >= 0; i--) {
    const mine = mines[i];
    const waterSound = (body, skim) => {
      const { sound: request } = nativeWaterSound(body, skim);
      if (!sound || !request) return;
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      playNativeWaterSound(audio, request);
    };
    const collide = (x, y, body) => nativeSceneCollision(mine, body, x / 65536, H - y / 65536, terrain, worms, H);
    mine.nativeBody = nativeSimpleBodyTick(mine.nativeBody, {
      frame: matchRandom.frame, index: i, waterY: Math.floor(H - waterLevel),
      gravity: Math.round(0x3d70 * gravityScale), wind: Math.round(wind / 2500 * 65536),
    }, {
      awake: nativeBodyAwake, collide,
      skim: body => waterSound(body, true),
      waterChanged: body => waterSound(body, false),
      bounce: (body, hit, side) => {
        const other = hit >= 2 ? nativeWormContactBody(worms[hit - 2], H) : {type: 1, vx: 0, vy: 0};
        nativeMineContact(body, mine.nativeTimer, side, 0, {
          sound: request => {
            if (!sound) return;
            audio ??= new (window.AudioContext || window.webkitAudioContext)();
            audio.resume();
            mine.impactPlayback = playNativeProjectileContactSound(audio, request, mine.impactPlayback);
          },
          receive: side => {
            if (!other.worm) return 0;
            const response = nativeWormReceiver(other, body, side, {});
            Object.assign(body, response.incoming);
            Object.assign(other, response.receiver);
            if (response.result) applyNativeWormContact(worms[hit - 2], other);
            return response.result;
          },
          bounce: side => {
            const response = nativeSimpleBounce(body, other, side, (x, y) => collide(x, y, body));
            Object.assign(body, response.body);
            if (hit >= 2) applyNativeWormContact(worms[hit - 2], {...other, ...response.other});
          },
        });
      },
    });
    mine.x = mine.nativeBody.x / 65536;
    mine.y = H - mine.nativeBody.y / 65536;
    mine.mesh.position.set(mine.x, mine.y, 18);
    const proximity = (radius) => {
      const candidates = worms.filter((w) => w.hp > 0).map((w) => ({
        x: Math.round(w.x * 65536), y: Math.round((H - w.y) * 65536),
        type: nativeWormCollisionType(nativeWormState(w)),
      }));
      return nativeMineProximity({
        x: Math.round(mine.x * 65536), y: Math.round((H - mine.y) * 65536), mask: NATIVE_MINE_MASK,
      }, radius, candidates) >= 0;
    };
    const result = nativeMineTimer(mine.nativeTimer, {
      vx: mine.nativeBody.vx, vy: mine.nativeBody.vy, awake: nativeBodyAwake(mine.nativeBody), submerged: mine.nativeBody.submerged,
      frame: matchRandom.frame, friction: NATIVE_MINE_FRICTION,
    }, proximity);
    mine.nativeTimer = result.body;
    mine.arm = result.body.arm / 1000;
    for (const call of result.calls) {
      if (call.operation === "friction") mine.nativeBody.tangent = call.request[0];
      if (call.operation === "complex") mine.nativeBody.complex = call.request[0];
    }
    if (sound) for (const call of result.calls) {
      if (call.operation !== "sound") continue;
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      playNativeMineSound(audio, call.request);
    }
    if (!result.expired) {
      if ((mine.nativeBody.y >> 16) >= nativeProjectileDepth(Math.floor(H - waterLevel))) {
        removeMine(i);
        continue;
      }
      const cameraRequest = nativeMineCameraRequest(mine.nativeBody, mine.nativeTimer);
      if (cameraRequest) {
        nativeRenderOrder.promote(mine.nativeOrderId);
        mineCameraRequests.push(cameraRequest);
      }
      const water = nativeMineWater({
        ...mine.nativeWater, flags: mine.nativeBody.flags, forceBlast: mine.nativeTimer.forceBlast,
      }, {
        ...mine.nativeBody, awake: nativeBodyAwake(mine.nativeBody),
      }, () => matchRandom.visualUint());
      const { flags, forceBlast, ...waterState } = water.body;
      mine.nativeWater = waterState;
      mine.nativeBody.flags = flags;
      mine.nativeTimer.forceBlast = forceBlast;
      for (const call of water.calls) {
        if (call.operation === "bubble") {
          const [x, y, , , size] = call.request;
          spawnWaterBubble(x / 65536, H - y / 65536, 0, size);
        } else if (call.operation === "sound" && sound) {
          audio ??= new (window.AudioContext || window.webkitAudioContext)();
          audio.resume();
          playNativeWaterSound(audio, call.request);
        }
      }
      for (const call of nativeMineStateEvents(mine.nativeBody, mine.nativeTimer.damage)) {
        if (call.operation === "blast") explode(mine.x, mine.y, "mine", mine.owner, call.request);
        else if (call.operation === "delete") {
          removeMine(i);
        }
      }
      continue;
    }
    const expiry = nativeMineExpiry(mine.nativeTimer, {
      x: Math.round(mine.x * 65536), y: Math.round((H - mine.y) * 65536), dudsEnabled: true,
    }, mineDudPool, {
      logic: () => matchRandom.logicUint(), visual: () => matchRandom.visualUint(), proximity,
    });
    mine.nativeTimer = expiry.body;
    for (const call of expiry.calls) {
      if (call.operation === "blast") explode(mine.x, mine.y, "mine", mine.owner, call.request);
      else if (call.operation === "smoke") spawnOriginalSmoke([call.request]);
      else if (call.operation === "sound" && sound) {
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        audio.resume();
        playNativeMineSound(audio, call.request);
      } else if (call.operation === "delete") {
        removeMine(i);
      }
    }
  }
  if (pendingFire) {
    const pending = pendingFire, w = pending.worm;
    if (phase !== "aim" || w !== worms[current] || w.hp <= 0 || w.knocked || w.frozen || w.hurt > 0.35) {
      w.originalPreparation = null;
      w.originalAxe = null;
      if (w.originalFirePunch) { w.originalFirePunch = null; w.nativeFlight = null; }
      stopBurstSound(pending.burst);
      pendingFire = null;
      if ((pending.burst?.spent || pending.spent) && phase === "aim") finishAction("Firing interrupted. Retreat!");
    } else if (pending.stage === "firepunch") {
      // Native body/state tick runs in the worm loop above.
    } else if (pending.stage === "firepunch-recoil") {
      if (!w.originalRecoil) { pendingFire = null; finishAction("Fire punch complete. Retreat!"); }
    } else if (pending.stage === "axe") {
      for (const call of stepOriginalAxe(w, nativeHitscanWeapon("axe").record["0x70"], H)) {
        if (call.operation === "sound") sfx("axerelease");
        if (call.operation === "area") {
          const targets = [...nativeWormHitscanBodies(worms, w, H), ...nativeMineHitBodies(mines)].sort((a,b) => a.type-b.type);
          applyNativeAreaRequest(targets, call.request);
        }
        if (call.operation === "state") {
          pendingFire = null;
          finishAction("Axe swing complete. Retreat!");
        }
      }
    } else if (pending.stage === "recoil") {
      const config = nativeHitscanWeapon(pending.kind);
      const result = nativeRecoilTick(config.record, pending.recoilDelay, 65536, 0);
      pending.recoilDelay = result.delay;
      if (result.target !== null) pending.stage = "burst";
    } else if (pending.stage === "burst") {
      const result = nativeBurstTick(pending.burst);
      pending.burst = result.state;
      if (result.target === 0x69) {
        pending.burst.delay = nativeHitscanWeapon(pending.kind).interval;
        beginWeaponPreparation(w, pending.kind, pending.angle);
        pending.stage = "prepare";
      } else if (result.target !== null) {
        stopBurstSound(pending.burst);
        pendingFire = null;
        finishAction(`${WEAPONS[pending.kind].label} burst complete. Retreat!`);
      }
    } else {
      const result = stepOriginalPreparation(w);
      if (result?.sounds.includes(0x51)) sfx("shotgunreload");
      if (result?.released) {
        pendingFire = null;
        angle = pending.angle;
        if (pending.kind === "dragonball") fireDragonBall(true);
        else if (pending.kind === "firepunch") firePunch(true);
        else if (pending.kind === "axe") fireAxe(true);
        else if (pending.kind === "prod") fireProd(true);
        else if (pending.kind === "bat") fireBat(true);
        else fireBulletWeapon(true, pending.kind ?? "shotgun", pending.burst);
      }
    }
  }
  if (phase === "aim") updateUI();
  if (projectile?.nativeDragonBall) stepDragonBall();
  else if (projectile) {
    const p = projectile;
    if (sound && p.nativeTimer?.loopSound && !p.nativeFusePlayback) {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      p.nativeFusePlayback = playNativeProjectileFuse(audio, p.nativeFuseSound);
    }
    let nativeContact = null;
    const ox = p.x,
      oy = p.y;
    if (!p.stuck && p.sleeping && !terrain.solid(p.x, p.y - 4))
      p.sleeping = false;
    if (p.attached) {
      p.x = p.attached.w.x + p.attached.dx;
      p.y = p.attached.w.y + p.attached.dy;
    }
    if (!p.sleeping && !p.stuck) {
      if (p.nativeBody) {
        nativeContact = stepNativeProjectile(
          p,
          {
            height: H,
            solid: (x, y) => terrain.solid(x, H - y),
            waterLevel,
            wind,
            gravityScale,
            frame: matchRandom.frame,
            random: () => matchRandom.logicUint(),
            collisionBody: (hit) => hit >= 2 ? nativeWormContactBody(worms[hit - 2], H) : { type: 1, vx: 0, vy: 0 },
            updateCollisionBody: (hit, body) => {
              if (hit >= 2) applyNativeWormContact(worms[hit - 2], body);
            },
          },
          (x, y, body) => {
            return nativeProjectileCollision(p, x, y, terrain, worms, H, body);
          },
        );
        if (sound && nativeContact.sounds.length) {
          audio ??= new (window.AudioContext || window.webkitAudioContext)();
          audio.resume();
          for (const event of nativeContact.sounds)
            playNativeWaterSound(audio, event);
        }
        if (sound) for (const event of nativeContact.events) {
          if (event.operation !== "sound") continue;
          audio ??= new (window.AudioContext || window.webkitAudioContext)();
          if (event.timer) {
            if (event.request[0] === 104) playOriginalSound(audio, "holy", () => {}, event.request[3] / 65536);
          } else p.nativeContactPlayback = playNativeProjectileContactSound(audio, event.request, p.nativeContactPlayback);
        }
      } else integrate(p, dt, WEAPONS[p.kind].wind ? wind : 0, gravityScale);
    }
    p.age += dt;
    emitProjectileTrail(p);
    if (
      WEAPONS[p.kind].timed &&
      (p.nativeTimer ? p.nativeTimer.remaining > 0 && p.nativeTimer.remaining < 1500 : p.fuse - p.age < 1.5) &&
      Math.floor(p.age * 4) !== Math.floor((p.age - dt) * 4)
    )
      sfx("fuse");
    let hit = p.blocked;
    p.blocked = false;
    let hitWorm = nativeContact?.hit >= 2 ? worms[nativeContact.hit - 2] : null;
    hit ||= Boolean(nativeContact?.hit);
    if (!hit && !p.nativeBody) {
      const contact = sweepProjectile({ x: ox, y: oy }, p, (x, y) => {
        if (terrain.solid(x, y)) return 1;
        const index = worms.findIndex(
          (w, i) =>
            w.hp > 0 && (i !== p.owner || p.age > 0.25) && hitsWorm(w, x, y, 3),
        );
        return index < 0 ? 0 : index + 2;
      });
      p.x = contact.x;
      p.y = contact.y;
      hit = Boolean(contact.hit);
      if (contact.hit >= 2) hitWorm = worms[contact.hit - 2];
    }
    let boom =
      (p.nativeBody ? Boolean(nativeContact?.detonate) : (!WEAPONS[p.kind].timed && hit)) ||
      (!p.nativeBody && WEAPONS[p.kind].timed && p.age >= p.fuse);
    if (hit && p.kind === "sticky" && !p.stuck) {
      p.stuck = true;
      p.vx = 0;
      p.vy = 0;
      const w =
        hitWorm ??
        worms.find(
          (w, i) =>
            w.hp > 0 &&
            (i !== p.owner || p.age > 0.25) &&
            hitsWorm(w, p.x, p.y, 3),
        );
      if (w) p.attached = { w, dx: p.x - w.x, dy: p.y - w.y };
    }
    if (hit && WEAPONS[p.kind].bounces && !p.nativeBody) {
      const victim =
        hitWorm ??
        worms.find(
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
      if (Math.hypot(p.vx, p.vy) > 30) sfx("bounce");
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
    if (
      !updateOriginalProjectile(
        p.mesh,
        p.kind,
        p.vx,
        p.vy,
        p.age,
        p.y < waterLevel,
        Boolean(p.nativeGuidance?.initialized),
        p.nativeRender,
      )
    )
      p.mesh.rotation.z =
        p.kind === "rocket" ? Math.atan2(p.vy, p.vx) : p.age * 5;

    if (!p.nativeTimer?.loopSound) stopProjectileSound(p);
    if (
      boom ||
      (p.nativeBody ? p.nativeRemoved : (
        p.y < waterLevel || p.x < -50 || p.x > W + 50 || p.age > 12
      ))
    ) {
      if (boom && p.y > waterLevel) {
        explodeProjectile(p);
      }
      stopProjectileSound(p);
      releaseProjectileMesh(p.mesh);
      projectile = null;
      phase = "settle";
      shotWait = 0;
      updateUI();
    }
  }
  stepAirstrikes();
  stepBombs(dt);
  stepFires(dt);
  if (crate) crate.artAge = (crate.artAge || 0) + dt;
  for (const hazard of hazards) {
    hazard.artAge = (hazard.artAge || 0) + dt;
    updateOriginalObject(hazard.mesh, "oildrum1", hazard.artAge);
  }
  if (crate?.falling) {
    crate.vy -= 220 * dt;
    crate.y += crate.vy * dt;
    crate.mesh.position.set(crate.x, crate.y, 18);
    if (crate.y <= crate.targetY) {
      crate.y = crate.targetY;
      crate.falling = false;
      crate.artAge = 0;
      crate.vy = 0;
      announce("SUPPLY CRATE LANDED");
    }
  }
  if (phase === "settle") {
    const settled =
      !projectile &&
      bombs.length === 0 &&
      airstrikes.length === 0 &&
      retreat <= 0 &&
      worms.every(
        (w) =>
          !w.deathPending &&
          !w.originalTeleport &&
          !w.originalJetpack &&
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
    if (p.mesh.userData.originalTerrainDebris) {
      p.age += dt;
      emitProjectileTrail(p);
      updateTerrainDebris(p.mesh, p.age);
    } else p.mesh.scale.setScalar(Math.max(0.01, (p.life / p.max) * p.size));
    if (p.life <= 0) {
      releaseParticle(p.mesh);
      particles.splice(i, 1);
    }
  }
  stepOriginalEffects(dt);
  updateNativeParticles();
  updateOriginalDebris();
  updateOriginalSmoke();
  stepWaterBubbles();
  const trackedProjectiles = bombs.filter((b) => b.nativeBody);
  if (projectile?.nativeBody) trackedProjectiles.push(projectile);
  const teleportTracking = worms.some((w) => w.originalTeleport) || Boolean(projectile?.nativeDragonBall);
  if (!nativeCameraFraming && (trackedProjectiles.length || mineCameraRequests.length || teleportTracking || pendingWormCamera.length)) {
    nativeCamera.reset();
    nativeCameraFraming = new NativeCameraFraming(
      Math.round(cameraX * 65536), Math.round((H - cameraY) * 65536), 1000 * 65536,
    );
  }
  for (const tracked of trackedProjectiles) {
    nativeCamera.offer(...nativeProjectileCameraRequest(tracked.nativeBody, [0, W * 65536, -256 * 65536]));
  }
  for (const request of pendingWormCamera) nativeCamera.offer(...request);
  for (const request of mineCameraRequests) nativeCamera.offer(...request);
  pendingWormCamera = [];
  if (nativeCameraFraming && (airstrikes.length || trackedProjectiles.length || mineCameraRequests.length || teleportTracking)) {
    const aspect = arena.clientWidth / arena.clientHeight;
    const viewport = [Math.floor(Math.min(W, H * aspect)), Math.floor(Math.min(H, W / aspect))];
    const position = nativeCameraFraming.track(nativeCamera, matchRandom.frame, viewport, [0, -256 * 65536, W * 65536, H * 65536]);
    nativeCameraFocus = { x: position[0] / 65536, y: H - position[1] / 65536 };
  } else {
    nativeCameraFocus = null;
    nativeCameraFraming = null;
  }
  matchRandom.finishFrame();
}
function screen(x, y) {
  return {
    x: ((x - view.x) / view.w) * renderer.domElement.clientWidth,
    y: ((view.y + view.h - y) / view.h) * renderer.domElement.clientHeight,
  };
}
function resize() {
  const stageAspect = terrain?.pixels ? W / H : 16 / 9;
  const stageWidth = Math.max(
    1,
    Math.floor(
      Math.min(
        battlefieldFrame.clientWidth,
        battlefieldFrame.clientHeight * stageAspect,
      ),
    ),
  );
  const portrait =
    !overview && battlefieldFrame.clientHeight > battlefieldFrame.clientWidth;
  const fill = portrait || (!coarsePointer && !overview);
  arena.style.width = `${fill ? battlefieldFrame.clientWidth : stageWidth}px`;
  arena.style.height = `${fill ? battlefieldFrame.clientHeight : Math.floor(stageWidth / stageAspect)}px`;
  arena.classList.toggle("portrait-camera", portrait);
  const pixels = pixelViewport(arena.clientWidth, arena.clientHeight, coarsePointer ? 480 : 960);
  renderer.setSize(pixels.width, pixels.height, false);
  renderer.domElement.style.width = `${pixels.width * pixels.scale}px`;
  renderer.domElement.style.height = `${pixels.height * pixels.scale}px`;
  renderer.domElement.dataset.pixelScale = pixels.scale;
  const correction = 1;

  for (const w of worms) {
    w.g.scale.x = correction;
    w.visualSize = Math.max(70, (31 * H) / arena.clientHeight);
  }
}
new ResizeObserver(() => requestAnimationFrame(resize)).observe(
  battlefieldFrame,
);
function frame(now) {
  requestAnimationFrame(frame);
  const frameDt = Math.min((now - last) / 1000, 0.1);
  const slow = slowMo > 0 && !reducedMotion;
  if (slowMo > 0) slowMo = Math.max(0, slowMo - frameDt);
  accumulator += frameDt * (slow ? 0.35 : 1);
  last = now;
  arena.classList.toggle("slow-mo", slow);
  while (accumulator >= LOGIC_STEP_SECONDS) {
    step(LOGIC_STEP_SECONDS);
    accumulator -= LOGIC_STEP_SECONDS;
  }
  let camTarget = chooseCameraTarget({
    phase,
    projectile,
    worms,
    active: worms[current],
  });
  const portrait = !overview && arena.clientHeight > arena.clientWidth;
  if (portrait || (!coarsePointer && !overview && phase === "aim")) {
    const focus =
      projectile ||
      worms
        .filter((w) => w.knocked && w.hp > 0)
        .sort((a, b) => Math.hypot(b.vx, b.vy) - Math.hypot(a.vx, a.vy))[0] ||
      worms[current];
    if (focus) camTarget = { zoom: 1, cx: focus.x, cy: focus.y + 110 };
  }
  if (nativeCameraFocus) camTarget = { zoom: 1, cx: nativeCameraFocus.x, cy: nativeCameraFocus.y };
  if (overview) camTarget = { zoom: 1, cx: W / 2, cy: H / 2 };
  if (cameraSnap || (nativeCameraFocus && !overview)) {
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
  const nextView = cameraView(
    cameraX,
    cameraY,
    cameraZoom,
    arena.clientWidth / arena.clientHeight,
    nativeCameraFocus && !overview ? H + 256 : H,
  );
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
  const markedTarget =
    WEAPONS[projectile?.kind]?.special === "homing" ? projectile.target : homingTarget;
  targetMarker.hidden =
    !markedTarget ||
    menu.open ||
    (phase !== "aim" && WEAPONS[projectile?.kind]?.special !== "homing");
  targetMarker.style.display = targetMarker.hidden ? "none" : "block";
  if (!targetMarker.hidden) {
    const p = screen(markedTarget.x, markedTarget.y);
    const markerTeam =
      WEAPONS[projectile?.kind]?.special === "homing"
        ? (worms[projectile.owner]?.team ?? team)
        : team;
    updateOriginalTarget(targetMarker, markerTeam, selectionTick);
    targetMarker.style.left = `${Math.round(p.x) - 30}px`;
    targetMarker.style.top = `${Math.round(p.y) - 30}px`;
  }
  updateAimHUD();
  updateHudPower(charging ? power : 0, weapon);
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

    const facing = w.facing;
    const moving = active && w.moving && w.ground;
    const panic =
      w.knocked ||
      (!w.ground && w.vy < -100) ||
      (projectile && Math.hypot(projectile.x - w.x, projectile.y - w.y) < 120);
    const pose =
      w.hurt > 0.35
        ? "hurt"
        : w.recoil > 0
          ? "recoil"
          : phase === "over" && w.hp > 0 && lastResult?.winner === w.team
            ? "victory"
            : panic
              ? "panic"
              : !w.ground
                ? w.vy > 0
                  ? "jump"
                  : "fall"
                : w.landing > 0
                  ? "land"
                  : moving
                    ? ["walk", "walk2", "walk3", "walk2"][
                        Math.floor(now / 110) % 4
                      ]
                    : active && phase === "aim"
                      ? "aim"
                      : Math.floor((now + w.x * 13) / 180) % 22 === 0
                        ? "blink"
                        : "idle";
    w.g.userData.pose = pose;
    const original = originalWormFrame(
      w,
      pose,
      matchRandom.frame,
      angle,
      weapon,
      active,
    );
    w.body.visible = Boolean(original);
    if (original) {
      w.body.material.map = original.map;
      // 004AFB00/00498890 center the canvas on the physics body. Preserve
      // one source pixel per world pixel on generated and authored terrain.
      w.body.scale.set(
        -(original.facing ?? facing) * original.map.image.width,
        original.map.image.height,
        1,
      );
      w.body.position.set(0, 0, 24);
      w.g.scale.x = 1;
      // Render queue004C3FA0 discards fractional body coordinates.
      w.renderY = Math.ceil(w.y);
      w.g.position.set(Math.floor(w.x), w.renderY, 15);
      w.g.userData.originalSprite = original.name;
      w.g.userData.originalFrame = original.index;
    }
    w.body.material.color.setHex(
      w.hurt > 0.75 && Math.floor(w.hurt * 14) % 2 ? 0xff806c : 0xffffff,
    );
    w.body.material.opacity =
      w.originalDeath || w.drowned || w.hp > 0 || (w.deathPending && !w.dying)
        ? 1
        : Math.min(1, w.dying * 1.4);
    if (w.hp <= 0 && w.dying > 0 && !w.drowned && !w.originalDeath) {
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
    w.rig.pivot.visible = false;
    updateOriginalWormLabel(w.label, w, active && phase !== "over", selectionTick);
    updateOriginalSelection(
      w.label,
      w.team,
      selectionTick,
      active && w.hp > 0 && phase !== "over",
    );
    w.label.classList.toggle("hurt", w.hurt > 0);
    w.shadow.visible = w.ground && w.hp > 0;
    const p = screen(w.x, w.renderY + (original ? 24 : spriteSize * 0.83 - 7));
    const visible = w.hp > 0 && w.x > view.x + 12 && w.x < view.x + view.w - 12;
    w.label.style.visibility = visible ? "visible" : "hidden";
    if (active) {
      const charge = $("#worm-charge"),
        cp = screen(w.x, w.renderY - 16);
      charge.style.left = `${Math.round(cp.x)}px`;
      charge.style.top = `${Math.round(cp.y)}px`;
    }
    if (w.hp > 0) {
      const width = w.labelW,
        height = w.labelH;
      p.x = Math.max(
        width / 2 + 4,
        Math.min(arena.clientWidth - width / 2 - 4, p.x),
      );
      // Labels are positioned by their bottom edge, so compare centers and half-heights.
      const topSafe = 64;
      const anchorX = p.x,
        anchorY = Math.max(topSafe + height, p.y);
      const overlaps = (x, y) =>
        labelBoxes.some(
          (b) =>
            Math.abs(b.x - x) < (b.width + width) / 2 + 5 &&
            Math.abs(b.y - (y - height / 2)) < (b.height + height) / 2 + 5,
        );
      p.x = anchorX;
      p.y = anchorY;
      let placed = false;
      // Keep labels above the character: first slide sideways around the aim
      // marker, then climb, and only use lower rows when the sky is crowded.
      for (const dy of [
        0,
        -height - 6,
        -2 * (height + 6),
        height + 6,
        2 * (height + 6),
        3 * (height + 6),
      ]) {
        for (const dx of [
          0,
          -width * 0.4,
          width * 0.4,
          -width * 0.8,
          width * 0.8,
        ]) {
          const x = Math.round(
            Math.max(
              width / 2 + 4,
              Math.min(arena.clientWidth - width / 2 - 4, anchorX + dx),
            ),
          );
          const y = Math.round(
            Math.max(
              topSafe + height,
              Math.min(arena.clientHeight - 26, anchorY + dy),
            ),
          );
          if (!overlaps(x, y)) {
            p.x = x;
            p.y = y;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      labelBoxes.push({ x: p.x, y: p.y - height / 2, width, height });
    }
    w.label.style.left = p.x + "px";
    w.label.style.top = p.y + "px";
  }
  if (crate) {
    crate.mesh.position.y = Math.round(crate.y);
    updateOriginalObject(
      crate.mesh,
      crateSprite(crate.kind, crate.falling),
      crate.artAge || 0,
    );
    if (crate.mesh.userData.beacon)
      crate.mesh.userData.beacon.rotation.y = now * 0.002;
  }
  for (const mine of mines) {
    const art = nativeMineArt(mine.nativeBody, mine.nativeTimer, nativeRenderOrder.orders[mine.nativeOrderId]);
    updateOriginalObject(mine.mesh, art.name, 0, art.progress);
    if (mine.mesh.userData.light)
      mine.mesh.userData.light.visible =
        mine.arm > 0 ? Math.floor(now / 160) % 2 === 0 : true;
  }
  if (phase === "break") {
    $("#status").textContent =
      `Round over. Next island in ${Math.ceil(breakTimer)}…`;
  }
  $("#turn-banner").classList.toggle("shown", bannerTime > 0 && !menu.open);
  const timerValue =
    retreat > 0 ? Math.ceil(retreat) : Math.max(0, Math.ceil(time));
  const timerState = `${timerValue}:${retreat > 0}`;
  if (timerState !== timerKey) {
    timerKey = timerState;
    updateOriginalTimer(timerValue, retreat > 0);
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
    updateOriginalBackdrop();
  }
  renderer.render(scene, camera);
}
function setWeapon(kind) {
  if (shotgunRemaining) return;
  homingTarget = null;
  if (WEAPONS[targetUtility]?.special === "homing") targetUtility = null;
  if (!WEAPONS[kind]) return;
  if (availableAmmo(ammo[team], kind) <= 0)
    kind =
      Object.keys(WEAPONS).find((k) => availableAmmo(ammo[team], k) > 0) ??
      "rocket";
  specialOpen = false;
  weapon = kind;
  teamWeapon[team] = kind;
  $("#grenade-settings").hidden = !WEAPONS[kind].timed;
  $("#airstrike-settings").hidden = WEAPONS[kind]?.special !== "airstrike";
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
    x = view.x + ((e.clientX - rect.left) / rect.width) * view.w,
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
    if (WEAPONS[weapon].timed && /^[1-5]$/.test(e.key)) {
      fuse = +e.key;
      $("#fuse").value = fuse;
    }
    if (WEAPONS[weapon].timed && ["+", "=", "-"].includes(e.key)) {
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
  stopBurstSound();
  stopProjectileSound();
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
  if (!sound) { stopBurstSound(); stopProjectileSound(); }
  if (!sound) for (const b of bombs) {
    b.nativeFusePlayback?.stop();
    b.nativeFusePlayback = null;
  }
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
if (coarsePointer) $("#fire small").textContent = "HOLD / RELEASE";
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
  "#map-layout",
  "#terrain-theme",
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
  configuredDelays = {};
  syncDelayControl();
  $("#format").value = preset.format;
  $("#weather").value = preset.weather;
  $("#modifier").value = preset.modifier;
  $("#turn-time").value = String(preset.turnTime);
  $("#retreat-time").value = String(preset.retreatTime);
  $("#sudden-death").value = preset.suddenDeath;
  syncMenuOptions();
  saveSettings();
});
for (const kind of Object.keys(WEAPON_SLOTS)) {
  const option = document.createElement("option");
  option.value = kind;
  option.textContent = WEAPONS[kind].label;
  $("#delay-weapon").append(option);
}
function syncDelayControl() {
  $("#weapon-delay").value = String(
    configuredDelays[$("#delay-weapon").value] ?? 0,
  );
}
$("#delay-weapon").addEventListener("change", syncDelayControl);
$("#weapon-delay").addEventListener("change", () => {
  configuredDelays[$("#delay-weapon").value] = +$("#weapon-delay").value;
  markSchemeCustom();
  saveSettings();
});
for (const folder of ["image", "mission"]) {
  const optgroup = document.createElement("optgroup");
  optgroup.label =
    folder === "image"
      ? "Armageddon maps"
      : "Armageddon mission / training terrain";
  for (const asset of originalMapCatalog.filter((a) =>
    a.id.startsWith(folder + "/"),
  ))
    optgroup.append(
      new Option(
        asset.id.split("/")[1].replace(".img", ""),
        "original:" + asset.id,
      ),
    );
  $("#map-layout").append(optgroup);
}
applySettings();
let decorationLoadVersion = 0;
async function prepareDecorations() {
  const version = ++decorationLoadVersion;
  $("#start").disabled = $("#daily").disabled = true;
  try {
    await originalAssets;
    await Promise.all([
      loadOriginalMap($("#map-layout").value),
      loadOriginalDecorations($("#terrain-theme").value),
      loadOriginalDecorations("forest"),
    ]);
    if (version !== decorationLoadVersion) return;
    $("#start").disabled = $("#daily").disabled = false;
  } catch (error) {
    originalArtError = error.message;
    console.error("Terrain decoration loading failed", error);
  }
}
$("#terrain-theme").addEventListener("change", prepareDecorations);
$("#map-layout").addEventListener("change", prepareDecorations);
async function bootCurrentArt() {
  try {
    await originalAssets;
    await prepareDecorations();
    if (originalArtError) throw new Error(originalArtError);
    syncMenuOptions(); updateRecordUI(); reset();
    menu.showModal(); resetMenuScroll(); updateUI(); resize(); prewarmShaders();
    last = performance.now();
    requestAnimationFrame(now => {
      frame(now);
      assetsReady = true;
      document.body.classList.remove("assets-loading");
      $("#asset-loading").remove();
    });
  } catch (error) {
    originalArtError = error.message;
    $("#asset-loading").textContent = "Game assets could not load. Reload to retry.";
    $("#asset-loading").setAttribute("role", "alert");
  }
}
bootCurrentArt();
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
  getState: () => !assetsReady ? { assetsReady, originalArtError } : ({
    assetsReady,
    originalArtError,
    mapLayout: terrain.layout,
    world: { width: W, height: H },
    terrainTheme: terrain.theme,
    terrainDecorations: terrain.decorations || [],
    backdropTheme: backdrop.userData.originalTheme,
    mapSeed: terrain.seed,
    random: matchRandom.snapshot(),
    logicStepMs: LOGIC_STEP_SECONDS * 1000,
    shotgunRemaining,
    preparing: pendingFire
      ? {
          weapon: pendingFire.kind ?? "shotgun",
          stage: pendingFire.stage,
          ordinal: pendingFire.burst?.ordinal,
          total: pendingFire.burst?.total,
          delay: pendingFire.worm.originalPreparation?.delay,
        }
      : null,
    homingTarget,
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
    graves: graves.map((g) => ({
      x: g.x,
      y: g.y,
      wet: g.wet,
      sprite: g.mesh.userData.originalSprite,
      frame: g.mesh.userData.originalFrame,
    })),
    waterBubbles: waterBubbles.map((b) => ({
      sprite: b.name,
      frame: b.mesh.userData.originalFrame,
      x: b.mesh.position.x,
      y: b.mesh.position.y,
    })),
    originalDebris: originalDebris.map((p) => ({
      x: p.x,
      y: p.y,
      sprite: "flame1",
      progress: p.progress,
    })),
    originalSmoke: originalSmoke.map((p) => ({
      sprite: p.name,
      frame: p.mesh.userData.originalFrame,
      x: p.mesh.position.x,
      y: p.mesh.position.y,
    })),
    nativeParticles: nativeParticles.map((p) => ({
      sprite: p.name,
      frame: p.mesh.userData.originalFrame,
      x: p.mesh.position.x,
      y: p.mesh.position.y,
    })),
    debrisSprites: particles
      .filter((p) => p.mesh.userData.originalTerrainDebris)
      .map((p) => ({
        theme: p.mesh.userData.terrainTheme,
        frame: p.mesh.userData.originalFrame,
      })),
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
    nativeCameraFocus,
    camera: {
      w: Math.round(view.w),
      h: Math.round(view.h),
      x: Math.round(view.x),
      y: Math.round(view.y),
      zoom: Math.round(view.zoom * 100) / 100,
    },
    crate: crate
      ? {
          x: crate.x,
          y: crate.y,
          kind: crate.kind,
          falling: crate.falling,
          sprite: crate.mesh.userData.originalSprite,
          frame: crate.mesh.userData.originalFrame,
        }
      : null,
    girders: girders.map((g) => ({
      sprite: g.original?.name,
      width: g.original?.width,
      height: g.original?.height,
      x: Math.round(g.cx),
      y: Math.round(g.cy),
      angle: g.angle,
    })),
    projectile: projectile
      ? {
          target: projectile.target,
          kind: projectile.kind,
          x: Math.round(projectile.x),
          y: Math.round(projectile.y),
          vx: Math.round(projectile.vx),
          vy: Math.round(projectile.vy),
          age: Math.round(projectile.age * 10) / 10,
        }
      : null,
    airstrikes: airstrikes.map(s => ({ x:s.body.x/65536, y:H-s.body.y/65536, remaining:s.body.count, sprite:s.mesh?.userData.originalSprite })),
    bombs: bombs.map((b) => ({
      x: Math.round(b.x),
      y: Math.round(b.y),
      kind: b.kind,
      fuse: b.nativeTimer ? b.nativeTimer.remaining / 1000 : Math.round(b.fuse * 10) / 10,
      nativeRepeat: b.nativeRepeat ?? null,
      nativeDamage: b.nativeDetonation?.damage ?? null,
      sprite: b.mesh.userData.originalSprite,
      frame: b.mesh.userData.originalFrame,
    })),
    fires: fires.map((f) => ({
      x: Math.round(f.x),
      y: Math.round(f.y),
      life: Math.round(f.life * 10) / 10,
      sprites: f.mesh.children.map((flame) => flame.userData.originalSprite),
    })),
    hazards: hazards.map((h) => ({
      x: Math.round(h.x),
      y: Math.round(h.y),
      sprite: h.mesh.userData.originalSprite,
    })),
    mines: mines.map((m) => ({
      nativeSlot: m.nativeSlot,
      nativeOrderId: m.nativeOrderId,
      nativeRenderRank: nativeRenderOrder.orders[m.nativeOrderId],
      nativeCreatedFrame: m.nativeCreatedFrame,
      x: Math.round(m.x),
      y: Math.round(m.y),
      arm: Math.round(m.arm * 10) / 10,
      nativeTimer: { ...m.nativeTimer },
      nativeWater: { ...m.nativeWater },
      nativeBody: { ...m.nativeBody },
      sprite: m.mesh.userData.originalSprite,
      frame: m.mesh.userData.originalFrame,
      team: m.team,
    })),
    daily: daily ? { date: daily.date, seed: daily.seed } : null,
    record: { ...record, daily: { ...record.daily } },
    ammo: ammo.map((loadout) => ({ ...loadout })),
    weaponDelays: weaponDelays.map((state) => ({
      ...state,
      delays: [...state.delays],
    })),
    utilities: { ...utilityAmmo[team] },
    activeUtility,
    targetUtility,
    rope: {
      attached: rope.attached,
      length: Math.round(rope.length),
      anchor: rope.anchor,
      sprite: rope.cuff?.userData.originalSprite ?? null,
      frame: rope.cuff?.userData.originalFrame ?? null,
    },
    jetpack: {
      active: jetpack.active,
      fuel: Math.round(jetpack.fuel * 10) / 10,
    },
    parachuteArmed,
    frozen: worms.map((w) => w.frozen ?? 0),
    waterLevel,
    waterSprite: water.userData.originalSprite,
    waterFrame: water.userData.originalFrame,
    suddenDeath,
    hitStop,
    lastAiPlanMs: Math.round(lastAiPlanMs * 10) / 10,
    aiRetreatTime: Math.round(aiRetreatTime * 10) / 10,
    activeWorm: worms[current]?.name ?? null,
    replaying,
    lastShot: lastShot
      ? { points: lastShot.points.length, impact: lastShot.impact, frame: lastShot.frame }
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
        g,
        renderY,
        moving,
        deathPending,
        nativeHurtBody,
        originalRecovery,
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
        nativeHurtState: nativeHurtBody?.state ?? null,
        recovering: !!originalRecovery,
        hurt,
        hits,
        recoil,
        renderY,
        moving,
        weaponRotation: rig.pivot.rotation.z,
        pose: g.userData.pose || "idle",
        originalSprite: g.userData.originalSprite,
        originalFrame: g.userData.originalFrame,
        originalTransform: g.userData.originalSprite
          ? {
              x: g.position.x,
              y: g.position.y,
              offsetX: g.children[0].position.x,
              offsetY: g.children[0].position.y,
              width: Math.abs(g.children[0].scale.x * g.scale.x),
              height: g.children[0].scale.y,
            }
          : null,
        originalCanvas: g.children[0]?.material.map?.image
          ? {
              width: g.children[0].material.map.image.width,
              height: g.children[0].material.map.image.height,
            }
          : null,
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
          nativeTimer: projectile.nativeTimer ? { ...projectile.nativeTimer } : null,
          nativeGuidance: projectile.nativeGuidance ? { ...projectile.nativeGuidance } : null,
          target: projectile.target,
          kind: projectile.kind,
          stuck: projectile.stuck,
          sprite: projectile.mesh.userData.originalSprite,
          frame: projectile.mesh.userData.originalFrame,
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
    dropWormForRecovery(index = current) {
      const w = worms[index];
      w.y += 100;
      w.vx = 0;
      w.vy = -600;
      w.ground = false;
      w.knocked = true;
      w.hurt = 1.4;
      w.nativeHurtBody = null;
      startOriginalHurt(w, 0x80);
    },
    stageMeleeTargets() {
      const shooter = worms[current];
      const ally = worms.findIndex(w => w !== shooter && w.team === shooter.team);
      const enemy = worms.findIndex(w => w.team !== shooter.team);
      const rear = worms.findIndex((w,i) => w !== shooter && i !== ally && i !== enemy);
      for (let y = 0; y < H; y++) for (let x = 350; x < 500; x++) terrain.data[y * W + x] = y < 250 ? 1 : 0;
      terrainDirty = true;
      for (const [index,x] of [[current,400],[ally,420],[enemy,440],[rear,380]]) {
        const w = worms[index];
        Object.assign(w, { x, y:258, renderY:258, vx:0, vy:0, ground:true, knocked:false, hurt:0,
          nativeHurtBody:null, nativeFlight:null, originalHurt:null, originalJump:null });
      }
      return { shooter:current, ally, enemy, rear };
    },
    stageWormContact() {
      for (const [index, vx] of [
        [0, 600],
        [1, 0],
      ]) {
        const w = worms[index];
        Object.assign(w, {
          x: 400 + index * 18,
          y: H - 150,
          vx,
          vy: 0,
          ground: false,
          knocked: true,
          hurt: 1.4,
          nativeHurtBody: null,
        });
        if (index === 0) startOriginalHurt(w, 0x80);
        else { w.originalHurt = null; w.nativeFlight = null; w.originalJump = null; }
      }
    },
    dropWormForParachute(index = current) {
      const w = worms[index];
      w.y = H - 15;
      w.vy = -250;
      w.vx = 0;
      w.ground = false;
      parachuteArmed = true;
    },
    submergeWorm(index = current, frozen = false) {
      const w = worms[index];
      w.y = waterLevel - 12;
      w.x = 8;
      w.frozen = frozen;
      w.ground = false;
    },
    explodeAt(x = 600, y = 350, kind = "cluster") {
      explode(x, y, kind, 0);
    },
    submergeMine(index = 0) {
      const mine = mines[index];
      if (!mine) return;
      Object.assign(mine.nativeBody, {
        x: 8 * 65536, y: Math.round((H - waterLevel + 5) * 65536),
        vx: 0, vy: 0, angle: 32768, submerged: 0,
      });
    },
    setMinePhysicalState(state = 1, index = 0) {
      if (mines[index]) mines[index].nativeBody.state = state;
    },
    setAmmo(teamIndex = 0, kind = "grenade", value = 5) {
      ammo[teamIndex][kind] = value;
      updateUI();
    },
    resetSeed(seed = 42) {
      reset({ seed });
    },
    consumeVisualRandom(count = 1) {
      for (let i = 0; i < count; i++) visualRandom();
    },
    setCrateKind(kind = "special") {
      if (crate) crate.kind = kind;
    },
    releaseRope() {
      releaseRope();
    },
  };
}
