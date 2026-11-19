import {observeAssetCache} from './asset-cache.js';
import { OriginalMusic } from "./armageddon/music.js";
import {nativeInitializeWormSpawnFields} from './armageddon/worm-spawn-fields.js';
import {nativeBodyBelowWater} from './armageddon/motion.js';
import {speechBankOptions,speechRequestId} from './armageddon/speech-resources.js';
import { NativeCollisionScene } from './armageddon/collision-scene.js';
import { nativeCrateSpawnSearch } from './armageddon/crate-spawn-search.js';
import { nativeWormSlopeTick } from "./armageddon/worm-slope.js";
import { nativeSurfaceSlope } from "./armageddon/surface-slope.js";
import { nativePlaceWormAt } from "./armageddon/worm-placement.js";
import { nativeTeleportPlacement } from "./armageddon/teleport-placement.js";
import { captureReplayResources, restoreReplayResources } from "./armageddon/replay-render-adapter.js";
import { captureReplayEnvironment, restoreReplayEnvironment } from "./armageddon/replay-environment-adapter.js";
import { captureReplayActors, restoreReplayActors } from "./armageddon/replay-actor-adapter.js";
import { nativeWindSelection, nativeDefaultWind } from "./armageddon/wind-selection.js";
import { nativeWormRotation } from "./armageddon/worm-rotation.js";
import { nativeTeamRotationReset, nativeSelectNextTeam } from "./armageddon/team-rotation.js";
import { nativeRetreatCountdown } from "./armageddon/retreat.js";
import { nativePoisonSettlement } from "./armageddon/poison-settlement.js";
import { NativeBusyCounter } from "./armageddon/busy-counter.js";
import { nativeSettlementPresentation } from "./armageddon/settlement-presentation.js";
import { nativeSuddenDeathActivation, nativeSuddenDeathHealth, nativeSuddenDeathRepeat } from "./armageddon/sudden-death.js";
import { nativeWaterRiseStart, nativeWaterRiseTick, clearNativeWaterRow } from "./armageddon/water-rise.js";
let nativeWaterRise = null;
import { nativeNuclearEffectStart, nativeNuclearEffectTick } from "./armageddon/nuclear-effect.js";
import { nativeCameraShake, nativeCameraShakeDecay } from "./armageddon/camera-shake.js";
import { nativePaletteDisplay } from "./armageddon/palette-material.js";
import { playNativeNuclearLoop } from "./armageddon/audio.js";
let nativeNuclearEffect = null;
const nuclearPlaybacks = new Map();
import { nativeWormPoisonInfect, nativeWormPoisonPickup, nativeWormPoisonDamage, nativeWormPoisonTurnReset } from "./armageddon/worm-poison.js";
import { nativeCrateTransfer, nativeCratePickupAudio, nativePickupCategory, nativeRecordPickup } from "./armageddon/crate-transfer.js";
import { nativeWormPickupEvent, nativeWormPickupTick, nativeWormPickupTransition } from "./armageddon/worm-pickup.js";
import { nativeBarrelBody } from "./armageddon/barrel-body.js";
import { stepNativeBarrelBody } from "./armageddon/barrel-runtime.js";
import { nativeBarrelArt } from "./armageddon/barrel-art.js";
import { nativeBarrelHit } from "./armageddon/barrel-hit.js";
import { nativeBarrelDetonation } from "./armageddon/barrel-detonation.js";
import { nativeProjectileFire } from "./armageddon/projectile-fire.js";
import { nativeFlameEvent } from "./armageddon/flame-events.js";
import { nativeFlameBlast } from "./armageddon/flame-blast.js";
import { nativeCrateHit, nativeCrateDirectHit } from "./armageddon/crate-hit.js";
import { nativeCrateDetonation } from "./armageddon/crate-detonation.js";
import { nativeCrateContents } from "./armageddon/crate-contents.js";
import crateProjectileData from "./armageddon/crate-projectile-data.json";
import { attachNativeProjectileBlock } from "./armageddon/projectile-runtime.js";
import { nativeFlameBody } from "./armageddon/flame-body.js";
import { registerNativeFlame } from "./armageddon/flame-spread.js";
import { stepNativeFlame } from "./armageddon/flame-runtime.js";
import { nativeFlameArt } from "./armageddon/flame-art.js";
import { createNativeCrateBody, stepNativeCrateBody } from "./armageddon/crate-runtime.js";
import nativeWaterSpriteIds from "./armageddon/water-sprite-ids.json";
import { NativeSoundQueue } from "./armageddon/sound-queue.js";
import { nativeTeamEnvironment } from "./armageddon/team-environment.js";
import { nativeAutomaticUtilities } from "./armageddon/automatic-utilities.js";
import { createNativeCrateScheme } from "./armageddon/crate-scheme.js";
import { nativeCrateShowerTick } from "./armageddon/crate-shower.js";
import { recordScenarioCompletion, recordScenarioScore } from "./armageddon/scenario-progress.js";
import { originalResourceString } from "./armageddon/string-resources.js";
import { nativePickupCandidate } from "./armageddon/crate-pickup.js";
import { nativeSkipTurnSpeech, nativeNearbyReactionTeam, nativeDamageRevealReaction, nativeDamageReactionEvent, nativeReactionWeaponFlag, nativeReactionWeaponUse, nativeDamageReactionVoice } from "./armageddon/damage-reactions.js";
import { loadNativeAnnouncementArt, updateNativeAnnouncement } from "./armageddon/announcement-art.js";
import { nativePoisonAnnouncement, nativeKillAnnouncement, nativeCrateDropAnnouncement, nativeWormDeathAnnouncement, nativeVictorySpeech, nativeSuddenDeathAnnouncement, nativeMatchResultAnnouncement, nativeTeamEliminationAnnouncement, nativeAnnouncementAudioTick, nativeAnnouncementsPending, createNativeAnnouncements, queueNativeAnnouncement, nativeAnnouncementTick } from "./armageddon/announcements.js";
import { nativeTeamPanelSounds, createNativeTeamList, nativeTeamListTick, nativeTeamListNeedsSort, sortNativeTeamList, removeNativeTeamListRow, nativeTeamHealthTick, nativeTeamPanelTick, nativeTeamPanelVisibilityTick, showNativeTeamPanel, hideNativeTeamPanelAfterInput } from "./armageddon/hud-frame.js";
import { nativeNextDeath, nativeRequestedDeathState } from "./armageddon/death-cue.js";
import { nativeWormDrowningState } from "./armageddon/worm-water.js";
import { createNativeRopeShot, createNativeBungeeBody, tryNativeBungee, stepNativeRopeShot, stepNativeRopeSwing, nativeRopePoints, refireNativeRope } from "./armageddon/rope-runtime.js";
import { nativeBlowtorchEntry, nativeBlowtorchTick, nativeBlowtorchExit } from "./armageddon/blowtorch.js";
import { nativeLaunch } from "./armageddon/launch.js";
import { nativeFireInput } from "./armageddon/fire-input.js";
import { nativeTryBodyPosition } from "./armageddon/motion.js";
import { startOriginalBlowtorch, finishOriginalBlowtorch } from "./armageddon/art.js";
import { nativeDrillEntry, nativeDrillTick } from "./armageddon/drill.js";
import { startOriginalDrill } from "./armageddon/art.js";
import { playNativeDrillLoop, playNativeRopeContactSound } from "./armageddon/audio.js";
import { mountArmageddonFrontend } from "./armageddon/frontend.js";
import { nativeDragonBallBody, nativeDragonBallHit, nativeDragonBallEvent } from "./armageddon/dragon-ball.js";
import { attachNativeFallingFlight, attachNativeJetpackFlight, releaseNativeJetpackFlight, stepNativeJetpackFlight, attachNativeParachuteFlight, stepNativeParachuteFlight, attachNativeJumpFlight, stepNativeJumpFlight, attachNativeDrillFlight, stepNativeDrillFlight, attachNativeFirePunchFlight, stepNativeFirePunchFlight } from "./armageddon/worm-flight.js";
import { startOriginalFirePunch, updateOriginalFirePunch } from "./armageddon/art.js";
import { carveNativeToolMask } from "./armageddon/terrain-cut-mask.js";
import toolCuts from "./armageddon/tool-cuts.json";
import { bodyBlocked } from "./physics.js";
import { startOriginalAxe, stepOriginalAxe } from "./armageddon/art.js";
import { nativeBatRequest } from "./armageddon/bat.js";
import { nativeProdRequest } from "./armageddon/prod.js";
import { nativeProjectileDepth } from "./armageddon/projectile-lifetime.js";
import { nativeMineBase, nativeMineBody, nativeSettleMineBody, NATIVE_MINE_FRICTION } from "./armageddon/mine-body.js";
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
import { nativeContactReceiver } from "./armageddon/contact-receiver.js";
import { NativeMineDudPool, nativeMineExpiry } from "./armageddon/mine-expiry.js";
import { nativeMineTimer, nativeMineTimerFromRecord, nativeMineInitialTimer, NATIVE_MINE_MASK, NATIVE_MINE_DAMAGE } from "./armageddon/mine-timer.js";
import { nativeMineProximity } from "./armageddon/mine-proximity.js";
import { NativeCameraFraming } from "./armageddon/camera-framing.js";
import { NativeCameraPriority, nativeProjectileCameraRequest, nativeWormCameraRequest } from "./armageddon/camera-priority.js";
import { playNativeProjectileContactSound, playNativeProjectileReleaseSound, playNativeProjectileFuse, updateNativeProjectileAudio, cleanupNativeContactSound } from "./armageddon/audio.js";
import {
  stepNativeHurtFlight,
  attachNativeFastFall,
  attachNativeDrowningFlight,
  stepNativeDrowningFlight,
  nativeWormMotionCallbacks,
  attachNativeRopeReleaseFlight,
  nativeWormContactBody,
  applyNativeWormContact,
} from "./armageddon/hurt-flight.js";
import { nativeSceneCollision as queryNativeScene, nativeSceneObject, nativeFinishSceneCollisionFrame } from "./armageddon/collision-scene.js";
import { nativeDirectHitResponse } from "./armageddon/direct-hit-response.js";
import { nativeBloodBurst, nativeBloodAmount } from "./armageddon/blood.js";
import { nativeBlastResponse } from "./armageddon/blast-response.js";
import { createNativeDamageReaction, nativeRecordDamageReaction, createNativeWormMatchStats, nativeRecordMatchDamage, nativeDamageAccounting, nativeHealthDisplayTick, nativeHealthDisplayReveal } from "./armageddon/damage-accounting.js";
import { nativeBlastQuality, nativeBlastDamage } from "./armageddon/blast-damage.js";
import {
  nativeDebrisBurst,
  nativeDebrisBody,
  nativeDebrisTick,
} from "./armageddon/debris.js";
import { carveNativeCrater } from "./armageddon/crater-mask.js";
import { nativeAreaDamage } from "./armageddon/area-damage.js";
import { applyNativeWeaponImpulse } from "./armageddon/worm-flight.js";
import { nativeJetpackInitialFuel } from "./armageddon/jetpack.js";
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
  nativeClockSlide,
  nativeClockPresentationTick,
  nativeTurnClockTick,
  updateOriginalClockPanel,
} from "./armageddon/number-hud.js";
import {
  loadOriginalWindHUD,
  tickOriginalWindHUD,
  tickOriginalWindPresentation,
  resetOriginalWindHUD,
} from "./armageddon/wind-hud.js";
import {
  loadOriginalGirders,
  originalGirder,
  stampOriginalGirder,
} from "./armageddon/girders.js";
import { nativeSceneGirderPlacement } from "./armageddon/girder-placement.js";
import { nativeClampPlacementTarget } from "./armageddon/target-placement.js";
import { loadNativeMapTheme, preparedNativeMapTheme } from "./armageddon/map-theme.js";
import { nativeDefaultMapObjects } from "./armageddon/map-setup.js";
import { originalMapSpawns } from "./armageddon/map-placement.js";
import {
  originalMapCatalog,
  randomOriginalMap,
  originalMapLoaded,
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
  nativePlacedWeaponAction,
  createNativeAirstrike,
  stepNativeAirstrike,
  nativeProjectileCollision as queryNativeProjectile,
  attachNativeProjectile,
  stepNativeProjectile,
  nativeProjectileDetonationEvents,
  nativeProjectileChildren,
  nativeProjectilePlacementHit as queryNativePlacement,
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
  updateOriginalCrate,
  stepOriginalIdle,
  startOriginalRecoil,
  startOriginalPreparation,
  stepOriginalPreparation,
  startOriginalLanding,
  stepOriginalLanding,
  startOriginalJump,
  startOriginalJumpPreparation,
  stepOriginalJumpPreparation,
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
  playNativeFireInputAudio,
  playNativeQueuedSound,
  playNativeOwnedSound,
  playNativeWormEntryAudio,
  playNativeAnnouncementLoop,
  playNativeHitVoice,
  playNativeRecoverySound,
  playNativeLandingSound,
  cleanupNativeWormAudio,
  cleanupOriginalReplayAudio,
  restoreNativeProjectileAudio,
} from "./armageddon/audio.js";
import { LOGIC_STEP_SECONDS } from "./armageddon/clock.js";
import { playSound } from "./sound.js";
import { fragments } from "./weapon-behavior.js";
import { pixelBrush } from "./pixel-draw.js";
import { mountPixelHUD, updateHudPower, updateHudTeams, updateHudTeamPanel, updateHudTeamHealth } from "./pixel-hud.js";
import { loadOriginalWormLabels, updateOriginalWormLabel, paintOriginalDamageText, nativeDamageTextPlacement, nativeWormLabelPlacement, nativeSelectionPlacement, nextNativeLabelMode } from "./armageddon/worm-label.js";
import { pixelViewport } from "./pixel-art.js";
import { createWater, loadOriginalWater } from "./water.js";
import * as THREE from "three";
import "./style.css";
import "./pixel-hud.css";
import {
  Terrain,
  setWorldDimensions,
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
  SECRET_WEAPONS,
  ammoFor,
  WATER_RISE,
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
import { PICKUP_KINDS } from "./pickups.js";
import { UTILITIES, UTILITY_KINDS, AUTOMATIC_UTILITIES, freshUtilities } from "./utilities.js";
import { nativeCrateContentsVisible, nativeSpecialCrateContent } from "./armageddon/crate-draw.js";
import { SCHEMES } from "./schemes.js";
import { modifierSettings } from "./modifiers.js";
import { readSettings, writeSettings } from "./settings.js";
const matchRandom = new MatchRandom(0);
let mineDudPool = new NativeMineDudPool();
let nativeRenderOrder = new NativeRenderOrder();
const nativeCamera = new NativeCameraPriority();
let nativeCameraFocus = null;
let nativeTeamRotation = null;
let nativeCameraFraming = null;
let pendingWormCamera = [];
let pendingEnvironmentCamera = null;
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
let manualCamera = null;
let touchPan = null;
let mousePanPointer = null;
let overview = false;
window.addEventListener("siege-overview", (event) => {
  overview = event.detail;
  resize();
  cameraSnap = true; manualCamera = null;
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
  nativePaletteDisplay.bind(new THREE.MeshBasicMaterial({ map: texture, transparent: true }), 3),
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
  lastSelectedWorm = [0, 0],
  mode = "ai",
  weapon = "rocket",
  move = 0,
  angle = 45,
  power = 0,
  aiWait = 0,
  sound = false,
  audio,
  last = performance.now(),
  accumulator = 0,
  explosions = 0;
let configuredDelays = {};
let nativeAnnouncements = createNativeAnnouncements();
let pendingTurnStart = false;
let pendingPoisonSettlement = 0;
let pendingEnvironmentSettlement = 0;
let matchDamageSourceActive = false;
let nativeMatchStatistics = { damage: 0, deaths: 0 };
let nativeDamageReaction = createNativeDamageReaction();
let reactionOrigin = { x: 0, y: 0 };
let announcementVolume = 0, announcementPlayback = null;
let weaponDelays = [createWeaponDelays(), createWeaponDelays()];
const availableAmmo = (loadout, kind) =>
  ammoFor(loadout, kind, weaponDelays[team]);
// Native pickup slots for utilities that are not part of WEAPON_SLOTS.
const NATIVE_UTILITY_SLOTS = {
  34: "girder", 37: "rope", 38: "bungee", 39: "parachute", 40: "teleport",
  36: "bridgekit", 60: "freeze", 62: "jetpack", 63: "lowgravity", 64: "fastwalk", 65: "laser", 66: "invisibility",
  67: "doubledamage", 68: "cratespy", 69: "doubletime", 70: "crateshower",
};
let matchFriction = NATIVE_MINE_FRICTION;
let fallDamageScale = 1;
const NATIVE_WEAPON_KINDS = Object.fromEntries(
  Object.entries(WEAPON_SLOTS).map(([kind, slot]) => [slot, kind]),
);
function crateShowerSlotKind(slot) {
  if (NATIVE_WEAPON_KINDS[slot]) return { kind: NATIVE_WEAPON_KINDS[slot], type: "weapon" };
  if (NATIVE_UTILITY_SLOTS[slot]) return { kind: NATIVE_UTILITY_SLOTS[slot], type: "utility" };
  return null;
}
let crateShowerPool = null, crateShowerUsed = [], crateShowerAmmo = null;
let currentScenario = null;
let scenarioProgress = null;
let scenarioSequence = [], scenarioSequenceIndex = 0;
let scenarioTimed = [], scenarioTurn = 0, suddenDeathDamageTurn = -1;
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
  crates = [],
  mines = [],
  girders = [],
  graves = [],
  bombs = [],
  airstrikes = [],
  nativeFlames = Array(200).fill(null),
  nativeFlameCounter = 0,
  crateDirectionBag = { pool: [0, 1], used: [] },
  hazards = [],
  slowMo = 0,
  weather = "clear",
  modifier = "standard",
  gravityScale = 1,
  damageMultiplier = 1,
  automaticUtilityState = { doubleTime: 0, crateShower: 0, crateTimer: 0, crateCount: 0 },
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
    fuel: nativeJetpackInitialFuel / 65536,
    owner: null,
    pulse: 0,
    pulseTime: 0,
  },
  parachuteArmed = false,
  bungeeArmed = false,
  laserSight = false,
  invisibleTeam = null,
  girderAngle = 0,
  girderLength = 64,
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
let labelMode = 1;
let uiKey = "",
  terrainDirty = false,
  timerKey = "";
// Host replay simulation must never count as a new player achievement.
let replaySimulation = false;
let lastShot = null,
  replaying = false,
  replayClock = 0,
  replayDuration = 1,
  replayReady = false,
  lastResult = null;
let assetsReady = false;
let originalArtError = null;
let loadingSteps=0,loadingFiles={files:0,cachedFiles:0};
function updateLoadingProgress() {
  const bar=$('#asset-progress');if(!bar)return;
  bar.value=loadingSteps;
  $('#asset-loading-label').textContent=loadingSteps<11?'Loading game assets…':'Preparing battlefield…';
  $('#asset-loading-detail').textContent=`${loadingSteps} of 12 steps · ${loadingFiles.files} files ready${loadingFiles.cachedFiles?` · ${loadingFiles.cachedFiles} from device cache`:''}`;
}
const stopAssetProgress=observeAssetCache(stats=>{loadingFiles=stats;updateLoadingProgress();});
const loadingStep=promise=>promise.then(value=>{loadingSteps++;updateLoadingProgress();return value;});
const originalAssets = Promise.all([
  loadOriginalArt,loadOriginalTerrain,loadOriginalWater,loadOriginalHUDIcons,
  loadOriginalWindHUD,loadOriginalNumbers,loadNativeAnnouncementArt,
  loadOriginalWormLabels,loadOriginalGirders,
].map(load=>loadingStep(load())))
  .then(() => loadingStep(Promise.all([
    loadOriginalDecorations($("#terrain-theme").value),
    loadNativeMapTheme($("#terrain-theme").value,true),
    loadOriginalDecorations("forest"),
  ])))
  .then(() => {
    updateOriginalHUDIcons();
    mountCurrentMenuArt();
    tickOriginalWindHUD(wind, false);
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
const SKY_HEADROOM = 256;
const backdropMap = new THREE.CanvasTexture(document.createElement("canvas"));
backdropMap.colorSpace = THREE.SRGBColorSpace;
backdropMap.minFilter = backdropMap.magFilter = THREE.NearestFilter;
backdropMap.generateMipmaps = false;
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(W, H + SKY_HEADROOM),
  nativePaletteDisplay.bind(new THREE.MeshBasicMaterial({ map: backdropMap }), 3),
);
backdrop.position.set(W / 2, (H + SKY_HEADROOM) / 2, -180);
group.add(backdrop);
function updateOriginalBackdrop() {
  if (!terrain || backdrop.userData.originalTheme === terrain.theme) return;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H + SKY_HEADROOM;
  if (!paintOriginalBackdrop(canvas.getContext("2d"), terrain.theme, WATER, SKY_HEADROOM))
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
  const nativeIdleMemory=new Uint8Array(0x390);
  const nativeSpawn=nativeInitializeWormSpawnFields(nativeIdleMemory,{
    team:t+1,worm:i+1,color:t?0:2,frame:matchRandom.frame,
    x:Math.round(x*65536),y:Math.round((H-y)*65536),
  });
  return {
    team: t,
    nativeSpeechBank:$('#team-voice-'+t)?.value||'english',
    name: names[t][i],
    hp: 100,
    nativePickupFlag: 0,
    nativePickupState: 0x65,
    nativePoison: { amount: 0, latched: 0 },
    nativeIdleMemory,
    nativeGroundPose:{pending:1,slope:0,variant:0},
    nativeGroundPosition:null,
    nativeOrderId: nativeRenderOrder.allocate(),
    nativeHealthDisplay: { value: 100 << 16, target: 100 << 16, progress: 0, active: 0, pending: 0 },
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
    damageTaken: 0,
    matchStats: createNativeWormMatchStats(t + 1, i + 1),
    shadow,
    facing: nativeSpawn.facing,
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
function updateLaserSight(visible) {
  const line = aimHUD.laser;
  if (!line) return;
  const worm = worms[current];
  if (!laserSight || !visible || !worm || worm.hp <= 0) {
    line.style.display = "none";
    return;
  }
  const config = nativeHitscanWeapon("handgun");
  const launch = nativeBulletLaunch(config, worm, angle, H, () => 0);
  const ray = nativeHitscanRays(
    [worm.team, current, launch.x, launch.y, launch.vx, launch.vy, 0, 0, 0, 0, 0],
    1, 0, () => 0,
  )[0];
  const targets = [...nativeWormHitscanBodies(worms, worm, H),
    ...nativeMineHitBodies(mines), ...nativeCrateHitBodies(), ...nativeBarrelHitBodies()]
    .sort((a, b) => a.type - b.type);
  const bodyHit = nativeHitscanBody(targets, ray[2] >> 16, ray[3] >> 16,
    ray[4], ray[5], config.ray.range, config.ray.collisionMask);
  const terrainHit = nativeHitscanTerrain(ray[2] >> 16, ray[3] >> 16,
    ray[4], ray[5], config.ray.range, (x, y) => terrain.solid(x, H - y));
  const distance = bodyHit.distance >= 0 && (terrainHit < 0 || bodyHit.distance < terrainHit)
    ? bodyHit.distance : terrainHit >= 0 ? terrainHit : config.ray.range;
  if (distance < 0) { line.style.display = "none"; return; }
  const endX = (ray[2] + Math.imul(ray[4], distance)) >> 16;
  const endY = (ray[3] + Math.imul(ray[5], distance)) >> 16;
  const start = screen(ray[2] >> 16, H - (ray[3] >> 16));
  const end = screen(endX, H - endY);
  line.setAttribute("x1", String(start.x));
  line.setAttribute("y1", String(start.y));
  line.setAttribute("x2", String(end.x));
  line.setAttribute("y2", String(end.y));
  line.style.display = "";
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
  updateLaserSight(visible);
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
  queueNativeAnnouncement(nativeAnnouncements, text, 23);
}
function announceWormDeath(worm) {
  const message = nativeWormDeathAnnouncement(worm.name, worm.team ? 0 : 2, worm.drowned, () => matchRandom.logicUint());
  queueNativeAnnouncement(nativeAnnouncements, message.text, message.font);
}
function announceMatchResult(winner) {
  music.result(winner, mode);
  if (winner !== null && sound) {
    const request = nativeVictorySpeech(worms.filter(w => w.team === winner).map(w => w.matchStats.damageReceived));
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    queueControllerSpeech(request,worms.find(w=>w.team===winner));
  }
  const message = nativeMatchResultAnnouncement(winner ? "CORAL CREW" : "MOSS COMPANY", winner ? 0 : 2, winner === null, () => matchRandom.logicUint());
  queueNativeAnnouncement(nativeAnnouncements, message.text, message.font);
}
const music = new OriginalMusic();
function syncMusic() {
  music.update({enabled:sound,hidden:document.hidden,seed:matchRandom.seed,
    scene:menu.open ? "title" : phase === "over" || phase === "break" ? "result" : suddenDeath ? "sudden" : "battle"});
}
for (const event of ["pointerdown", "keydown"])
  document.addEventListener(event, () => { syncMusic(); music.unlock(); }, {passive:true});
document.addEventListener("visibilitychange", syncMusic);
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
  p?.nativeContactPlayback?.stop();
  p?.nativeSecondaryPlayback?.stop();
  if (p) p.nativeFusePlayback = p.nativeContactPlayback = p.nativeSecondaryPlayback = null;
}
let nativeClockProgress = 0, nativeClockTarget = 0;
let nativeClockPresentation = { displayed: 45000, warned: 0, lastSecond: 0, phase: 0 };
let nativeTeamList = createNativeTeamList();
const teamPanelSoundState = { drop: 0, bounce: 0 };
let pendingEliminationTeam = null;
let nativeTeamHealthMaximum = 1;
const nativeBusy = new NativeBusyCounter();
let nativeTeamHealthValues = [65536, 65536];
const nativeTeamPanelVisibility = { minimum: 0, forced: 0 };
let toggleTeamPanelVisibility = false;
const nativeTeamPanel = { progress: 0, target: 65536, countdown: 0 };
let mapLoading = false;
let preparedRandomSeed = null;
const nativeSoundQueue = new NativeSoundQueue();
function reset({ keepSeries = false, seed = null, isDaily = false } = {}) {
  const matchSeed = seed ?? currentScenario?.logicRandomSeed ?? preparedRandomSeed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  preparedRandomSeed = null;
  const selectedLayout = $("#map-layout").value;
  matchFriction = currentScenario?.friction ?? NATIVE_MINE_FRICTION;
  fallDamageScale = currentScenario?.fallDamage == null ? 1 : currentScenario.fallDamage / 100;
  const layout = isDaily || selectedLayout === "random"
    ? randomOriginalMap(matchSeed) : selectedLayout;
  if (layout.startsWith("original:") && !originalMapLoaded(layout)) {
    mapLoading = true;
    $("#start").disabled = true;
    return loadOriginalMap(layout).then(() => {
      mapLoading = false;
      $("#start").disabled = false;
      return reset({ keepSeries, seed: matchSeed, isDaily });
    }).catch(error => {
      mapLoading = false;
      $("#start").disabled = false;
      $("#status").textContent = "Map could not load. Please try again.";
      $("#start").textContent = "MAP COULD NOT LOAD — RETRY";
      phase = "menu";
      if (!menu.open) menu.showModal();
      console.error("Map loading failed", error);
      return false;
    });
  }
  nativeSoundQueue.flush(null);
  cancelCharge();
  if (pendingFire?.kind === "blowtorch") pendingFire.worm.originalBlowtorch = null;
  stopDrill();
  uiKey = "";
  timerKey = "";
  selectionTick = 0;
  nativeClockProgress = nativeClockTarget = 0;
  nativeClockPresentation.phase = 0;
  nativeTeamList = createNativeTeamList();
  teamPanelSoundState.drop = teamPanelSoundState.bounce = 0;
  pendingEliminationTeam = null;
  nativeTeamHealthMaximum = 1;
  nativeBusy.value = 0;
  nativeTeamHealthValues = [65536, 65536];
  updateHudTeamHealth(nativeTeamHealthValues);
  Object.assign(nativeTeamPanel, { progress: 0, target: 65536, countdown: 0 });
  labelMode = 1;
  updateLabelModeButton();
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
  cameraSnap = true; manualCamera = null;
  replaying = false;
  lastShot = null;
  replayReady = false;
  utilitiesOpen = false;
  specialOpen = false;
  activeUtility = null;
  targetUtility = null;
  parachuteArmed = false;
  bungeeArmed = false;
  laserSight = false;
  invisibleTeam = null;
  girderAngle = 0;
  girderLength = 64;
  stopRope();
  stopJetpack();
  $("#replay").disabled = true;
  aimHUD.replay.group.style.display = "none";
  const carriedAmmo = keepSeries && stockpile ? ammo : null;
  const carriedUtilities = keepSeries && stockpile ? utilityAmmo : null;
  ammo = carriedAmmo ?? [freshAmmo(), freshAmmo()];
  if (currentScenario && currentScenario.enableSecretWeapons === false) {
    for (const teamAmmo of ammo)
      for (const kind of SECRET_WEAPONS) teamAmmo[kind] = 0;
  }
  weaponDelays = [0, 1].map(() =>
    createWeaponDelays(isDaily ? {} : configuredDelays),
  );
  utilityAmmo = carriedUtilities ?? [freshUtilities(), freshUtilities()];
  damageMultiplier = 1;
  automaticUtilityState = { doubleTime: 0, crateShower: 0, crateTimer: 0, crateCount: 0 };
  crateShowerPool = null; crateShowerUsed = []; crateShowerAmmo = null;
  teamWeapon = ["rocket", "rocket"];
  waterLevel = WATER;
  nativeWaterRise = null;
  stopNativeNuclearAudio();
  nativeNuclearEffect = null;
  nativePaletteDisplay.update();
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
    w.nativeActionPlayback?.stop();
    w.nativeContactPlayback?.stop();
    dispose(w.g);
    w.label.remove();
    w.damageCanvas?.remove();
  }
  stopProjectileSound();
  if (projectile) releaseProjectileMesh(projectile.mesh);
  projectile = null;
  for (const crate of crates) dispose(crate.mesh);
  crates.length = 0;
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
  for (const b of bombs) { stopProjectileSound(b); dispose(b.mesh); }
  bombs = [];
  for (const strike of airstrikes) if(strike.mesh) dispose(strike.mesh);
  airstrikes = [];
  nativeCamera.reset();
  nativeCameraFocus = null;
  nativeCameraFraming = null;
  pendingEnvironmentCamera = null;
  pendingWormCamera = [];
  for (const flame of nativeFlames) if (flame) dispose(flame.mesh);
  nativeFlames.fill(null); nativeFlameCounter = 0;
  crateDirectionBag = { pool: [0, 1], used: [] };
  for (const h of hazards) { h.impactPlayback?.stop(); dispose(h.mesh); }
  hazards = [];
  matchRandom.reset(matchSeed);
  wind = 0;
  resetOriginalWindHUD();
  mineDudPool = new NativeMineDudPool();
  nativeRenderOrder = new NativeRenderOrder();
  smokeRandom = matchSeed >>> 0;
  impactBag = createImpactBag();
  bubbleSeed = matchSeed >>> 0;
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
      const height = H + (mesh === backdrop ? SKY_HEADROOM : 0);
      mesh.geometry = new THREE.PlaneGeometry(W, height);
      mesh.position.x = W / 2;
      mesh.position.y = height / 2;
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
    cameraSnap = true; manualCamera = null;
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
  const slots = [180, 340, 490, 710, 860, 1020];
  const spawns = authored
    ? originalMapSpawns(
        terrain,
        waterLevel,
        slots.length,matchSeed,preparedNativeMapTheme(terrain.theme,true),
        nativeDefaultMapObjects,
      )
    : slots.map((x) => ({ x, y: null }));
  paintTerrain(ctx, terrain, texture);
  updateOriginalBackdrop();
  terrainDirty = false;
  worms = [];
  if(authored)spawnHazards(terrain.nativeSpawnSetup.objects);
  for(const [index,p] of spawns.entries()) {
    const worm=createWorm(index<3?0:1,index%3,p.x,p.y);
    if(authored) {
      const placed=nativePlaceWormAt(Math.round(p.x*65536),Math.round((H-p.y)*65536),
        Math.floor(H-waterLevel),matchFriction,
        (x,y,body)=>nativeSceneCollision(worm,body,x/65536,H-y/65536,terrain,worms,H),worm.nativeIdleMemory);
      worm.nativeSpawnPhysics=placed.physics;
      worm.x=placed.x/65536;worm.y=H-placed.y/65536;
      worm.renderY=worm.y;worm.ground=bodyBlocked(terrain,worm.x,worm.y-1);
    }
    worms.push(worm);
  }
  if(!authored)for (let i = 0; i < 240; i++)
    for (const w of worms) stepWorm(w, terrain, 1 / 120, gravityScale);
  for (const w of worms) w.g.position.set(w.x, w.y, 15);
  nativeTeamRotation = nativeTeamRotationReset({ groups: 2,
    initialGroup: keepSeries ? (seriesRound - 1) % 2 : 0,
    cursors: Array(6).fill(1), starts: [0, 0] });
  team = selectNativeMatchTeam();
  round = 1;
  lastSelectedWorm = [0, 0];
  explosions = 0;
  announcementPlayback?.stop(); announcementPlayback = null; announcementVolume = 0;
  nativeAnnouncements = createNativeAnnouncements();
  nativeMatchStatistics = { damage: 0, deaths: 0 };
  nativeDamageReaction = createNativeDamageReaction();
  pendingTurnStart = false;
  pendingPoisonSettlement = 0;
  pendingEnvironmentSettlement = 0;
  matchDamageSourceActive = false;
  setWeapon("rocket");
  mode = $("#mode").value;
  applyWeather();
  spawnCrate();
  if (currentScenario) {
    scenarioSequence = (currentScenario.sequenceObjects ?? []).filter(
      (object) => object.kind === "text" || object.kind === "target" ||
        object.kind === "weapon");
    scenarioSequenceIndex = 0;
    scenarioTimed = [...(currentScenario.timedObjects ?? [])];
    scenarioTurn = 0;
    suddenDeathDamageTurn = -1;
    scenarioProgress = {
      collected: 0,
      score: 0,
      total: (currentScenario.objects ?? []).filter(
        (object) => object.kind === "weapon" || object.kind === "target").length +
        scenarioSequence.length +
        scenarioTimed.filter((object) => object.kind === "weapon" || object.kind === "target").length,
      complete: false,
    };
  } else {
    scenarioSequence = []; scenarioSequenceIndex = 0;
    scenarioTimed = []; scenarioTurn = 0; suddenDeathDamageTurn = -1;
  }
  spawnScenarioObjects();
  spawnNextScenarioSequence();
  if(!authored)spawnHazards();
  beginTurn();
  updateRecordUI();
  resize();
}
function dispose(obj) {
  group.remove(obj);
  obj.traverse((o) => {
    o.geometry?.dispose();
    if (o.userData.nativeCrateLabel !== undefined) o.material?.map?.dispose();
    if (o.material) o.material.dispose();
  });
}
function updateScenarioObjectiveHUD() {
  const objective = $("#scenario-objective");
  if (!objective) return;
  objective.hidden = !scenarioProgress || !currentScenario;
  if (objective.hidden) return;
  objective.textContent = `TARGETS ${scenarioProgress.collected}/${scenarioProgress.total}` +
    (scenarioProgress.score ? ` · ${scenarioProgress.score} PTS` : "");
}
function updateSeriesHUD() {
  const el = $("#series");
  el.hidden = format !== "best3";
  if (!el.hidden) el.textContent = `SERIES ${seriesWins[0]}–${seriesWins[1]}`;
}
function applyWeather() {
  $("#weather-layer").className = weather === "clear" ? "" : weather;
}
function nativeCrateKind(kind) {
  return kind === "health" ? 2 : kind === "utility" ? 4 : 1;
}
function crateOpeningSprite(kind) {
  const prefix = kind === "health" ? "m" : kind === "utility" ? "u" : "w";
  return `${prefix}crate0`;
}
function crateSnapshot(crate) {
  return {
    nativeOrderId: crate.nativeOrderId,
    nativeRenderRank: nativeRenderOrder.orders[crate.nativeOrderId],
    x: crate.x,
    y: crate.y,
    kind: crate.kind,
    scenario: crate.scenario ?? null,
    falling: crate.falling,
    sprite: crate.mesh.userData.originalSprite,
    frame: crate.mesh.userData.originalFrame,
    content: crate.content,
    quantity: crate.quantity,
    nativeBody: { ...crate.nativeBody },
  };
}
function chooseCrateContent(kind) {
  if (kind === "utility") {
    const pool = ["jetpack", "parachute", "teleport", "girder", "freeze", "fastwalk", "bungee", "lowgravity", ...Object.keys(AUTOMATIC_UTILITIES)];
    return pool[Math.floor(logicRandom() * pool.length)];
  }
  if (kind === "special") return SPECIAL_WEAPONS[Math.floor(logicRandom() * SPECIAL_WEAPONS.length)];
  return kind;
}
function queueCrateSound(request) {
  if (!sound || !request) return;
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  nativeSoundQueue.enqueue(request);
}
function spawnCrate(announceDrop = false) {
  if (!terrain) return;
  if (currentScenario && !currentScenario.crateDrops?.weapon &&
      !currentScenario.crateDrops?.health && !currentScenario.crateDrops?.utility)
    return;
  const scene = new NativeCollisionScene(terrain,H);
  scene.syncWorms(worms);
  scene.syncObjects([...mines,...crates,...hazards]);
  // Native normal-drop search004B7D00 uses falling placement and actor clearance.
  // Browser-only map bounds and height classification remain scene adapters.
  const position=nativeCrateSpawnSearch(Math.floor(H-waterLevel),H>960,0,1,{
    random:()=>matchRandom.logicUint(),
    collide:(shape,x,y,flags)=>x<0 || x>=(W<<16) ? 1 : scene.probe(shape,x,y,flags),
    nearest:(...args)=>scene.nearest(...args),
  });
  if(!position.success)return;
  const x=position.x/65536,y=H-position.y/65536;
  const allowed = [];
  if (currentScenario?.crateDrops?.weapon > 0) allowed.push("special");
  if (currentScenario?.crateDrops?.health > 0) allowed.push("health");
  if (currentScenario?.crateDrops?.utility > 0) allowed.push("utility");
  const pool = allowed.length ? allowed : PICKUP_KINDS;
  const kind = pool[Math.floor(logicRandom() * pool.length)],
    mesh =
      createOriginalObject(crateOpeningSprite(kind), -10);
  mesh.position.set(x, y, 18);
  group.add(mesh);
  const crate = {
    nativeOrderId: nativeRenderOrder.allocate(),
    content: chooseCrateContent(kind),
    quantity: kind === "health" ? (currentScenario?.healthCrateEnergy ?? 25) : 1,
    x,
    y,
    kind,
    mesh,
    falling: true,
    vy: 0,
  };
  crate.nativeBody = createNativeCrateBody({
    kind: nativeCrateKind(kind), x: position.x, y: position.y,
  }, 1, nativeProjectileDepth(Math.floor(H - waterLevel)), matchFriction, {
    shape: (body, shape) => { body.shape = shape; },
    collide: (x, y, body) => nativeSceneCollision(crate, body, x / 65536, H - y / 65536, terrain, worms, H),
    sound: queueCrateSound,
  });
  crates.push(crate);
  if (announceDrop) {
    const message = nativeCrateDropAnnouncement(kind, () => matchRandom.logicUint());
    queueNativeAnnouncement(nativeAnnouncements, message.text, message.font);
    if (sound && kind !== "health") {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      nativeSoundQueue.enqueue([81, 8, 65536, 65536, 0]);
    }
  }
}
function spawnShowerCrate(record, mapping, quantity) {
  const kind = mapping.type === "health" ? "health" : mapping.type === "utility" ? "utility" : "special";
  const x = record.x / 65536, y = H - record.y / 65536;
  const mesh = createOriginalObject(crateOpeningSprite(kind), -10);
  mesh.position.set(x, y, 18);
  group.add(mesh);
  const crate = {
    nativeOrderId: nativeRenderOrder.allocate(),
    content: mapping.kind,
    quantity: mapping.type === "health" ? Math.max(1, quantity | 0) : mapping.type === "weapon" ? Math.max(1, quantity | 0) : 1,
    x, y, kind, mesh, falling: true, vy: 0,
  };
  crate.nativeBody = createNativeCrateBody({
    kind: nativeCrateKind(kind), x: record.x, y: record.y,
  }, 1, nativeProjectileDepth(Math.floor(H - waterLevel)), matchFriction, {
    shape: (body, shape) => { body.shape = shape; },
    collide: (cx, cy, body) => nativeSceneCollision(crate, body, cx / 65536, H - cy / 65536, terrain, worms, H),
    sound: queueCrateSound,
  });
  crates.push(crate);
  return crate;
}
function spawnScenarioBarrel(object) {
  const mesh = createOriginalObject("oildrum1", -14);
  const hazard = { mesh, nativeOrderId: nativeRenderOrder.allocate() };
  hazard.nativeBody = nativeBarrelBody(
    Math.round(object.x * 65536), Math.round(object.y * 65536),
    object.onGround ? 1 : 0, Math.floor(H - waterLevel), matchFriction,
    (px, py, body) => nativeSceneCollision(hazard, body, px / 65536, H - py / 65536, terrain, worms, H),
  );
  hazard.x = hazard.nativeBody.x / 65536;
  hazard.y = H - hazard.nativeBody.y / 65536;
  mesh.position.set(hazard.x, hazard.y, 17);
  group.add(mesh);
  hazards.push(hazard);
  hazard.scenario = object;
}
function spawnScenarioObject(object) {
  if (object.kind === "mine") {
    spawnStrikeMine({ x: object.x, y: H - object.y, vx: 0, vy: 0 }).scenario = object;
    return true;
  }
  if (object.kind === "drum") { spawnScenarioBarrel(object); return true; }
  if (object.kind === "health") {
    spawnShowerCrate({
      x: Math.round(object.x * 65536),
      y: Math.round(object.y * 65536),
    }, { kind: "health", type: "health" }, object.health ?? 15).scenario = object;
    return true;
  }
  const mapping = crateShowerSlotKind(object.content) ??
    (object.kind === "target" || object.kind === "weapon"
      ? { kind: null, type: "target" } : null);
  if (!mapping) return false;
  spawnShowerCrate({
    x: Math.round(object.x * 65536),
    y: Math.round(object.y * 65536),
  }, mapping, object.kind === "health" ? object.health ?? 15 : 1).scenario = object;
  return true;
}
function spawnScenarioObjects() {
  if (!currentScenario) return;
  for (const object of currentScenario.objects ?? []) spawnScenarioObject(object);
}
function applyScenarioSuddenDeathDamage() {
  const amount = currentScenario?.suddenDeath?.wormDamage | 0;
  if (!suddenDeath || amount <= 0 || suddenDeathDamageTurn === scenarioTurn) return false;
  suddenDeathDamageTurn = scenarioTurn;
  for (const w of worms) if (w.hp > 0) injure(w, amount);
  updateUI();
  return true;
}
function stepScenarioTimedEvents() {
  if (!currentScenario) return;
  scenarioTurn++;
  const due = scenarioTimed.filter((object) => (object.turn ?? 0) <= scenarioTurn);
  scenarioTimed = scenarioTimed.filter((object) => (object.turn ?? 0) > scenarioTurn);
  for (const object of due) {
    if (object.kind === "text") {
      const text = originalResourceString(1715 + object.textIndex);
      if (text) announce(text);
    } else spawnScenarioObject(object);
  }
}
function spawnNextScenarioSequence() {
  while (scenarioSequenceIndex < scenarioSequence.length) {
    const object = scenarioSequence[scenarioSequenceIndex++];
    if (object.kind === "text") {
      const text = originalResourceString(1715 + object.textIndex);
      if (text) announce(text);
      continue;
    }
    if (object.kind === "health") { spawnScenarioObject(object); return; }
    if (spawnScenarioObject(object)) return;
  }
}
function stepCrateShower() {
  const state = automaticUtilityState;
  if (!state.crateShower || state.crateCount <= 0 || !crateShowerPool || !terrain) return;
  const scene = new NativeCollisionScene(terrain, H);
  scene.syncWorms(worms);
  scene.syncObjects([...mines, ...crates, ...hazards]);
  const result = nativeCrateShowerTick({
    count: state.crateCount, timer: state.crateTimer,
    pool: crateShowerPool, used: crateShowerUsed,
  }, {
    parent: () => 25, busy: () => {},
    nextRandom: () => matchRandom.logicUint(),
    bottom: Math.floor(H - waterLevel), tall: H > 960,
    collide: (shape, x, y, flags) =>
      x < 0 || x >= (W << 16) ? 1 : scene.probe(shape, x, y, flags),
    nearest: (...args) => scene.nearest(...args),
    ammo: slot => crateShowerAmmo?.[slot] ?? 1,
    allocate: () => true,
    create: (allocation, parent, record, quantity) => {
      const mapping = crateShowerSlotKind(record.weapon);
      if (mapping) spawnShowerCrate(record, mapping, quantity);
    },
  });
  automaticUtilityState.crateCount = result.count;
  automaticUtilityState.crateTimer = result.timer;
  crateShowerPool = result.pool;
  crateShowerUsed = result.used;
}
function spawnHazards(requests=null) {
  if (hazards.length || !terrain) return;
  if(requests) {
    for(const request of requests) {
      if(request.kind==="mine"){spawnNaturalMine(request);continue;}
      const mesh=createOriginalObject("oildrum1",-14);
      const hazard={mesh,nativeOrderId:nativeRenderOrder.allocate()};
      hazard.nativeBody=nativeBarrelBody(request.x,request.y,request.settle,
        Math.floor(H-waterLevel),matchFriction,
        (px,py,body)=>nativeSceneCollision(hazard,body,px/65536,H-py/65536,terrain,worms,H));
      hazard.x=hazard.nativeBody.x/65536;hazard.y=H-hazard.nativeBody.y/65536;
      mesh.position.set(hazard.x,hazard.y,17);group.add(mesh);hazards.push(hazard);
    }
    return;
  }
  for (let i = 0; i < 2; i++) {
    for (let tries = 0; tries < 30; tries++) {
      const x = 180 + logicRandom() * (W - 360),
        ground = terrain.surface(x);
      if (ground < waterLevel + 50) continue;
      if (worms.some((w) => w.hp > 0 && Math.abs(w.x - x) < 70)) continue;
      if (crates.some(crate => Math.abs(crate.x - x) < 55)) continue;
      if (hazards.some((h) => Math.abs(h.x - x) < 70)) continue;
      const mesh = createOriginalObject("oildrum1", -14);
      group.add(mesh);
      // 004D0D30 only places a collision-free initial body. The native mask
      // extends beyond the old14px visual offset, which could leave the body
      // at its constructor default(0,-1024). Settle from clear air instead.
      const hazard = { x, y: H + 32, mesh, nativeOrderId: nativeRenderOrder.allocate() };
      hazard.nativeBody = nativeBarrelBody(Math.round(x * 65536),
        Math.round((H - hazard.y) * 65536), 1, Math.floor(H - waterLevel), 96,
        (px, py, body) => nativeSceneCollision(hazard, body, px / 65536, H - py / 65536, terrain, worms, H));
      hazard.x = hazard.nativeBody.x / 65536; hazard.y = H - hazard.nativeBody.y / 65536;
      mesh.position.set(hazard.x, hazard.y, 17);
      hazards.push(hazard);
      break;
    }
  }
}
function nativeSceneCollision(identity, body, x, y, landscape, actors, height) {
  return queryNativeScene(identity, body, x, y, landscape, actors, height, [...mines, ...crates, ...hazards]);
}
function nativeProjectileCollision(p, x, y, landscape, actors, height, body) {
  return queryNativeProjectile(p, x, y, landscape, actors, height, body, [...mines, ...crates, ...hazards]);
}
function nativeProjectilePlacementHit(p, landscape, actors, height) {
  return queryNativePlacement(p, landscape, actors, height, [...mines, ...crates, ...hazards]);
}
function nativeContactBody(hit) {
  const object = nativeSceneObject(terrain, hit);
  if (object) return { ...object.nativeBody };
  return hit >= 2 ? nativeWormContactBody(worms[hit - 2], H) : { type: 1, vx: 0, vy: 0 };
}
function updateNativeContactBody(hit, body) {
  const object = nativeSceneObject(terrain, hit);
  if (object) Object.assign(object.nativeBody, { vx: body.vx, vy: body.vy });
  else if (hit >= 2) applyNativeWormContact(worms[hit - 2], body);
}


function nativeCrateHitBodies() {
  return crates.filter(crate => !crate.nativeBody.destroyed).map(crate => ({
    x: crate.nativeBody.x, y: crate.nativeBody.y, type: crate.nativeBody.type,
    self: false, blocked: !!nativeBodyAwake(crate.nativeBody), crate,
  }));
}
function nativeBarrelHitBodies() {
  return hazards.map(barrel => ({ x: barrel.nativeBody.x, y: barrel.nativeBody.y,
    type: 17, self: false, blocked: !!nativeBodyAwake(barrel.nativeBody), barrel }));
}
function detonateNativeBarrel(barrel) {
  nativeBarrelDetonation(barrel.nativeBody.x, barrel.nativeBody.y, {
    parent: category => category, allocate: () => true,
    blast: packet => explode(barrel.x, barrel.y, "barrel", barrel.hitOwner ?? -1, packet),
    flame: (allocation, parent, record) => spawnNativeFlame(record, barrel.hitOwner ?? -1),
    sound: queueGameSound,
  });
}
function removeNativeFlame(flame) {
  dispose(flame.mesh);
  if (nativeFlames[flame.slot] === flame) nativeFlames[flame.slot] = null;
}
function spawnNativeFlame(record, owner = -1) {
  const created = nativeFlameBody(record, matchRandom.frame, nativeFlameCounter,
    () => matchRandom.logicUint());
  nativeFlameCounter = created.nextCounter;
  const art = nativeFlameArt(created.body);
  const mesh = createOriginalObject(nativeSpriteIds.sprites[art.request[4]].name);
  const flame = { body: art.body, record: created.record, mesh, owner };
  registerNativeFlame(nativeFlames, flame, matchRandom.frame, removeNativeFlame);
  mesh.position.set(created.body.x / 65536, H - created.body.y / 65536, 26);
  group.add(mesh);
  return flame;
}
function stepNativeFlames() {
  const camera = []; let busy = false;
  for (const flame of [...nativeFlames]) {
    if (!flame || nativeFlames[flame.slot] !== flame) continue;
    const result = stepNativeFlame(flame.body, flame.record, {
      frame: matchRandom.frame, water: Math.floor(H - waterLevel),
      gravity: Math.round(0x3d70 * gravityScale), wind: Math.round(wind / 2500 * 65536),
    }, {
      collide: (x, y) => terrain.solid(x, H - y),
      candidates: () => [...nativeWormHitscanBodies(worms, null, H), ...nativeBarrelHitBodies()].sort((a, b) => a.type - b.type),
      hit: (target, event, size, packet) => applyNativeHitPackets([target], [{ body: 0, packet }], flame.owner),
      logicRandom: () => matchRandom.logicUint(), visualRandom: () => matchRandom.visualUint(),
      parent: () => 23, allocate: () => true,
      flame: (allocation, parent, record) => spawnNativeFlame(record, flame.owner),
      smoke: request => spawnOriginalSmoke([request]), sound: queueGameSound,
      camera: request => camera.push(request), busy: () => { busy = true; },
      delete: () => {},
      burn: (mask, x, y) => {
        terrain.craterRim ??= new Uint8Array(W * H);
        carveScenarioTool(terrain.data, W, H, toolCuts[mask], x, y, terrain.craterRim);
        terrainDirty = true;
      },
    });
    flame.body = result.body; flame.record = result.record;
    if (result.deleted) removeNativeFlame(flame);
  }
  return { camera, busy };
}
function spawnCrateContentsProjectile(payload, owner) {
  const p = { kind: "barrel", owner, age: 0, x: payload[2] / 65536,
    y: H - payload[3] / 65536, vx: payload[4] / 65536 * 50,
    vy: -payload[5] / 65536 * 50, fuse: payload[10] / 1000,
    bounce: payload[9] / 100, nativeCrateContents: true };
  attachNativeProjectileBlock(p, H, crateProjectileData.block, payload);
  if (nativeProjectilePlacementHit(p, terrain, worms, H)) {
    detonateNativeProjectile(p);
    return;
  }
  p.mesh = createNativeProjectileVisual(p.nativeRender);
  p.mesh.position.set(p.x, p.y, 40); group.add(p.mesh); bombs.push(p);
}
function detonateNativeCrate(crate) {
  // Set before blast dispatch so this crate cannot receive its own chain reaction.
  crate.nativeBody.destroyed = 1;
  nativeCrateDetonation({ ...crate.nativeBody,
    weapon: WEAPON_SLOTS[crate.content] ?? 0,
  }, [], {
    parent: category => category, allocate: () => true,
    blast: packet => explode(crate.x, crate.y, "barrel", crate.hitOwner ?? -1, packet),
    flame: (allocation, parent, record) => spawnNativeFlame(record, crate.hitOwner ?? -1),
    sound: queueGameSound,
    contents: slot => {
      crateDirectionBag = nativeCrateContents(crate.nativeBody, slot, 0, crateDirectionBag, {
        random: () => matchRandom.logicUint(), parent: () => 25, allocate: () => true,
        projectile: (allocation, parent, block, payload) => spawnCrateContentsProjectile(payload, crate.hitOwner ?? -1),
        sound: queueGameSound,
      });
    },
    // Target/mission crates are not part of the current host spawn pool.
    broadcast: () => {},
  });
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
        collisionBody: hit => nativeContactBody(hit),
        updateCollisionBody: (hit, body) => { updateNativeContactBody(hit, body); },
      }, (x, y, body) => nativeProjectileCollision(b, x, y, terrain, worms, H, body));
      b.age += dt;
      updateNativeProjectileAudio(sound ? audio : null, b);
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
        for (const request of result.sounds) nativeSoundQueue.enqueue(request);
        for (const event of result.events) {
          if (event.operation !== "sound") continue;
          if (event.timer) nativeSoundQueue.enqueue(event.request);
          else b.nativeContactPlayback = playNativeProjectileContactSound(audio, event.request, b.nativeContactPlayback);
        }
      }
      if (result.removed || result.detonate) {
        stopProjectileSound(b);
        bombs.splice(i, 1);
        releaseProjectileMesh(b.mesh);
        if (result.detonate) {
          detonateNativeProjectile(b);
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
function markNativePickupAction(w = worms[current]) {
  if (!w) return;
  w.nativePickupFlag = nativeWormPickupEvent({
    team: w.team, worm: worms.indexOf(w), field154: w.nativePickupFlag ?? 0,
  }, [w.team, worms.indexOf(w)]).field154;
}
function queryNativeWormPickup(w, body) {
  const actor = body ?? { x: Math.round(w.x * 65536) | 0, y: Math.round((H - w.y) * 65536) | 0 };
  const candidates = crates.map(crate => ({ crate, type: crate.nativeBody.type,
    x: crate.nativeBody.x, y: crate.nativeBody.y }));
  const candidate = nativePickupCandidate(actor, candidates, 0x200000,
    ({ crate }) => ({ kind: crate.nativeBody.kind }));
  if (!candidate) return 0;
  const kind = candidate.crate.nativeBody.kind;
  collectCrate(w, candidate.crate);
  return nativePickupCategory(kind);
}
function stepNativeWormPickup(w) {
  const state = nativeWormState(w);
  // Host turn ownership adapts native field104 until controller events41C/41D
  // are integrated. Pending health display is native damage field188.
  const active = Number(w === worms[current] && phase !== "over" && w.hp > 0);
  let flag = w.nativePickupFlag ?? 0;
  if (w.nativePickupState !== state)
    flag = nativeWormPickupTransition(flag, active, state);
  const body = nativeWormPickupTick({ state, field104: active, field154: flag,
    field188: w.nativeHealthDisplay.pending, team: w.team, worm: worms.indexOf(w),
  }, () => queryNativeWormPickup(w));
  w.nativePickupFlag = body.field154;
  w.nativePickupState = state;
}
function advanceScenarioProgress(crate) {
  if (!crate.scenario || !scenarioProgress || scenarioProgress.total <= 0 ||
      (crate.scenario.kind !== "weapon" && crate.scenario.kind !== "target")) return;
  scenarioProgress.collected = (scenarioProgress.collected + 1) | 0;
  const points = crate.scenario.bonusPoints | 0;
  const turns = crate.scenario.bonusTurns | 0;
  if (points) scenarioProgress.score = (scenarioProgress.score + points) | 0;
  if (turns) time += turns;
  scenarioProgress.complete = scenarioProgress.collected >= scenarioProgress.total;
  const bonus = `${points ? ` +${points}pt` : ""}${turns ? ` +${turns}s` : ""}`;
  announce(scenarioProgress.complete
    ? `SCENARIO TARGETS COMPLETE ${scenarioProgress.collected}/${scenarioProgress.total}${bonus}`
    : `SCENARIO TARGET ${scenarioProgress.collected}/${scenarioProgress.total}${bonus}`);
  updateScenarioObjectiveHUD();
  if (scenarioProgress.complete) {
    // 00442000 groups WinningCondition1/3 into the objective mode; 0/2 keep
    // the ordinary elimination end conditions.
    if (currentScenario?.training || [1, 3].includes(currentScenario?.winningCondition)) {
      recordScenarioCompletion(currentScenario.path);
      recordScenarioScore(currentScenario.path, scenarioProgress.score);
      finishMatch(0, false);
    }
  } else spawnNextScenarioSequence();
}
function collectCrate(w, crate = crates[0]) {
  if (!crate || !crates.includes(crate)) return;
  const { kind, mesh, quantity } = crate;
  if (crate.scenario && !crate.content &&
      (crate.scenario.kind === "target" || crate.scenario.kind === "weapon")) {
    pickupLabel(w, "TARGET");
    $("#status").textContent = `${w.name} collects a scenario target.`;
    nativeRenderOrder.release(crate.nativeOrderId);
    dispose(mesh);
    crates.splice(crates.indexOf(crate), 1);
    advanceScenarioProgress(crate);
    updateUI();
    return;
  }
  let label;
  // Content keys adapt the current host inventory to native transfer callbacks;
  // numeric slot ownership and donor inventories remain separate integration work.
  const inventory = kind === "utility" ? utilityAmmo : ammo;
  nativeCrateTransfer({kind:crate.nativeBody.kind,weapon:crate.content,quantity,health:quantity},
    w.team,worms.indexOf(w),{
      addAmmo:(team,key,amount)=>{inventory[team][key]=addAmmo(inventory[team][key],amount);},
      weaponMessage:(_team,key,amount)=>{
        label=`+${amount} ${(WEAPONS[key] || UTILITIES[key] || AUTOMATIC_UTILITIES[key]).label}`;
      },
      health:(_team,index)=>worms[index].hp,
      setHealth:(_team,index,hp)=>{worms[index].hp=hp;},
      healthMessage:(_team,amount)=>{label=`+${amount} HP`;},
    });
  pickupLabel(w, label);
  $("#status").textContent = `${w.name} grabs a supply crate: ${label}.`;
  nativeRenderOrder.release(crate.nativeOrderId);
  dispose(mesh);
  crates.splice(crates.indexOf(crate), 1);
  dispatchWormEntryAudio(w, nativeCratePickupAudio(crate.nativeBody.kind, w.team + 1, (_team, slot) => slot));
  // Pickup event3EF is broadcast: health cures the entire collecting team.
  for (const target of worms) target.nativePoison = nativeWormPoisonPickup(
    { ...target.nativePoison, team: target.team }, [w.team, worms.indexOf(w), nativePickupCategory(crate.nativeBody.kind)]);
  poisoned = worms.some(target => target.nativePoison.amount !== 0);
  nativeRecordPickup(w.matchStats, nativePickupCategory(crate.nativeBody.kind));
  advanceScenarioProgress(crate);
  w.matchStats.hp = w.hp;
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
function dispatchWormEntryAudio(worm, calls) {
  if (!sound) return;
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  playNativeWormEntryAudio(audio, worm, calls);
}
function freezeNativeTeam(targetTeam) {
  freezeTeam(worms, targetTeam);
  for (const w of worms) if (w.team === targetTeam && w.hp > 0)
    dispatchWormEntryAudio(w, [{ operation: "sound", request: [24, 3, 65536, 65536, 0] }]);
}
function beginTurn() {
  if (nativeBusy.value !== 0 || nativeAnnouncementsPending(nativeAnnouncements) || nativeWaterRise?.progress >= 0 || nativeNuclearEffect?.progress >= 0) {
    pendingTurnStart = true;
    phase = "settle";
    return;
  }
  // An activation-stage poison pass must settle before thaw/team setup.
  if (pendingPoisonSettlement || worms.some(w => w.nativeHealthDisplay.active || w.nativeHealthDisplay.pending)) {
    pendingTurnStart = true;
    phase = "settle";
    if (pendingPoisonSettlement) advanceNativePoisonSettlement();
    return;
  }
  if (!advanceNativeEnvironmentSettlement()) {
    pendingTurnStart = true;
    phase = "settle";
    return;
  }
  pendingTurnStart = false;
  if (invisibleTeam !== null) {
    for (const w of worms) w.invisible = false;
    invisibleTeam = null;
  girderAngle = 0;
  girderLength = 64;
  }
  // 004B3210 resets the shared environment before the next team's turn.
  // Preserve the selected browser match modifier as the baseline.
  gravityScale = modifierSettings(modifier).gravityScale;
  damageMultiplier = 1;
  automaticUtilityState = { doubleTime: 0, crateShower: 0, crateTimer: 0, crateCount: 0 };
  crateShowerPool = null; crateShowerUsed = []; crateShowerAmmo = null;
  matchDamageSourceActive = false;
  nativeDamageReaction = { ...createNativeDamageReaction(), firstBlood: nativeDamageReaction.firstBlood };
  nativeClockTarget = 65536;
  const inventory = weaponDelays[team];
  weaponDelays[team] = advanceNativeDelays(inventory.turns, inventory.delays);
  shotgunRemaining = 0;
  homingTarget = null;
  stopRope();
  stopJetpack();
  targetUtility = null;
  activeUtility = null;
  parachuteArmed = false;
  bungeeArmed = false;
  laserSight = false;
  invisibleTeam = null;
  utilitiesOpen = false;
  specialOpen = false;
  // Native team event 0x41C broadcasts thaw (0x412) before turn setup.
  for (const w of worms) if (w.team === team) {
    // 004B3210 clears temporary team modifiers at the next own turn.
    w.nativeTeamModifiers = (w.nativeTeamModifiers || 0) & 0xffffffe8;
    if (w.hp > 0 && w.frozen > 0)
      dispatchWormEntryAudio(w, [{ operation: "sound", request: [25, 3, 65536, 65536, 0] }]);
    w.frozen = 0;
  }
  // Native420 follows team activation and resets every worm infection latch.
  for (const w of worms) w.nativePoison = nativeWormPoisonTurnReset(w.nativePoison);
  // 004B64B0 schedules426 for settlement after this team finishes.
  pendingPoisonSettlement = 1;
  pendingEnvironmentSettlement = Number(suddenDeath && ["water", "health", "nuke"].includes(suddenDeathType));
  const roster = worms.filter((w) => w.team === team);
  if (!roster.some((w) => w.hp > 0)) return endGame();
  const selection = nativeWormRotation({ health: roster.map(w => w.hp), previous: lastSelectedWorm[team] });
  if (!selection.selected) return endGame();
  lastSelectedWorm[team] = selection.selected;
  const active = roster[selection.selected - 1];
  current = worms.indexOf(active);
  reactionOrigin = { x: Math.round(active.x * 65536) | 0, y: Math.round((H - active.y) * 65536) | 0 };
  matchDamageSourceActive = true;
  active.nativePlacedAction = null;
  active.nativeFireInput = null;
  phase = "aim";
  cameraSnap = true; manualCamera = null;
  wormLocked = false;
  time = turnSeconds;
  stepScenarioTimedEvents();
  applyScenarioSuddenDeathDamage();
  updateAutomaticUtilities();
  nativeClockPresentation.displayed = turnSeconds * 1000;
  nativeClockPresentation.warned = 0;
  const scenarioWind = currentScenario ? {
    strength: currentScenario.windStrength ?? nativeDefaultWind.strength,
    fixed: currentScenario.fixedWind ?? nativeDefaultWind.fixed,
  } : nativeDefaultWind;
  const selectedWind = nativeWindSelection({ ...scenarioWind,
    x: Math.round(active.x * 65536) | 0,
    previous: Math.round(wind / 2500 * 65536) | 0,
  }, () => matchRandom.logicUint());
  wind = selectedWind.wind / 65536 * 2500;
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
  tickOriginalWindHUD(wind, false);
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
  updateScenarioObjectiveHUD();
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
  const key = `${canAct()}|${!!pendingFire}|${weaponDelays[team].delays.join(",")}|${shotgunRemaining}|${current}|${phase}|${team}|${mode}|${weapon}|${replaying}|${charging}|${retreat > 0}|${menu.open}|${wormLocked}|${suddenDeath}|${poisoned}|${utilitiesOpen}|${activeUtility}|${targetUtility}|${rope.attached}|${bungeeArmed}|${Math.ceil(rope.length)}|${jetpack.active}|${Math.ceil(jetpack.fuel)}|${Object.values(loadout).join(",")}|${Object.values(utilityAmmo[team] ?? {}).join(",")}|${worms[current]?.nativeTeamModifiers || 0}|${specialOpen}|${worms.map((w) => `${w.hp}:${w.knocked}`).join(",")}`;
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
  $("#fire").disabled = !canStopTool() && (
    (!shotgunRemaining && availableAmmo(loadout, weapon) <= 0) ||
    !canAct() ||
    worms[current]?.knocked ||
    Boolean(targetUtility) ||
    rope.attached ||
    jetpack.active);
  $("#angle").disabled =
    !canAct() ||
    charging ||
    weapon === "mine" ||
    weapon === "dynamite" ||
    WEAPONS[weapon]?.special === "airstrike" ||
    ["prod", "axe", "firepunch", "dragonball", "drill"].includes(weapon);
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
    .forEach((b) => (b.disabled = !canMove() &&
      !(b.id === "jump" && worms[current]?.originalJumpPreparation && !menu.open && !replaying)));
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
      (kind === "fastwalk" && Boolean(worms[current].nativeTeamModifiers & 2)) ||
      (kind === "lowgravity" && Boolean(worms[current].nativeTeamModifiers & 1)) ||
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
            ? (activeUtility === "bridgekit" ? "▬ AIM" : "▰ AIM")
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
      utilityStatus.textContent = `${rope.body.state === 0x7c ? "Bungee" : "Rope"}: ${Math.round(rope.length)} px · ↑↓ length · ←→ swing · R release`;
    else if (jetpack.active)
      utilityStatus.textContent = `Jet pack fuel ${Math.ceil(jetpack.fuel)} · arrows move · R stops`;
    else if (bungeeArmed)
      utilityStatus.textContent = "Bungee armed. Walk off a ledge; jump or R releases.";
    else if (parachuteArmed)
      utilityStatus.textContent =
        "Parachute armed. It will deploy on a hard fall.";
    else utilityStatus.textContent = "";
  }
}
function canAct() {
  return (
    !mapLoading &&
    phase === "aim" &&
    !pendingFire &&
    !rope.firing &&
    !worms[current]?.originalJumpPreparation &&
    !worms[current]?.originalRecovery &&
    (!worms[current]?.nativeHurtBody || worms[current].nativeHurtBody.state === 0x73) &&
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
    !worms[current]?.originalJumpPreparation &&
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
  lastSelectedWorm[team] = worms.filter(w => w.team === team).indexOf(next) + 1;
  reactionOrigin = { x: Math.round(next.x * 65536) | 0, y: Math.round((H - next.y) * 65536) | 0 };
  cancelCharge();
  power = 0;
  charging = false;
  chargeSource = null;
  next.facing = team ? -1 : 1;
  angle = team ? 135 : 45;
  cameraSnap = true; manualCamera = null;
  wormLocked = false;
  setWeapon(teamWeapon[team] || "rocket");
  updateSliders();
  $("#status").textContent =
    `${next.name} selected. Choose a worm, then move or fire.`;
  updateUI();
}
function skipTurn() {
  if (!canAct()) return;
  playSkipTurnSpeech();
  cancelCharge();
  stopRope();
  stopJetpack();
  parachuteArmed = false;
  bungeeArmed = false;
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
  for (const w of worms) { w.originalRope = null; w.nativeRopeBody = null; }
  if (rope.tip) dispose(rope.tip);
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
  if (activeUtility === "rope" || activeUtility === "bungee") activeUtility = null;
}
function stopJetpack() {
  for (const w of worms) {
    releaseNativeJetpackFlight(w);
    stopOriginalJetpack(w);
  }
  jetpack = {
    active: false,
    fuel: nativeJetpackInitialFuel / 65536,
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
function girderSprite(angle = girderAngle, length = 64) {
  const index = Math.max(0, Math.min(8, 4 - Math.round(angle / 22.5)));
  return originalGirder(`grd${length > 72 ? "l" : "s"}${index}`);
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
    const memory = new Uint8Array(0x194), placement = new DataView(memory.buffer);
    // 004D5A40 supplies the placement mask at190. Current authored maps use
    // open sky; the native ceiling flag will follow the future map adapter.
    for (const [offset,value] of [[0x40,w.nativeFlight?.flags ?? 0x420cc6],
      [0x90,Math.round(w.x*65536)],[0x94,Math.round((H-w.y)*65536)],
      [0xb8,w.nativeFlight?.sleeping ?? 0],[0x190,0x21cce]]) placement.setInt32(offset,value,true);
    const target = nativeTeleportPlacement(memory,Math.round(x*65536),Math.round((H-y)*65536),0,
      (body,px,py)=>nativeSceneCollision(w,body,px/65536,H-py/65536,terrain,worms,H));
    if (!target.accepted) {
      $("#status").textContent = "Teleport blocked. Choose an empty spot.";
      return;
    }
    utilityAmmo[team].teleport = spendAmmo(utilityAmmo[team].teleport);
    w.nativeFlight = null;
    w.vx = w.vy = 0;
    startOriginalTeleport(w, target.x/65536, H-target.y/65536);
    queueWormCamera(w);
    finishUtilityTurn("Teleporting. Turn ends after arrival.");
    return;
  }
  if (targetUtility === "girder") {
    const sprite = girderSprite(girderAngle, girderLength);
    if (!sprite) return;
    const target = nativeClampPlacementTarget(Math.round(x*65536),Math.round((H-y)*65536),
      sprite.width,sprite.height,0);
    const px = target[0]>>16, py = target[1]>>16;
    if (!nativeSceneGirderPlacement(terrain,worms,[...mines,...crates,...hazards],
      W,H,w,px,py,sprite)) {
      $("#status").textContent = "Girder blocked or out of range. Choose an empty spot closer to your worm.";
      return;
    }
    // Convert the validated native bitmap row to the same host terrain row.
    if (!addGirder(px, H-1-py, girderAngle, girderLength)) return;
    const placedKind = activeUtility === "bridgekit" ? "bridgekit" : "girder";
    utilityAmmo[team][placedKind] = spendAmmo(utilityAmmo[team][placedKind]);
    activeUtility = null;
    finishUtilityTurn(placedKind === "bridgekit" ? "Bridge placed. Turn over." : "Girder placed. Turn over.");
  }
}
function useUtility(kind) {
  if (!canAct() || charging || shotgunRemaining) return;
  if (kind !== "bungee") bungeeArmed = false;
  if (kind === "bungee" && rope.attached && rope.body.state === 0x7c) {
    releaseRope();
    closeUtilities();
    return;
  }
  if (kind === "jetpack" && jetpack.active) {
    stopJetpack();
    closeUtilities();
    return;
  }
  const count = displayAmmo(utilityAmmo[team]?.[kind] ?? 0);
  if (count <= 0 && !(kind === "laser" && laserSight)) {
    $("#utility-status").textContent = "None left. Find a field-kit crate.";
    return;
  }
  if (targetUtility) {
    targetUtility = null;
    activeUtility = null;
    updateUI();
    return;
  }
  markNativePickupAction();
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
  if (kind === "bungee") {
    if (rope.attached) releaseRope();
    else { bungeeArmed = true; parachuteArmed = false; }
    utilitiesOpen = false;
    updateUI();
    return;
  }
  if (kind === "parachute") {
    bungeeArmed = false;
    parachuteArmed = true;
    activeUtility = null;
    utilitiesOpen = false;
    $("#utility-status").textContent =
      "Parachute armed. It deploys automatically on a hard fall.";
    updateUI();
    return;
  }
  if (kind === "laser") {
    laserSight = !laserSight;
    if (laserSight) {
      utilityAmmo[team].laser = spendAmmo(utilityAmmo[team].laser);
      activeUtility = "laser";
    } else activeUtility = null;
    utilitiesOpen = false;
    $("#utility-status").textContent = laserSight
      ? "Laser sight active. The red line follows your aim."
      : "Laser sight off.";
    updateUI();
    return;
  }
  if (kind === "invisibility") {
    invisibleTeam = team;
    for (const w of worms) if (w.team === team) w.invisible = true;
    utilityAmmo[team].invisibility = spendAmmo(utilityAmmo[team].invisibility);
    activeUtility = null;
    utilitiesOpen = false;
    $("#utility-status").textContent = "Squad cloaked until the next turn.";
    updateUI();
    return;
  }
  if (kind === "bridgekit") {
    targetUtility = "girder";
    activeUtility = "bridgekit";
    girderAngle = 0;
    girderLength = 64;
    utilitiesOpen = false;
    $("#status").textContent = "Click or tap to place a bridge.";
    updateUI();
    return;
  }
  if (kind === "fastwalk" || kind === "lowgravity") {
    const flag = kind === "fastwalk" ? 2 : 1;
    if (worms[current].nativeTeamModifiers & flag) return;
    // 004FCF47: utility subtype19 ORs the record's bit into team flags.
    // Original slot64 uses bit1; movement consumes it in004DD2B0.
    for (const w of worms) if (w.team === team)
      w.nativeTeamModifiers = (w.nativeTeamModifiers || 0) | flag;
    if (kind === "lowgravity") {
      const environment = nativeTeamEnvironment(
        { damageMultiplier: 1, gravityPercent: 100 }, worms[current].nativeTeamModifiers,
      );
      gravityScale = environment.gravity / 0x3d70;
    }
    utilityAmmo[team][kind] = spendAmmo(utilityAmmo[team][kind]);
    utilitiesOpen = false;
    updateUI();
    return;
  }
  if (kind === "teleport" || kind === "girder") {
    targetUtility = kind;
    activeUtility = kind;
    if (kind === "girder") { girderAngle = 0; girderLength = 64; }
    utilitiesOpen = false;
    $("#status").textContent =
      kind === "teleport"
        ? "Click or tap an empty spot to teleport."
        : "Click or tap to place a girder.";
    updateUI();
    return;
  }
  if (kind === "freeze") {
    freezeNativeTeam(team);
    playSkipTurnSpeech();
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
    fuel: nativeJetpackInitialFuel / 65536,
    owner: current,
    pulse: 0,
    pulseTime: 0,
  };
  activeUtility = "jetpack";
  wormLocked = true;
  const w = worms[current];
  if (w.nativeHurtBody?.state === 0x73) { w.nativeHurtBody = null; w.originalHurt = null; }
  attachNativeJetpackFlight(w, { height: H });
  w.originalParachute = null;
  stepOriginalJetpack(w, 0, 0);
  utilitiesOpen = false;
  $("#status").textContent =
    "Jet pack on. Up thrusts; left/right steer; R stops.";
  updateUI();
}
function stepJetpack(w, dt) {
  if (!jetpack.active || jetpack.owner !== current) return;
  if (jetpack.pulseTime > 0) {
    jetpack.pulseTime = Math.max(0, jetpack.pulseTime - dt);
  }
  const thrust =
    aimInput + (jetpack.pulseTime > 0 ? jetpack.pulse : 0);
  const result = stepNativeJetpackFlight(w, {
    height: H, waterLevel, gravityScale, wind, frame: matchRandom.frame, index: current,
    horizontal: move, vertical: thrust,
    pickup: body => queryNativeWormPickup(w, body),
    collisionBody: hit => nativeContactBody(hit),
    updateCollisionBody: (hit, body) => { updateNativeContactBody(hit, body); },
  }, (x, y, body) => nativeSceneCollision(w, body, x, y, terrain, worms, H));
  dispatchNativeWormMotionEvents(w, result);
  if (result.body.state !== 0x78) { stopJetpack(); return; }
  w.moving = Boolean(move);
  const jetpackState = stepOriginalJetpack(w, move, thrust);
  jetpack.fuel = jetpackState.fuel / 65536;
  if (jetpackState.target === 0x65) stopJetpack();
}
function makeRopeLine(anchor, w) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(anchor.x, anchor.y, 30),
    new THREE.Vector3(w.x, w.y, 30),
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
  if (rope.firing || !canAct() || charging || targetUtility) return;
  if (rope.attached) { releaseRope(); return; }
  const w = worms[current];
  const flight = w.nativeHurtBody?.state === 0x73 ? w.nativeHurtBody : null;
  const body = flight ? refireNativeRope(flight, queueGameSound) : createNativeRopeShot(w, angle, H, queueGameSound);
  if (!body.ropeFiring) {
    $("#status").textContent = "No rope shots remaining before landing.";
    return;
  }
  if (flight) Object.assign(flight, body);
  rope = { attached: false, firing: true, body, anchor: null, length: 0,
    tip: createOriginalVisual("ropetip"), mesh: makeRopeLine({ x: w.x, y: w.y }, w) };
  if (rope.tip) {
    // Original004F80C0 renders sprite646 at progress0x8000-ropeAngle.
    const art = originalVisual("ropetip");
    const frame = nativeSpriteFrame(art.count, art.flags, 0x8000 - body.ropeAngle);
    rope.tip.material.map = originalVisual("ropetip", frame).map;
    rope.tip.userData.originalFrame = frame;
    rope.tip.position.set(w.x, w.y, 31);
    group.add(rope.tip);
  }
  activeUtility = "rope";
  wormLocked = true;
  utilitiesOpen = false;
  $("#status").textContent = "Rope firing…";
  updateUI();
}
function stepRopeShot(w) {
  if (!rope.firing) return;
  if (w.hp <= 0 || w.frozen || w.knocked || (w.nativeHurtBody && w.nativeHurtBody.state !== 0x73) || phase !== "aim") {
    stopRope(); return;
  }
  const result = stepNativeRopeShot(rope.body, w, H,
    (x, y) => terrain.solid(x, H - y),
    (body, x, y) => nativeSceneCollision(w, body, x / 65536, H - y / 65536, terrain, worms, H));
  rope.body = result.body;
  if (w.nativeHurtBody?.state === 0x73) {
    // The airborne body owns physics while the tip travels.
    for (const key of ["ropeFiring", "ropeProgress", "ropeRemaining", "ropeAngle", "ropeLength"])
      w.nativeHurtBody[key] = result.body[key];
  }
  w.x = result.body.x / 65536;
  w.y = H - result.body.y / 65536;
  for (const call of result.calls) if (call.operation === "sound") queueGameSound(call.request);
  if (rope.tip) rope.tip.position.set(result.tip.x, result.tip.y, 31);
  const positions = rope.mesh.geometry.attributes.position;
  positions.setXYZ(0, result.tip.x, result.tip.y, 30);
  positions.setXYZ(1, w.x, w.y, 30);
  positions.needsUpdate = true;
  if (result.body.constrained) {
    const body = result.body;
    const hit = { x: body.anchorX / 65536, y: H - body.anchorY / 65536 };
    if (rope.tip) dispose(rope.tip);
    dispose(rope.mesh);
    attachRope(w, hit, body.length / 65536, body);
  } else if (!result.body.ropeFiring) {
    stopRope();
    $("#status").textContent = "No rope anchor there. Aim at the island.";
    updateUI();
  }
}
function attachRope(w, hit, length, body) {
  w.nativeFlight = null;
  w.nativeHurtBody = null; w.originalHurt = null; w.knocked = false;
  rope = {
    attached: true,
    anchor: hit,
    length, body,
    mesh: null,
  };
  w.nativeRopeBody = body;
  rope.mesh = makeRopeLine(hit, w);
  rope.mesh.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(65 * 3), 3));
  rope.cuff = createOriginalVisual("ropecuff");
  if (rope.cuff) group.add(rope.cuff);
  updateRopeVisual(w);
  w.ground = false;
  w.originalParachute = null;
  activeUtility = body.state === 0x7c ? "bungee" : "rope";
  wormLocked = true;
  utilitiesOpen = false;
  $("#status").textContent =
    body.state === 0x7c ? "Bungee attached. Arrows swing and stretch; jump or R releases." :
      "Rope attached. Left/right swing; up/down shorten; R release.";
  updateUI();
}
function tryBungee(w) {
  if (displayAmmo(utilityAmmo[team].bungee ?? 0) <= 0) return;
  const input = createNativeBungeeBody(w, H, Math.round(0x3d70 * gravityScale));
  const result = tryNativeBungee(input, { weapon: { type: 4, subtype: 7 }, height: H }, {
    collide: (body, x, y) => nativeSceneCollision(w, body, x / 65536, H - y / 65536, terrain, worms, H),
    voice: (_body, { request }) => request[1],
    sound: (_body, { request }) => {
      if (sound) {
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        audio.resume();
        queueControllerSpeech(request,w);
      }
    },
    launchSetup: body => nativeLaunch({ '0x68': 4, '0x6c': 7 },
      { x: body.x, y: body.y, angle: body.aim, facing: body.facing }),
    // Utility subtype7 creates no projectile; the constraint already exists.
    finish: () => { utilityAmmo[team].bungee = spendAmmo(utilityAmmo[team].bungee); },
  });
  if (!result.body.constrained) return;
  const body = result.body;
  bungeeArmed = false;
  w.x = body.x / 65536; w.y = H - body.y / 65536;
  attachRope(w, { x: body.anchorX / 65536, y: H - body.anchorY / 65536 }, body.length / 65536, body);
  $("#status").textContent = "Bungee attached. Arrows swing and stretch; jump or R releases.";
}
function releaseRope() {
  if (!rope.attached) return;
  const w = worms[current], body = rope.body;
  stopRope();
  attachNativeRopeReleaseFlight(w, body, H);
  wormLocked = true;
  $("#status").textContent = "Rope released.";
  updateUI();
}
function toggleRope() {
  if (rope.attached) releaseRope();
  else fireRope();
}
function dispatchNativeWormMotionEvents(w, result) {
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
          { index: call.slot }, target.nativeHitVoicePlayback,target.nativeSpeechBank);
      }
      continue;
    }
    if (call.operation === "jetpackContactSound" && sound) {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      w.nativeHitVoicePlayback = playNativeOwnedSound(audio, call.request, w.nativeHitVoicePlayback);
    }
    if (call.operation === "waterSound" && sound) {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      nativeSoundQueue.enqueue(call.request);
    }
    if (call.operation === "health") injure(w, call.request[0], 0, true);
    if (call.operation === "particle")
      spawnNativeParticleRequest(call.request);
    if (call.operation === "voice" && sound) {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      w.nativeHitVoicePlayback = playNativeHitVoice(
        audio,
        { index: call.slot },
        w.nativeHitVoicePlayback,w.nativeSpeechBank,
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
}
function stepRope(w, dt) {
  if (!rope.attached || w !== worms[current]) return;
  const events = [];
  const motion = nativeWormMotionCallbacks(w, {
    frame: matchRandom.frame, random: () => matchRandom.logicUint(),
    pickup: body => queryNativeWormPickup(w, body),
    collisionBody: hit => nativeContactBody(hit),
    updateCollisionBody: (hit, body) => { updateNativeContactBody(hit, body); },
  }, (x, y, body) => nativeSceneCollision(w, body, x / 65536, H - y / 65536, terrain, worms, H), events);
  rope.body.soundHandle = w.nativeHitVoicePlayback ? 1 : 0;
  rope.body.field154 = w.nativePickupFlag ?? 0;
  rope.body = stepNativeRopeSwing(rope.body, {
    left: move < 0, right: move > 0, up: aimInput > 0, down: aimInput < 0,
  }, {
    frame: matchRandom.frame, index: current, earthquake: 0,
    waterY: Math.floor(H - waterLevel), gravity: Math.round(0x3d70 * gravityScale),
  }, {
    motion,
    solid: (x, y) => terrain.solid(x, H - y),
    collide: (body, x, y) => nativeSceneCollision(w, body, x / 65536, H - y / 65536, terrain, worms, H),
    otherType: hit => nativeContactBody(hit).type,
    pickup: body => queryNativeWormPickup(w, body),
    stopSound: () => { w.nativeHitVoicePlayback?.stop(); w.nativeHitVoicePlayback = null; },
    sound: (...request) => {
      if (sound) {
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        audio.resume();
        w.nativeHitVoicePlayback = playNativeRopeContactSound(audio, request);
      }
      return w.nativeHitVoicePlayback ? 1 : 0;
    },
  });
  const body = rope.body;
  w.nativeRopeBody = body;
  w.x = body.x / 65536; w.y = H - body.y / 65536;
  w.vx = body.vx / 65536 * 50; w.vy = -body.vy / 65536 * 50;
  rope.length = body.length / 65536;
  w.ground = false;
  w.moving = Boolean(move);
  w.facing = move < 0 ? -1 : move > 0 ? 1 : w.facing;
  if (!body.constrained) {
    stopRope();
    if (body.state === 0x65) attachNativeFallingFlight(w, { height: H });
    else { w.nativeHurtBody = body; w.knocked = true; }
  }
  dispatchNativeWormMotionEvents(w, { body, events });
}
function updateRopeVisual(w) {
  if (!rope.mesh || !rope.attached) return;
  const bodyAngle = rope.body.angle;
  setOriginalRope(w, bodyAngle);
  if (rope.cuff) {
    const art = originalVisual("ropecuff");
    const index = nativeSpriteFrame(art.count, art.flags, bodyAngle + 0x8100);
    rope.cuff.material.map = originalVisual("ropecuff", index).map;
    rope.cuff.userData.originalFrame = index;
    rope.cuff.position.set(rope.anchor.x, rope.anchor.y, 31);
  }
  const pos = rope.mesh.geometry.attributes.position;
  const points = nativeRopePoints(rope.body, H);
  points.forEach(([x, y], i) => pos.setXYZ(i, x, y, 30));
  rope.mesh.geometry.setDrawRange(0, points.length);
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
function advanceNativePoisonSettlement() {
  const result = nativePoisonSettlement({ selectedTeam: 0, selectedWorm: 0,
    mode: 1, poisonPending: pendingPoisonSettlement });
  pendingPoisonSettlement = result.body.poisonPending;
  for (const call of result.calls) {
    if (call.event === 0x400) {
      for (const flame of nativeFlames) if (flame)
        flame.body = nativeFlameEvent(flame.body, flame.record, 0x400);
    } else if (call.event === 0x426) applyPoisonTick();
  }
  return result.ready;
}
function advanceNativeEnvironmentSettlement() {
  // Browser modes still supply scheme choices; the native stage owns event
  // order, the one-second transition and one-shot pending-flag consumption.
  const result = nativeSuddenDeathRepeat({ pending: pendingEnvironmentSettlement,
    rise: WATER_RISE, dose: suddenDeathType === "nuke" ? 5 : suddenDeathType === "health" ? -1 : 0,
    nuclear: Number(suddenDeathType === "nuke") });
  pendingEnvironmentSettlement = result.pending;
  for (const call of result.calls) {
    if (call.event === 0x441) startNativeWaterRise(waterLevel + call.record[0], call.record[1]);
    else if (call.event === 0x423) {
      for (const w of worms)
        for (const [damage, force, uncapped] of nativeSuddenDeathHealth(w.hp, call.record[0]))
          accountWormDamage(w, damage, { force: !!force, uncapped: !!uncapped });
    }
    // Native registry refreshes clear cached totals. The host recomputes its
    // team totals each frame, so no cached values need invalidation here.
  }
  return !result.handled;
}
function applyPoisonTick() {
  let hits = 0;
  for (const w of worms) {
    const body = { ...w.nativePoison, state: nativeWormState(w) };
    for (const [damage, force, uncapped] of nativeWormPoisonDamage(body, w.hp)) {
      accountWormDamage(w, damage, { force: !!force, uncapped: !!uncapped });
      // Event426 only accounts damage; the next settlement pass reveals it.
      hits++;
    }
  }
  if (hits) $("#status").textContent = "Poison damages infected worms.";
  updateUI();
}
function startNativeWaterRise(targetLevel, duration = 8) {
  const target = Math.max(0, Math.floor(H - targetLevel));
  if (nativeWaterRise?.progress >= 0 && nativeWaterRise.target === (target << 16)) return;
  nativeWaterRise = nativeWaterRiseStart({ start: 0, target: 0, progress: -1, duration: 8,
    waterY: Math.floor(H - waterLevel), cameraTop: 0, cameraBottom: 0, bottom: 0, busy: 0,
  }, [Math.floor(H - waterLevel) - target, duration]);
  nativeBusy.wake();
}
function stepNativeWaterRise() {
  if (!nativeWaterRise || nativeWaterRise.progress < 0) return;
  nativeBusy.wake();
  const result = nativeWaterRiseTick(nativeWaterRise);
  nativeWaterRise = result.body;
  for (const call of result.calls) {
    if (call.operation === 'terrain') {
      if (clearNativeWaterRow(terrain, W, H, call.waterY)) terrainDirty = true;
    } else {
      // All live native body environments read this water bound each frame.
      waterLevel = H - call.waterY;
      water.userData.setLevel?.(waterLevel);
    }
  }
}
function stopNativeNuclearAudio() {
  for (const playback of nuclearPlaybacks.values()) playback.stop();
  nuclearPlaybacks.clear();
  if (nativeNuclearEffect) nativeNuclearEffect.handleA = nativeNuclearEffect.handleB = 0;
}
function startNativeNuclearEffect(duration = 8) {
  const result = nativeNuclearEffectStart(nativeNuclearEffect ?? { volume: 0, target: 0,
    handleA: 0, handleB: 0, flash: 0, fade: 0, shake: 0, busy: 0 }, duration, () => matchRandom.logicUint());
  nativeNuclearEffect = result.body;
  for (const { message } of result.calls)
    queueNativeAnnouncement(nativeAnnouncements, message.text, message.font);
}
function stepNativeNuclearEffect() {
  if (!nativeNuclearEffect) return;
  nativeNuclearEffect.shake = nativeCameraShakeDecay(nativeNuclearEffect.shake);
  if (!sound) stopNativeNuclearAudio();
  for (const [handle, field] of [[1, "handleA"], [2, "handleB"]]) {
    if (nuclearPlaybacks.get(handle)?.finished) {
      nuclearPlaybacks.get(handle).stop(); nuclearPlaybacks.delete(handle);
      nativeNuclearEffect[field] = 0;
    }
  }
  if (nativeNuclearEffect.progress >= 0) nativeBusy.wake();
  const result = nativeNuclearEffectTick(nativeNuclearEffect, request => {
    if (!sound) return 0;
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const handle = request[0] === 0x10004 ? 1 : 2;
    const playback = playNativeNuclearLoop(audio, request);
    if (!playback) return 0;
    nuclearPlaybacks.set(handle, playback);
    return handle;
  });
  nativeNuclearEffect = result.body;
  for (const call of result.calls) {
    if (call.operation === "volume") nuclearPlaybacks.get(call.handle)?.setVolume(call.volume / 65536);
    else if (call.operation === "stop") {
      nuclearPlaybacks.get(call.handle)?.stop(); nuclearPlaybacks.delete(call.handle);
    }
  }
  nativePaletteDisplay.update({ flash: result.body.flash, fade: result.body.fade });
}
function applySuddenDeath() {
  if (sdTriggered) return false;
  sdTriggered = true;
  suddenDeath = true;
  pendingPoisonSettlement = 1; // Native controller157 also schedules a pass on activation.
  pendingEnvironmentSettlement = Number(suddenDeathType === "water" || suddenDeathType === "health");
  const message = nativeSuddenDeathAnnouncement(() => matchRandom.logicUint());
  queueNativeAnnouncement(nativeAnnouncements, message.text, message.font);
  if (sound) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    nativeSoundQueue.enqueue([94, 8, 65536, 65536, 0]);
  }
  if (suddenDeathType === "water") {
    const rise = currentScenario?.suddenDeath?.waterRise || WATER_RISE;
    startNativeWaterRise(waterLevel + rise, 8);
    return false;
  }
  if (suddenDeathType === "health") {
    for (const w of worms)
      if (w.hp > 0) {
        for (const [damage, force, uncapped] of nativeSuddenDeathHealth(w.hp, -1))
          accountWormDamage(w, damage, { force: !!force, uncapped: !!uncapped });
        revealWormHealth(w);
        w.hurt = Math.max(w.hurt, 0.5);
      }
    updateUI();
    return false;
  }
  if (suddenDeathType === "nuke") {
    // The original controller emits these requests in order. Host rules still
    // supply the rise/dose until the scheme's environmental fields are live.
    const rise = currentScenario?.suddenDeath?.waterRise || WATER_RISE;
    const calls = nativeSuddenDeathActivation({ waterY: Math.floor(H - waterLevel),
      rise, dose: 5 });
    for (const call of calls) {
      if (call.operation === "camera") pendingEnvironmentCamera = call.point;
      else if (call.operation === "sound") queueGameSound(call.request);
      else if (call.event === 0x3f8) {
        if (nativeCameraFraming) nativeCameraFraming.suppression = -call.record[0];
      } else if (call.event === 0x441) startNativeWaterRise(waterLevel + call.record[0], call.record[1]);
      else if (call.event === 0x442) startNativeNuclearEffect(call.record[0]);
      else if (call.event === 0x439) {
        for (const w of worms) w.nativePoison = nativeWormPoisonInfect(
          { ...w.nativePoison, team: w.matchStats.team, worm: w.matchStats.worm, state: nativeWormState(w) }, call.record[0], {
            // Original430 rejects the zero-reportability infection record.
            announce: () => {
              const message = nativePoisonAnnouncement(w.name, () => matchRandom.logicUint());
              queueNativeAnnouncement(nativeAnnouncements, message.text, message.font);
            },
          });
      }
    }
    poisoned = worms.some(w => w.nativePoison.amount !== 0);
    updateUI();
    return false;
  }
  const totals = [0, 1].map((t) =>
    worms.filter((w) => w.team === t).reduce((sum, w) => sum + w.hp, 0),
  );
  const winner = totals[0] === totals[1] ? null : totals[0] > totals[1] ? 0 : 1;
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
// Capture backing state without changing the running match. Installation and
// audio/resource reconstruction are separate from this development audit hook.
function isReplayAudioResource(value) {
  return value && typeof value.stop === "function" && typeof value.displace === "function" && typeof value.setVolume === "function";
}
function captureMatchReplayState() {
  if (!terrain || mapLoading) throw new Error("Replay capture requires a loaded map");
  const resources = new Map(), resourceIds = new WeakMap();
  const resourceKey = value => {
    const isPlayback = isReplayAudioResource(value);
    if (!(value.isObject3D || value.isMaterial || value.isTexture || value instanceof Element || isPlayback)) return undefined;
    if (!resourceIds.has(value)) {
      const id = `resource:${resources.size}`;
      resourceIds.set(value,id); resources.set(id,value);
    }
    return resourceIds.get(value);
  };
  const state = {
    display: { palette: { flash: nativePaletteDisplay.flash.value, fade: nativePaletteDisplay.fade.value,
      dark: nativePaletteDisplay.dark.value }, waterFrame: water.userData.originalFrame ?? 0 },
    actors: { worms, projectile, particles, crates, mines, girders, graves, bombs, airstrikes, nativeFlames, hazards, nativeParticles, originalEffects, originalSmoke, originalDebris, waterBubbles },
    turn: { current, team, round, phase, wind, time, shotWait, lastSelectedWorm, mode, weapon, move, angle, power, aiWait,
      explosions, configuredDelays, nativeAnnouncements, pendingTurnStart, pendingPoisonSettlement, pendingEnvironmentSettlement,
      matchDamageSourceActive, nativeMatchStatistics, nativeDamageReaction, reactionOrigin, announcementVolume,
      weaponDelays, ammo, teamWeapon, waterLevel, suddenDeath, suddenDeathType, sdTriggered, poisoned, difficulty,
      format, seriesWins, seriesRound, breakTimer, nativeFlameCounter, crateDirectionBag, slowMo, weather, modifier,
      gravityScale, damageMultiplier, automaticUtilityState, blastScale, scheme, stockpile, crateRain, utilityAmmo,
      utilitiesOpen, specialOpen, activeUtility, targetUtility, homingTarget, shotgunRemaining, pendingFire, rope, jetpack,
      parachuteArmed, bungeeArmed, turnSeconds, turnTime, retreatSeconds, wormLocked, matchStarted, daily,
      aiPower, shotFuse, shotBounce, aiMoveTime, aiMoveDirection, aiRetreatTime, aiRetreatDirection, lastAiPlanMs, aiPlan, hitStop,
      charging, chargeFixed, chargeSource, aimInput, retreat, fuse, bounce, firedPower, shotCount, lastJump, jumpClock,
      selectionTick, labelMode, lastShot, lastResult, bannerTime, nativeClockProgress, nativeClockTarget, nativeClockPresentation,
      nativeTeamList, pendingEliminationTeam, nativeTeamHealthMaximum, nativeTeamHealthValues, nativeTeamPanelVisibility,
      toggleTeamPanelVisibility, nativeTeamPanel, smokeRandom, impactBag, bubbleSeed, nativeWaterRise, nativeNuclearEffect },
    controllers: { mineDudPool: { ...mineDudPool }, renderOrder: { ...nativeRenderOrder }, camera: { ...nativeCamera },
      busy: { ...nativeBusy }, soundQueue: { ...nativeSoundQueue } },
    camera: { nativeCameraFocus, nativeTeamRotation, nativeCameraFraming: nativeCameraFraming ? { ...nativeCameraFraming } : null, pendingWormCamera, pendingEnvironmentCamera,
      manualCamera, overview, cameraZoom, cameraX, cameraY, cameraSnap, view },
  };
  const actors = captureReplayActors([{id:"match",actor:state}],{resourceKey});
  const presentation = captureReplayResources(resources,resourceKey);
  return { environment: captureReplayEnvironment(terrain,matchRandom,W,H), actors, resources, presentation, terrain, sound };
}
function restoreMatchReplayState(snapshot) {
  if (snapshot.terrain !== terrain || mapLoading) throw new Error("Replay snapshot belongs to a different map");
  // Native constructors clear transient audio owners; saved WebAudio handles
  // can refer to stopped/displaced sources and must never be reinstalled.
  const resources = new Map([...snapshot.resources].map(([id,value]) => [id,isReplayAudioResource(value) ? null : value]));
  const state = restoreReplayActors(snapshot.actors,{resolveResource:id=>resources.get(id)}).get("match");
  // Prepare the saved graph before changing live state. Renderer resources can
  // have been removed/disposed since capture; Three recreates their GPU data.
  const currentSnapshot = captureMatchReplayState();
  for (const value of currentSnapshot.resources.values()) if (isReplayAudioResource(value)) value.stop();
  announcementPlayback?.stop(); announcementPlayback = null;
  stopNativeNuclearAudio();
  const savedResources = new Set(snapshot.resources.values());
  for (const object of currentSnapshot.resources.values()) {
    if (savedResources.has(object)) continue;
    if (object.isObject3D && object.parent === group) dispose(object);
    else if (object instanceof Element) object.remove();
  }
  restoreReplayEnvironment(snapshot.environment,terrain,matchRandom,W,H);
  restoreReplayResources(snapshot.presentation,resources);
  ({ worms, projectile, particles, crates, mines, girders, graves, bombs, airstrikes, nativeFlames, hazards } = state.actors);
  nativeParticles.splice(0,nativeParticles.length,...state.actors.nativeParticles);
  originalEffects.splice(0,originalEffects.length,...state.actors.originalEffects);
  originalSmoke.splice(0,originalSmoke.length,...state.actors.originalSmoke);
  originalDebris.splice(0,originalDebris.length,...state.actors.originalDebris);
  waterBubbles.splice(0,waterBubbles.length,...state.actors.waterBubbles);
  ({
    current, team, round, phase, wind, time, shotWait,
    lastSelectedWorm, mode, weapon, move, angle, power, aiWait,
    explosions, configuredDelays, nativeAnnouncements, pendingTurnStart, pendingPoisonSettlement, pendingEnvironmentSettlement, matchDamageSourceActive,
    nativeMatchStatistics, nativeDamageReaction, reactionOrigin, announcementVolume, weaponDelays, ammo, teamWeapon,
    waterLevel, suddenDeath, suddenDeathType, sdTriggered, poisoned, difficulty, format,
    seriesWins, seriesRound, breakTimer, nativeFlameCounter, crateDirectionBag, slowMo, weather,
    modifier, gravityScale, damageMultiplier, automaticUtilityState, blastScale, scheme, stockpile,
    crateRain, utilityAmmo, utilitiesOpen, specialOpen, activeUtility, targetUtility, homingTarget,
    shotgunRemaining, pendingFire, rope, jetpack, parachuteArmed, bungeeArmed, turnSeconds,
    turnTime, retreatSeconds, wormLocked, matchStarted, daily, aiPower, shotFuse,
    shotBounce, aiMoveTime, aiMoveDirection, aiRetreatTime, aiRetreatDirection, lastAiPlanMs, aiPlan,
    hitStop, charging, chargeFixed, chargeSource, aimInput, retreat, fuse,
    bounce, firedPower, shotCount, lastJump, jumpClock, selectionTick, labelMode,
    lastShot, lastResult, bannerTime, nativeClockProgress, nativeClockTarget, nativeClockPresentation, nativeTeamList,
    pendingEliminationTeam, nativeTeamHealthMaximum, nativeTeamHealthValues, toggleTeamPanelVisibility, smokeRandom, impactBag, bubbleSeed,
    nativeWaterRise, nativeNuclearEffect
  } = state.turn);
  Object.assign(nativeTeamPanelVisibility,state.turn.nativeTeamPanelVisibility);
  Object.assign(nativeTeamPanel,state.turn.nativeTeamPanel);
  Object.assign(mineDudPool,state.controllers.mineDudPool);
  Object.assign(nativeRenderOrder,state.controllers.renderOrder);
  Object.assign(nativeCamera,state.controllers.camera);
  Object.assign(nativeBusy,state.controllers.busy);
  Object.assign(nativeSoundQueue,state.controllers.soundQueue);
  ({ nativeCameraFocus, nativeTeamRotation, pendingWormCamera, pendingEnvironmentCamera,
    manualCamera, overview, cameraZoom, cameraX, cameraY, cameraSnap } = state.camera);
  nativeCameraFraming = state.camera.nativeCameraFraming ? Object.assign(Object.create(NativeCameraFraming.prototype),state.camera.nativeCameraFraming) : null;
  Object.assign(view,state.camera.view);
  // Root constructor clears nuclear loop ownership; its next tick rebuilds
  // those loops at the restored volume. Worm/contact voices remain cleared.
  if (nativeNuclearEffect) nativeNuclearEffect.handleA = nativeNuclearEffect.handleB = 0;
  const restoredProjectiles = [projectile,...bombs].filter(p => p?.nativeBody);
  if (sound && restoredProjectiles.some(p => p.nativeFuseSound)) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
  }
  for (const p of restoredProjectiles) restoreNativeProjectileAudio(sound ? audio : null,p);
  if (audio) cleanupOriginalReplayAudio(audio);
  accumulator=0; last=performance.now(); uiKey=""; timerKey="";
  nativePaletteDisplay.update(state.display.palette);
  water.userData.setLevel(waterLevel);
  water.userData.update(0, state.display.waterFrame);
  terrainDirty=false; paintTerrain(ctx,terrain,texture);
  updateSliders(); updateUI(); applyView();
}
function startReplay() {
  if (replaying || !lastShot || lastShot.points.length < 2) return;
  replaying = true;
  if (audio) cleanupOriginalReplayAudio(audio);
  cameraSnap = true; manualCamera = null;
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
    teamSpeech:[0,1].map(t=>$('#team-voice-'+t).value),
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
  saved.teamSpeech.forEach((bank,t)=>set('#team-voice-'+t,bank));
  sound = saved.sound;
  updateSoundButton();
}
function updateSliders() {
  $("#angle").value = angle;
  $("#angle-value").textContent = Math.round(angle) + "°";
  $("#fire").classList.toggle("charging", charging);
  const specialLabel = canStopTool() ? (pendingFire.kind === "drill" ? "STOP DRILL" : "STOP TORCH") : {
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
    drill: "DRILL",
    blowtorch: "BLOWTORCH",
    homing: homingTarget ? null : "SET TARGET",
    pigeon: homingTarget ? "FIRE PIGEON" : "SET TARGET",
    magic: homingTarget ? "FIRE MAGIC BULLET" : "SET TARGET",
    mortar: "FIRE MORTAR",
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
function canStopTool() {
  const w = worms[current];
  return ["drill", "blowtorch"].includes(pendingFire?.stage) && pendingFire.worm === w &&
    phase === "aim" && !menu.open && w.hp > 0 && !w.knocked && !w.frozen && w.hurt <= 0.35;
}
function startCharge(source) {
  // Original004F9FA0: Fire while in state6E returns directly to state65.
  // This precedes ammunition/ground checks: the action already spent its shot.
  if (canStopTool()) {
    const isTorch = pendingFire.kind === "blowtorch";
    if (isTorch) stopBlowtorch(); else stopDrill();
    pendingFire = null;
    finishAction(isTorch ? "Blowtorch stopped. Retreat!" : "Drilling stopped. Retreat!");
    updateSliders();
    return;
  }

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
  markNativePickupAction();
  manualCamera = null;
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
  if (weapon === "blowtorch") { fireBlowtorch(); return; }
  if (weapon === "drill") { fireDrill(); return; }
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
  const w = worms[current];
  if (WEAPON_SLOTS[weapon] !== undefined) {
    const record = nativeHitscanWeapon(weapon).record;
    if (record["0x68"] === 1) {
      const input = nativeFireInput({
        ...w.nativeFireInput, state: 0x67, weapon: WEAPON_SLOTS[weapon],
        enabled: 1, team: w.team, worm: current,
        shots: w.nativeFireInput?.shots ?? 0,
      }, record, { blocked: () => 0, random: () => matchRandom.logicUint(),
        voice: (_body, _record, { request }) => request[1] });
      w.nativeFireInput = input.body;
      if (sound) {
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        audio.resume();
        playNativeFireInputAudio(audio, w, input.calls, request => nativeSoundQueue.enqueue(request));
      }
      if (input.body.state === 0x69) {
        chargeFixed = input.body.power;
        power = chargeFixed / 65536 * 100;
        chargeSource = source;
        fire();
        chargeSource = null;
        updateSliders();
        return;
      }
    }
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
    markNativePickupAction();
    hideNativeTeamPanelAfterInput(nativeTeamPanel);
    wormLocked = true;
    move = direction;
    if (!rope.attached && !jetpack.active) turnFacing(direction);
  }
}
function adjustAim(direction, dt) {
  if (!canAct() || charging) return;
  markNativePickupAction();
  hideNativeTeamPanelAfterInput(nativeTeamPanel);
  const facing = worms[current].facing,
    elevation = facing > 0 ? angle : 180 - angle;
  const next = Math.max(-85, Math.min(90, elevation + direction * 65 * dt));
  angle = facing > 0 ? next : 180 - next;
  updateSliders();
}
function accountWormDamage(w, damage, options = {}) {
  const accounting = nativeDamageAccounting(
    {
      hp: w.hp,
      total: w.damageTaken ?? 0,
      displayed: w.nativeHealthDisplay.pending,
      reset: w.nativeHealthDisplay.progress,
      resetActive: w.nativeHealthDisplay.active,
      team: w.team,
      worm: worms.indexOf(w),
      state: nativeWormState(w),
    },
    damage,
    { multiplier: damageMultiplier, ...options },
  );
  // 004B4CE0 event0x430 -> 004C2A00: only attributed, reportable damage
  // enters match statistics. The host turn adapter supplies source presence.
  w.matchStats.hp = accounting.hp;
  if (matchDamageSourceActive)
    for (const event of accounting.events)
      if (event[3]) {
        nativeRecordMatchDamage(nativeMatchStatistics, w.matchStats, worms[current].matchStats, event[2]);
        nativeRecordDamageReaction(nativeDamageReaction, w.matchStats, worms[current].matchStats, event[2]);
      }
  w.hp = accounting.hp;
  w.damageTaken = accounting.total;
  w.nativeHealthDisplay.pending = accounting.displayed;
  w.nativeHealthDisplay.progress = accounting.reset;
  return accounting;
}
function injure(w, damage, direction = 0, native = false) {
  // Frozen state 0x88 bypasses weapon damage in events 0x404/0x433.
  if (w.hp <= 0 || damage <= 0) return;
  if (w.frozen > 0) {
    sfx("frozenhit");
    return;
  }
  accountWormDamage(w, damage);
  if (!native) {
    w.originalHurt = null;
    w.nativeHurtBody = null;
    w.nativeFlight = null;
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
  nativePlacedWeaponAction("mine", worms[current], H, spawnPlacedMine,
    () => finishAction("Mine planted. Retreat!"));
}
function registerLiveMine(mine,color) {
  const mineSlots = Array(24).fill(null);
  for (const old of mines) mineSlots[old.nativeSlot] = {
    frame: old.nativeCreatedFrame, x: old.nativeBody.x, y: old.nativeBody.y,
  };
  const registration = nativeMineRegistration(mineSlots, matchRandom.frame, color);
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
}
function spawnNaturalMine(request) {
  const payload={x:request.payload[2],y:request.payload[3],vx:request.payload[4],vy:request.payload[5]};
  const timer=nativeMineTimerFromRecord(request.record,request.placed);
  const mine={owner:-1,team:-1,arm:timer.arm/1000,nativeTimer:timer,
    nativeWater:{bubbleProgress:0,waterFlagsSet:0,splashActive:0},
    mesh:createOriginalObject("mineoff",4),bob:0};
  const collide=(x,y,body)=>nativeSceneCollision(mine,body,x/65536,H-y/65536,terrain,worms,H);
  mine.nativeBody=nativeMineBody(nativeMineBase(matchFriction),payload,timer.arm,matchFriction,collide);
  if(request.settle)mine.nativeBody=nativeSettleMineBody(mine.nativeBody,payload,Math.floor(H-waterLevel),collide);
  mine.x=mine.nativeBody.x/65536;mine.y=H-mine.nativeBody.y/65536;
  mine.mesh.position.set(mine.x,mine.y,18);group.add(mine.mesh);
  registerLiveMine(mine,0);
}
function spawnStrikeMine(payload) {
  const timer = { ...scenarioMineTimer(), damage: NATIVE_MINE_DAMAGE,
    placed: 0, forceBlast: 0, dud: 0 };
  const mine = { owner: -1, team: -1, arm: timer.arm / 1000, nativeTimer: timer,
    nativeWater: { bubbleProgress: 0, waterFlagsSet: 0, splashActive: 0 },
    mesh: createOriginalObject("mineoff", 4), bob: 0 };
  const collide = (x, y, body) =>
    nativeSceneCollision(mine, body, x / 65536, H - y / 65536, terrain, worms, H);
  mine.nativeBody = nativeMineBody(nativeMineBase(matchFriction), {
    x: Math.round(payload.x * 65536), y: Math.round((H - payload.y) * 65536),
    vx: Math.round(payload.vx / 50 * 65536), vy: Math.round(-payload.vy / 50 * 65536),
  }, timer.arm, matchFriction, collide);
  mine.x = mine.nativeBody.x / 65536;
  mine.y = H - mine.nativeBody.y / 65536;
  mine.mesh.position.set(mine.x, mine.y, 18);
  group.add(mine.mesh);
  registerLiveMine(mine, 0);
  return mine;
}
function scenarioMineTimer() {
  const timer = nativeMineInitialTimer();
  if (currentScenario?.mineFuse > 0) timer.fuse = Math.round(currentScenario.mineFuse * 1000);
  return timer;
}
function spawnPlacedMine(release) {
  const w = worms[current],
    mesh = createOriginalObject("mineoff", 4);
  const mine = {
    ...release,
    owner: current,
    team,
    arm: scenarioMineTimer().arm / 1000,
    nativeTimer: { ...scenarioMineTimer(), damage: NATIVE_MINE_DAMAGE, placed: 1, forceBlast: 0, dud: 0 },
    nativeWater: { bubbleProgress: 0, waterFlagsSet: 0, splashActive: 0 },
    mesh,
    bob: visualRandom() * Math.PI * 2,
  };
  mine.nativeBody = nativeMineBody(nativeMineBase(matchFriction), {
    x: Math.round(release.x * 65536), y: Math.round((H - release.y) * 65536),
    vx: Math.round(release.vx / 50 * 65536), vy: Math.round(-release.vy / 50 * 65536),
  }, mine.nativeTimer.arm, matchFriction, (x, y, body) =>
    nativeSceneCollision(mine, body, x / 65536, H - y / 65536, terrain, worms, H));
  mine.x = mine.nativeBody.x / 65536;
  mine.y = H - mine.nativeBody.y / 65536;
  mesh.position.set(mine.x, mine.y, 18);
  group.add(mesh);
  registerLiveMine(mine,team === 0 ? 2 : 0);
  ammo[team].mine = spendAmmo(ammo[team].mine);
  if (ammo[team].mine === 0) setWeapon("rocket");
  charging = false;
  chargeSource = null;
  w.recoil = 0.15;
  startOriginalRecoil(w, "mine", angle, matchRandom.frame);
  shotCount++; recordReactionWeaponUse("mine");
  tone(420, 0.1, "square");
  updateSliders();
  updateUI();
}
function recordReactionWeaponUse(kind) {
  nativeReactionWeaponUse(nativeDamageReaction, nativeReactionWeaponFlag(kind));
}
function finishAction(message) {
  if (currentScenario?.weaponsDontEndTurn && phase !== "over") {
    phase = "aim";
    retreat = 0;
    shotWait = 0;
    move = 0;
    wormLocked = false;
    $("#status").textContent = `${message} The turn continues.`;
    updateUI();
    return;
  }
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
// Original teleport relocation and drowning updates dispatch004D6760.
function queueWormCamera(w, priority = null) {
  if (priority !== null) {
    if (!nativeCameraFraming) {
      nativeCamera.reset();
      nativeCameraFraming = new NativeCameraFraming(
        Math.round(cameraX * 65536), Math.round((H - cameraY) * 65536), 1000 * 65536,
      );
    }
    nativeCamera.setPriority(priority);
    pendingWormCamera = [];
  }
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
  recordReactionWeaponUse(kind);
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
  // 004DF518: the carrier record supplies one queued cue at priority8.
  if (strike.sound) queueGameSound([strike.sound, 8, 65536, 65536, 0]);
}
function stepAirstrikes() {
  for (let i=airstrikes.length-1; i>=0; i--) {
    const strike=airstrikes[i], result=stepNativeAirstrike(strike,H);
    for (const call of result.calls) {
      if (call.operation === "camera") nativeCamera.offer(...call.request);
    }
    for (const mine of result.mines ?? []) spawnStrikeMine(mine);
    for (const missile of result.missiles) {
      if (nativeProjectilePlacementHit(missile,terrain,worms,H)) {
        detonateNativeProjectile(missile);
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
  nativePlacedWeaponAction("dynamite", worms[current], H, spawnPlacedDynamite,
    () => finishAction("Dynamite dropped. Five-second fuse — retreat!"));
}
function spawnPlacedDynamite(release) {
  const w = worms[current];
  spendSpecial("dynamite");
  w.recoil = 0.2;
  startOriginalRecoil(w, "dynamite", angle, matchRandom.frame);
  shotCount++; recordReactionWeaponUse("dynamite");
  const body = {
    ...release,
    fuse: 5, bounce: 0.3, owner: current, kind: "dynamite", age: 0,
  };
  attachNativeProjectile(body, H);
  if (sound) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    playNativeProjectileReleaseSound(audio, body.nativeRelease, request => nativeSoundQueue.enqueue(request), w);
  }
  if (nativeProjectilePlacementHit(body, terrain, worms, H)) {
    detonateNativeProjectile(body);
  } else {
    body.mesh = createOriginalVisual("dynamite");
    body.mesh.position.set(body.x, body.y, 40);
    group.add(body.mesh);
    bombs.push(body);
  }
}
function applyNativeAreaRequest(targets, request) {
  applyNativeHitPackets(targets, nativeAreaDamage(targets, request));
}
function applyNativeHitPackets(targets, dispatches, owner = current) {
    for (const dispatch of dispatches) {
      if (dispatch.sound) queueGameSound(dispatch.sound);
      if (dispatch.effect) spawnNativeParticleRequest(dispatch.effect);
      if (!dispatch.packet) continue;
      const crate = targets[dispatch.body].crate;
      if (crate) {
        crate.nativeBody = nativeCrateDirectHit(crate.nativeBody);
        crate.hitOwner = owner;
        continue;
      }
      const barrel = targets[dispatch.body].barrel;
      if (barrel) {
        barrel.nativeBody = nativeBarrelHit(barrel.nativeBody, 0x433, dispatch.packet);
        barrel.hitOwner = owner;
        continue;
      }
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
        if (call.sound && sound) {
          audio ??= new (window.AudioContext || window.webkitAudioContext)();
          audio.resume();
          victim.nativeContactPlayback = playNativeProjectileContactSound(audio, call.sound, victim.nativeContactPlayback);
        }
        if (call.voice) {
          victim.nativeHitVoiceFrame = call.voice.frame;
          if (sound) {
            audio ??= new (window.AudioContext || window.webkitAudioContext)();
            audio.resume();
            victim.nativeHitVoicePlayback = playNativeHitVoice(
              audio,
              call.voice,
              victim.nativeHitVoicePlayback,victim.nativeSpeechBank,
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
function dispatchPreparationAudio(worm, calls = []) {
  if (!sound || !calls.length) return;
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  for (const call of calls) {
    if (call.operation === "queuedSound") nativeSoundQueue.enqueue(call.request);
    else if (call.operation === "ownedSound")
      worm.nativeHitVoicePlayback = playNativeOwnedSound(audio, call.request, worm.nativeHitVoicePlayback);
  }
}
function beginWeaponPreparation(worm, kind, aim) {
  if (!startOriginalPreparation(worm, kind, aim)) return false;
  dispatchPreparationAudio(worm, worm.originalPreparation.audioCalls);
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
  const targets = [...nativeWormHitscanBodies(worms, w, H), ...nativeMineHitBodies(mines), ...nativeCrateHitBodies(), ...nativeBarrelHitBodies()].sort((a, b) => a.type - b.type);
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
  shotCount++; recordReactionWeaponUse(kind);
  wormLocked = true;
  if (resolution.area) {
    // 004F7DA0 selects every nearby body, including self, and emits 0x433.
    applyNativeAreaRequest(targets, resolution.area);
    terrain.craterRim ??= new Uint8Array(W * H);
    carveScenarioCrater(
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
  if (sound) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const playback = playNativeProjectileReleaseSound(audio, release, request => nativeSoundQueue.enqueue(request), w);
    if (burst && playback) burst.playback = playback;
  }
}
function dispatchFirePunchCalls(w, calls) {
  for (const call of calls) {
    if (call.operation === "terrain") {
      terrain.craterRim ??= new Uint8Array(W * H);
      carveScenarioTool(terrain.data, W, H, toolCuts[call.request[0]], call.request[1], call.request[2], terrain.craterRim);
      terrainDirty = true;
    } else if (call.operation === "particle") spawnNativeParticleRequest(call.request);
    else if (call.operation === "camera") queueWormCamera(w);
    else if (call.operation === "area") {
      const targets = [...nativeWormHitscanBodies(worms,w,H), ...nativeMineHitBodies(mines), ...nativeCrateHitBodies(), ...nativeBarrelHitBodies()].sort((a,b)=>a.type-b.type);
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
  spendSpecial("dragonball"); shotCount++; recordReactionWeaponUse("dragonball");
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
  const release = nativeLaunchAudio(config.record, { loop: 0, burst: 0, ordinal: 0, flag: 0, team });
  if (sound) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    playNativeProjectileReleaseSound(audio, release, queueGameSound, w);
  }
  $("#status").textContent = "Dragon Ball away. Retreat!";
  updateUI();
}
function stepDragonBall() {
  const p = projectile;
  const targets = [...nativeWormHitscanBodies(worms, worms[p.owner], H), ...nativeMineHitBodies(mines), ...nativeCrateHitBodies(), ...nativeBarrelHitBodies()]
    .sort((a,b) => a.type - b.type);
  const result = nativeDragonBallEvent(p.nativeDragonBall, 0x3ea,
    {left:0,right:W*65536}, {
      solid:(x,y)=>terrain.solid(x,H-y),
      hit:body=>{
        const hit = nativeDragonBallHit(body, targets);
        for (const call of hit.calls) {
          if (call.operation === "damage") applyNativeHitPackets(targets,[{body:call.receiver,packet:call.request}]);
          if (call.operation === "sound") queueGameSound(call.request);
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
function torchPosition(w, body, x, y, flags = body.flags) {
  const candidate = { ...body, flags };
  return nativeTryBodyPosition(candidate,x,y,(px,py) =>
    nativeSceneCollision(w,candidate,px/65536,H-py/65536,terrain,worms,H)).result;
}
function syncTorchPosition(w, body) {
  if(w.originalBlowtorch)w.originalBlowtorch.body=body;
  w.x = body.x/65536; w.y = H-body.y/65536;
}
function fireFlamethrower() {
  if (!canAct() || availableAmmo(ammo[team], "flamethrower") <= 0) return;
  const w = worms[current];
  ammo[team].flamethrower = spendAmmo(ammo[team].flamethrower);
  shotCount++;
  recordReactionWeaponUse("flamethrower");
  pendingFire = { worm: w, angle, kind: "flamethrower", stage: "flamethrower", spent: true,
    stream: { remaining: 18, frame: 0 } };
  charging = false;
  chargeSource = null;
  $("#status").textContent = "Flames away. Retreat!";
  updateSliders();
  updateUI();
}
function stepFlamethrower(pending) {
  if (pending.stream.remaining <= 0) {
    pendingFire = null;
    finishAction("Flame thrower complete. Retreat!");
    return;
  }
  const w = pending.worm, radians = pending.angle * Math.PI / 180;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  const baseX = w.x + cos * 14, baseY = w.y - sin * 14;
  const count = Math.min(2, pending.stream.remaining);
  for (let i = 0; i < count; i++) {
    const spread = (i - 0.5) * 0.11 + (matchRandom.logicUint() / 0xffffffff - 0.5) * 0.04;
    const a = radians + spread, speed = (3.2 + (matchRandom.logicUint() / 0xffffffff) * 1.2) * 65536;
    spawnNativeFlame([
      Math.round(baseX * 65536), Math.round((H - baseY) * 65536),
      Math.round(Math.cos(a) * speed), Math.round(-Math.sin(a) * speed),
      40, 0, 0, 10, 40, 4, 0,
    ], w.team);
  }
  pending.stream.remaining -= count;
  pending.stream.frame++;
}
function fireBlowtorch(prepared = false) {
  if ((!prepared && !canAct()) || availableAmmo(ammo[team],"blowtorch") <= 0) return;
  const w = worms[current];
  if (!prepared && beginWeaponPreparation(w,"blowtorch",angle)) {
    pendingFire = {worm:w,angle,kind:"blowtorch",stage:"prepare"};
    wormLocked = true; move = aimInput = 0; charging = false; chargeSource = null;
    updateUI(); return;
  }
  const record = nativeHitscanWeapon("blowtorch").record;
  const body = {x:Math.round(w.x*65536),y:Math.round((H-w.y)*65536),
    aim:Math.round((Math.asin(Math.sin(angle*Math.PI/180))/Math.PI+0.5)*65536),
    facing:w.facing,shape:3,flags:0x420cc6,sleeping:0,suspended:0,field19c:0};
  const entry = nativeBlowtorchEntry(body,record,w.nativeTorchStats ?? {counter58c:0,counter590:0},
    torchPosition(w,body,body.x & -65536,body.y & -65536));
  w.nativeTorchStats = entry.stats;
  spendSpecial("blowtorch"); shotCount++; recordReactionWeaponUse("blowtorch");
  startOriginalBlowtorch(w); syncTorchPosition(w,entry.body);
  pendingFire = {worm:w,angle,kind:"blowtorch",stage:"blowtorch",spent:true,body:entry.body};
  updateSliders(); updateUI();
}
function stopBlowtorch(pending = pendingFire) {
  if (pending?.stage !== "blowtorch" || !pending.worm.originalBlowtorch) return;
  const w = pending.worm;
  const exitBody = {...pending.body,x:Math.round(w.x*65536),y:Math.round((H-w.y)*65536)};
  const result = nativeBlowtorchExit(exitBody,nativeHitscanWeapon("blowtorch").record,
    (x,y)=>nativeSceneCollision(w,exitBody,x/65536,H-y/65536,terrain,worms,H),
    (x,y,body)=>torchPosition(w,body,x,y));
  syncTorchPosition(w,result.body);
  finishOriginalBlowtorch(w,result.calls);
  w.ground = false;
}
function stepBlowtorch(pending) {
  const w = pending.worm, record = nativeHitscanWeapon("blowtorch").record;
  const launch = nativeLaunch(record,{...pending.body,angle:pending.body.aim});
  const result = nativeBlowtorchTick({...pending.body,sprite:w.originalBlowtorch.player.current.id},record,launch.vy,
    (x,y,flags,body)=>torchPosition(w,body,x,y,flags),
    (call) => {
      if (call.operation === "progress") w.originalBlowtorch.player.setProgress(call.value);
      dispatchFirePunchCalls(w,[call]);
    });
  pending.body = result.body; syncTorchPosition(w,result.body);
  if (result.calls.some(call=>call.operation === "state")) {
    stopBlowtorch(pending); pendingFire = null;
    finishAction("Blowtorch complete. Retreat!"); updateSliders();
  }
}

function stopDrill(pending = pendingFire) {
  if (pending?.kind !== "drill") return;
  pending.playback?.stop();
  pending.worm.originalDrill = null;
  if (pending.worm.nativeFlight?.state === 0x6e) pending.worm.nativeFlight = null;
}
function fireDrill(prepared = false) {
  if ((!prepared && !canAct()) || availableAmmo(ammo[team], "drill") <= 0) return;
  const w = worms[current];
  if (!prepared && beginWeaponPreparation(w, "drill", angle)) {
    pendingFire = { worm:w, angle, kind:"drill", stage:"prepare" };
    wormLocked = true; move = aimInput = 0; charging = false; chargeSource = null;
    updateUI(); return;
  }
  spendSpecial("drill"); shotCount++; recordReactionWeaponUse("drill");
  const entry = nativeDrillEntry({ loopHandle:0 }, nativeHitscanWeapon("drill").record, w.nativeDrillCounter ?? 0);
  w.nativeDrillCounter = entry.counter;
  attachNativeDrillFlight(w, { height:H });
  startOriginalDrill(w);
  pendingFire = { worm:w, angle, kind:"drill", stage:"drill", spent:true, body:entry.body };
  updateSliders();
  updateUI();
}
function stepDrill(pending) {
  const w = pending.worm;
  const result = nativeDrillTick({ ...pending.body,
    x:Math.round(w.x*65536), y:Math.round((H-w.y)*65536), facing:w.facing,
  }, nativeHitscanWeapon("drill").record, () => matchRandom.logicUint(), {
    startLoop: () => {
      if (!sound) return 0;
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      pending.playback = playNativeDrillLoop(audio);
      return 1;
    },
    overlap: (x,y) => nativeSceneCollision(w,w.nativeFlight,x/65536,H-y/65536,terrain,worms,H),
  });
  pending.body = result.body;
  w.originalDrill.player.advance();
  dispatchFirePunchCalls(w, result.calls);
  for (const call of result.calls) {
    if (call.operation === "volume") pending.playback?.setVolume(sound ? call.request[1]/65536 : 0);
    if (call.operation === "state") {
      stopDrill(pending); pendingFire = null;
      finishAction("Drilling complete. Retreat!");
      updateSliders();
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
  spendSpecial("firepunch"); shotCount++; recordReactionWeaponUse("firepunch");
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
  shotCount++; recordReactionWeaponUse("axe");
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
  const targets = [...nativeWormHitscanBodies(worms, w, H), ...nativeMineHitBodies(mines), ...nativeCrateHitBodies(), ...nativeBarrelHitBodies()].sort((a,b) => a.type - b.type);
  applyNativeAreaRequest(targets, nativeProdRequest(config.record,
    Math.round(w.x * 65536), Math.round((H - w.y) * 65536), w.facing));
  spendSpecial("prod");
  shotCount++; recordReactionWeaponUse("prod");
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
  const targets = [...nativeWormHitscanBodies(worms, w, H), ...nativeMineHitBodies(mines), ...nativeCrateHitBodies(), ...nativeBarrelHitBodies()].sort((a,b) => a.type - b.type);
  applyNativeAreaRequest(targets, nativeBatRequest(config.record,
    launch.x, launch.y, launch.vx, launch.vy, w.facing));
  spendSpecial("bat");
  shotCount++; recordReactionWeaponUse("bat");
  wormLocked = true;
  startOriginalRecoil(w, "bat", angle, matchRandom.frame);
  if (sound) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    playNativeProjectileReleaseSound(audio, nativeLaunchAudio(config.record,
      { loop: 0, burst: 0, ordinal: 1, flag: 0, team: w.team }), request => nativeSoundQueue.enqueue(request), w);
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
  markNativePickupAction();
  wormLocked = true;
  const w = worms[current],
    kind = weapon,
    meta = WEAPONS[kind];
  if (kind === "mine") {
    placeMine();
    return;
  }
  if (kind === "flamethrower") {
    fireFlamethrower();
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
  if (kind === "blowtorch") { fireBlowtorch(); return; }
  if (kind === "drill") { fireDrill(); return; }
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
  shotCount++; recordReactionWeaponUse(kind);
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
      playNativeProjectileReleaseSound(audio, projectile.nativeRelease, request => nativeSoundQueue.enqueue(request), w);
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
// Dispatch all original detonation events in order, including placement failures.
function detonateNativeProjectile(p) {
  const events = nativeProjectileDetonationEvents(p, () => matchRandom.logicUint());
  for (const event of events) {
    if (event.operation === "sound") queueGameSound(event.request);
    else if (event.operation === "blast")
      explode(p.x, p.y, p.kind, p.owner, event.request);
    else if (event.operation === "fire")
      nativeProjectileFire(p.nativeFire, ...event.request, {
        parent: category => category, allocate: () => true,
        flame: (allocation, parent, record) => spawnNativeFlame(record, p.owner),
        sound: request => queueGameSound(request),
      });
    else if (event.operation === "fragments")
      nativeProjectileChildren(p, H, () => matchRandom.logicUint(), child => {
        if (nativeProjectilePlacementHit(child, terrain, worms, H)) {
          detonateNativeProjectile(child);
          return;
        }
        child.mesh = createNativeProjectileVisual(child.nativeRender);
        child.mesh.position.set(child.x, child.y, 40);
        group.add(child.mesh);
        bombs.push(child);
      });
  }
}
function explodeProjectile(p) {
  if (lastShot) lastShot.impact = { x: p.x, y: p.y, kind: p.kind };
  const distance = Math.hypot(p.x - p.launchX, p.y - p.launchY);
  const best = recordBest(record, { longest: distance });
  if (!replaySimulation && best.longest !== record.longest) {
    record = best;
    writeRecord(record);
    updateRecordUI();
  }
  if (p.nativeDetonation) detonateNativeProjectile(p);
  else explode(p.x, p.y, p.kind, p.owner);
}

function scenarioBlocksCarve(x, y, radius = 0) {
  if (currentScenario?.indestructibleLandscape) return true;
  if (currentScenario?.indestructibleBorder) {
    const margin = 8;
    if (x - radius <= margin || x + radius >= W - margin ||
        y - radius <= margin || y + radius >= H - margin) return true;
  }
  return false;
}
function carveScenarioCrater(data, width, height, x, y, radius, rim) {
  if (scenarioBlocksCarve(x, y, radius)) return;
  carveNativeCrater(data, width, height, x, y, radius, rim);
}
function carveScenarioTool(data, width, height, mask, x, y, rim) {
  if (scenarioBlocksCarve(x, y, 0)) return;
  carveNativeToolMask(data, width, height, mask, x, y, rim);
}
function explode(x, y, kind, ownerIndex = -1, nativePacket = null) {
  const sourceX = x, sourceY = y;
  if (nativePacket) {
    x = nativePacket[1] / 65536;
    y = H - nativePacket[2] / 65536;
  }
  const nativeStrength = nativePacket ? nativePacket[4] : kind === "death" ? 30 : null;
  const nativePush = nativePacket ? nativePacket[3] : 100;
  if (nativeStrength !== null) reactionOrigin = { x: Math.round(x * 65536) | 0, y: Math.round((H - y) * 65536) | 0 };
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
    carveScenarioCrater(
      terrain.data,
      W,
      H,
      nativeX >> 16,
      nativeY >> 16,
      nativeStrength,
      terrain.craterRim,
    );
    spawnOriginalDebris(nativeX, nativeY, nativeStrength);
  } else if (!scenarioBlocksCarve(x, y, radius)) terrain.carve(x, y, radius);
  terrainDirty = true;
  explosions++;
  hitStop = Math.max(hitStop, reducedMotion ? 0 : 0.055);
  spawnExplosionArt(x, y, nativeStrength ?? Math.round(maxDamage));
  sfx("explosion");
  for (const fragment of nativePacket ? [] : fragments(kind)) {
    spawnBomb({ x: sourceX, y: sourceY + 8, ...fragment, owner: ownerIndex });
  }
  for (const barrel of hazards) {
    const packet = nativePacket ? [...nativePacket] : [1, Math.round(x * 65536),
      Math.round((H - y) * 65536), nativePush, Math.round(maxDamage), 0];
    barrel.nativeBody = nativeBarrelHit(barrel.nativeBody, 0x404, packet);
    if (barrel.nativeBody.state) barrel.hitOwner = ownerIndex;
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
    for (const flame of nativeFlames) if (flame)
      flame.body = nativeFlameBlast(flame.body, packet);
    for (const crate of crates) {
      if (!crate.nativeBody.destroyed) {
        crate.nativeBody = nativeCrateHit(crate.nativeBody, [...packet]);
        if (crate.nativeBody.state === 103) crate.hitOwner = ownerIndex;
      }
    }
    for (const mine of mines) {
      if (mine.nativeBody)
        mine.nativeBody = nativeMineBlast(mine.nativeBody, packet).body;
    }
  }
  for (const w of worms) {
    // A zero-HP worm is still a physical task until its death dispatch completes.
    if (w.hp <= 0 && !w.deathPending) continue;
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
    if (native) {
      const quality = nativeBlastQuality(native.damage, nativeStrength, nativePacket?.[5] ?? 0);
      if (quality !== null) nativeDamageReactionEvent(nativeDamageReaction,
        matchDamageSourceActive ? worms[current].team + 1 : 0, 0x405, quality);
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
    if (!replaySimulation && best.bestHit !== record.bestHit) {
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
    for (const request of tick.sounds) queueGameSound(request);
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
function revealWormHealth(w) {
  const result = nativeHealthDisplayReveal(w.nativeHealthDisplay, w.hp);
  w.nativeHealthDisplay = result.body;
  for (const call of result.calls) {
    if (call.operation === "damageText") w.nativeDamageText = call.value;
    if (call.operation === "clearDamageTotal") w.damageTaken = 0;
  }
}
function finishMatch(winner, series) {
  stopNativeNuclearAudio();
  nativeNuclearEffect = null;
  nativePaletteDisplay.update();
  nativeClockTarget = 0;
  phase = "over";
  cameraSnap = true; manualCamera = null;
  aimHUD.guide.style.display = "none";
  announceMatchResult(winner);
  // Match result is also retained in the status HUD.
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
    scenario: currentScenario && scenarioProgress ? {
      path: currentScenario.path,
      title: currentScenario.title ?? null,
      training: Boolean(currentScenario.training),
      collected: scenarioProgress.collected,
      total: scenarioProgress.total,
      score: scenarioProgress.score | 0,
      complete: scenarioProgress.complete,
    } : null,
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
  if (lastResult.scenario) {
    $("#turn-label").textContent = "SCENARIO COMPLETE";
    $("#status").textContent =
      `${lastResult.scenario.title ?? "Scenario"} complete · targets ${lastResult.scenario.collected}/${lastResult.scenario.total} · score ${lastResult.scenario.score}.`;
  }
  if (!replaySimulation && (mode === "ai" || daily)) {
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
  stopNativeNuclearAudio();
  nativeNuclearEffect = null;
  nativePaletteDisplay.update();
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
    announceMatchResult(winner);
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
    announceMatchResult(null);
    $("#turn-label").textContent = "ROUND OVER";
    $("#status").textContent =
      `Series ${seriesWins[0]}–${seriesWins[1]}. Next island incoming…`;
    updateSeriesHUD();
    updateUI();
    return;
  }
  finishMatch(winner, false);
}
function nearbyReactionTeam(id) {
  // The host roster supplies extant worm tasks in registry order.
  return nativeNearbyReactionTeam(worms
    .filter(w => w.hp > 0 || w.deathPending || w.dying > 0)
    .map(w => ({ type: 2, team: w.team + 1,
      x: Math.round(w.x * 65536) | 0, y: Math.round((H - w.y) * 65536) | 0 })),
    id, reactionOrigin.x, reactionOrigin.y);
}
function playSkipTurnSpeech() {
  const speech = nativeSkipTurnSpeech(team + 1, nativeDamageReaction.usedWeapon, nearbyReactionTeam);
  if (speech && sound) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    queueControllerSpeech(speech.request,worms.find(w=>w.team+1===speech.team));
  }
}
function consumeDamageReaction(reveal = false) {
  const killer = matchDamageSourceActive ? worms[current] : null;
  const select = reveal ? nativeDamageRevealReaction : nativeDamageReactionVoice;
  const reaction = select(nativeDamageReaction, {
    sourceTeam: killer?.matchStats.team ?? 0, sourceWorm: killer?.matchStats.worm ?? 0,
    turnTeam: team + 1, usedWeapon: nativeDamageReaction.usedWeapon,
    teamAlive: id => worms.some(w => w.team + 1 === id && w.hp > 0),
    nearbyTeam: nearbyReactionTeam,
    nextRandom: () => matchRandom.logicUint(),
  });
  nativeDamageReaction = reaction.state;
  for (const [field, value] of reaction.statistics) {
    const stats = killer.matchStats;
    stats[field] = field.startsWith("max") ? Math.max(stats[field], value) : (stats[field] + value) | 0;
  }
  if (reaction.speech && sound) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    queueControllerSpeech(reaction.speech.request,worms.find(w=>w.team+1===reaction.speech.team));
  }
}
function selectNativeMatchTeam() {
  // Current frontend has two opposing alliances. Retain original per-alliance
  // cursors and health eligibility instead of toggling the host team index.
  const selected = nativeSelectNextTeam({ ...nativeTeamRotation, groups: 2,
    deployment: false, teams: [0, 1].map(id => ({ group: id,
      unavailable: 0, eliminated: 0,
      worms: worms.filter(w => w.team === id).map(w => ({ hp: w.hp, state: nativeWormState(w) })),
    })) });
  nativeTeamRotation = { group: selected.group, cursors: selected.cursors };
  return selected.team - 1;
}
function nextTurn() {
  if (pendingTurnStart || nativeAnnouncementsPending(nativeAnnouncements)) return;
  const killer = matchDamageSourceActive ? worms[current] : null;
  const killMessage = nativeKillAnnouncement(killer?.matchStats, killer?.name,
    killer?.team ? 0 : 2, () => matchRandom.logicUint());
  if (killMessage) {
    queueNativeAnnouncement(nativeAnnouncements, killMessage.text, killMessage.font);
    return;
  }
  consumeDamageReaction();
  showNativeTeamPanel(nativeTeamPanel);
  if ([0, 1].some((t) => !worms.some((w) => w.team === t && w.hp > 0)))
    return endGame();
  matchDamageSourceActive = false;
  if (!advanceNativePoisonSettlement()) return;
  if (!advanceNativeEnvironmentSettlement()) return;
  const nextTeam = selectNativeMatchTeam();
  if (nextTeam < 0) return endGame();
  team = nextTeam;
  if (team === 0) {
    round++;
    if (
      !crates.length &&
      (crateRain ? round % 2 === 0 : round >= 3 && round % 3 === 0)
    ) {
      spawnCrate(true);
    }
    if (!sdTriggered && round >= 6 && !currentScenario?.suddenDeath?.disabled) {
      if (applySuddenDeath()) return;
    }
  }
  beginTurn();
}
function jump(kind = "forward") {
  if (rope.attached) { releaseRope(); return; }
  if (jetpack.active) {
    jetpack.pulse = kind === "backflip" ? -1 : 1;
    jetpack.pulseTime = 0.22;
    return;
  }
  const w = worms[current];
  const double = lastJump.kind === kind && jumpClock - lastJump.time < 0.28;
  const backflip = kind === "backflip" || (kind === "up" && double);
  const direction = kind === "forward" ? (double ? -1 : 1) : 0;
  if (w.originalJumpPreparation && double && !menu.open && !replaying) {
    Object.assign(w.originalJumpPreparation, { direction, backflip });
    lastJump = { kind: null, time: jumpClock };
    return;
  }
  if (!canMove()) return;
  markNativePickupAction(w);
  wormLocked = true;
  if (!w.ground) {
    if (w.vy < 0) w.jumpQueued = { kind, until: jumpClock + 0.12 };
    return;
  }
  w.jumpQueued = null;
  move = 0;
  startOriginalJumpPreparation(w, direction, backflip);
  lastJump = { kind, time: jumpClock };

}
function startAiTurn() {
  const w = worms[current];
  const aiAlive = worms.filter((t) => t.team === 1 && t.hp > 0).length;
  const playerAlive = worms.filter((t) => t.team === 0 && t.hp > 0).length;
  if (displayAmmo(utilityAmmo[1]?.freeze ?? 0) > 0 && aiAlive < playerAlive) {
    utilityAmmo[1].freeze = spendAmmo(utilityAmmo[1].freeze);
    freezeNativeTeam(1);
    playSkipTurnSpeech();
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
    crate: crates.filter(crate => !crate.falling).reduce((nearest, crate) =>
      !nearest || Math.abs(crate.x - w.x) < Math.abs(nearest.x - w.x) ? crate : nearest, null),
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
function queueGameSound(request) {
  if (!sound) return 0;
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  return nativeSoundQueue.enqueue(request);
}
// Preserve the speaker bank in the host speech ID through the native queue.
function queueControllerSpeech(request,owner=worms[current]) {
  return nativeSoundQueue.enqueue([speechRequestId(request[0],owner?.nativeSpeechBank), ...request.slice(1)]);
}
function submitQueuedSound(request) {
  playNativeQueuedSound(audio, request);
}
function initializeCrateShower() {
  const native = createNativeCrateScheme(195);
  crateShowerAmmo = native.ammo;
  crateShowerPool = native.pool.filter((slot) => crateShowerSlotKind(slot));
  crateShowerUsed = [];
}
function updateAutomaticUtilities() {
  const loadout = utilityAmmo[team];
  if (!worms[current] || (!loadout.doubledamage && !loadout.cratespy &&
      !loadout.doubletime && !loadout.crateshower)) return;
  const wasShower = automaticUtilityState.crateShower;
  const result = nativeAutomaticUtilities({
    ...automaticUtilityState, team: team + 1,
    time: Math.round(time * 1000), flags: worms[current].nativeTeamModifiers || 0,
  }, [loadout.doubledamage, loadout.cratespy, loadout.doubletime, loadout.crateshower]);
  automaticUtilityState = result.body;
  if (result.body.crateShower && !wasShower) initializeCrateShower();
  time = result.body.time / 1000;
  for (const w of worms) if (w.team === team) w.nativeTeamModifiers = result.body.flags;
  for (const [kind, utility] of Object.entries(AUTOMATIC_UTILITIES))
    if (result.cleared.includes(utility.slot)) loadout[kind] = 0;
  damageMultiplier = nativeTeamEnvironment({ damageMultiplier, gravityPercent: 100 }, result.body.flags).damageMultiplier;
}

// Transient native scene projection; authoritative ranks remain in the shared
// render registry and per-worm bytes are included in actor replay snapshots.
const idleSceneMemory=new Uint8Array(0x6000);
function stepGroundPoses() {
  for(const w of worms) {
    if(w.hp<=0)continue;
    const x=Math.round(w.x*65536)|0,y=Math.round((H-w.y)*65536)|0;
    if(!w.nativeGroundPosition || w.nativeGroundPosition.x!==x || w.nativeGroundPosition.y!==y || terrainDirty)w.nativeGroundPose.pending=1;
    w.nativeGroundPosition={x,y};
    w.nativeGroundPose=nativeWormSlopeTick(w.nativeGroundPose,w.facing,x,y,{
      airborne:()=>!w.ground,
      sample:(px,py,limit)=>nativeSurfaceSlope({type:2,shape:3,flags:0x420cc6,enabled:1},px,py,limit,
        (qx,qy,body)=>nativeSceneCollision(w,body,qx/65536,H-qy/65536,terrain,worms,H)),
    });
  }
}
function stepIdleGestures() {
  const scene=new DataView(idleSceneMemory.buffer);
  scene.setInt32(0x102c,nativeRenderOrder.active.length,true);
  nativeRenderOrder.active.forEach((id,i)=>scene.setInt32(0xc2c+i*4,id,true));
  nativeRenderOrder.orders.forEach((rank,id)=>scene.setInt32(0x1030+id*4,rank,true));
  for(const w of worms) {
    if(w.hp<=0 || w===worms[current] || !w.ground || w.moving || w.knocked || w.hurt>0.35 || w.recoil>0 || w.landing>0 ||
      w.originalTeleport || w.originalPreparation || w.originalRecoil || nativeWormState(w)!==0x65 || phase==="over")continue;
    const body=new DataView(w.nativeIdleMemory.buffer);
    for(const [offset,value] of [[0xfc,w.team],[0x100,w.matchStats.worm],[0x148,w.nativePoison.amount],[0x158,w.nativeOrderId],[0x38c,w.nativeHitVoicePlayback?1:0]])body.setInt32(offset,value,true);
    stepOriginalIdle(w,matchRandom.frame+1,w.nativeIdleMemory,idleSceneMemory,{
      state:()=>0x65,random:()=>matchRandom.logicUint(),teamStatus:()=>0,health:()=>w.hp,
      stopSound:()=>{w.nativeHitVoicePlayback?.stop();w.nativeHitVoicePlayback=null;},
      sound:(...request)=>{
        if(!sound)return 0;
        audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();
        w.nativeHitVoicePlayback=playNativeOwnedSound(audio,request,w.nativeHitVoicePlayback);
        return w.nativeHitVoicePlayback?1:0;
      },
    });
  }
  nativeRenderOrder.active.forEach(id=>{nativeRenderOrder.orders[id]=scene.getInt32(0x1030+id*4,true);});
}

function step(dt) {
  const advancing=!mapLoading && !menu.open && !document.hidden && !replaying && hitStop<=0;
  stepFrame(dt);
  if(advancing)nativeFinishSceneCollisionFrame(terrain,worms,[...mines,...crates,...hazards]);
  if (!mapLoading && !menu.open && !document.hidden)
    tickOriginalWindPresentation(replaying);
  // 004A1A00 submits queued sounds after frame tasks. Immediate per-body
  // sounds keep their separate playback handles and never enter this queue.
  nativeSoundQueue.flush(audio ? submitQueuedSound : null, !sound);
}
function stepFrame(dt) {
  if (mapLoading) return;
  if (menu.open || document.hidden) {
    stopBurstSound(); stopProjectileSound();
    stopNativeNuclearAudio();
    announcementPlayback?.stop(); announcementPlayback = null;
    return;
  }
  if (replaying) return;
  if (hitStop > 0) {
    hitStop = Math.max(0, hitStop - dt);
    return;
  }
  tickOriginalWindHUD(wind);
  nativeBusy.tick();
  if (phase !== "over" && phase !== "break" && phase !== "menu") {
    updateAutomaticUtilities();
    stepCrateShower();
  }
  nativeAnnouncementTick(nativeAnnouncements);
  const announcementAudio = nativeAnnouncementAudioTick(announcementVolume, announcementPlayback ? 17 : 0, nativeAnnouncements.blocking);
  announcementVolume = announcementAudio.volume;
  if (!sound) { announcementPlayback?.stop(); announcementPlayback = null; }
  else for (const [operation, , , , volume] of announcementAudio.calls) {
    if (operation === "play") {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      announcementPlayback = playNativeAnnouncementLoop(audio, volume);
    } else if (operation === "volume") announcementPlayback?.setVolume(announcementVolume / 65536);
    else { announcementPlayback?.stop(); announcementPlayback = null; }
  }
  if (phase !== "over" && phase !== "menu" && phase !== "break") {
    stepNativeWaterRise();
    stepNativeNuclearEffect();
  }
  if (pendingTurnStart && !nativeAnnouncementsPending(nativeAnnouncements)) beginTurn();
  nativeClockProgress = nativeClockSlide(nativeClockProgress, nativeClockTarget);
  updateOriginalClockPanel(nativeClockProgress, team);
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
  nativeTeamPanelVisibilityTick(nativeTeamPanelVisibility, toggleTeamPanelVisibility);
  toggleTeamPanelVisibility = false;
  nativeTeamPanelTick(nativeTeamPanel);
  const teamWasRemoving = nativeTeamList.removal !== 0;
  for (const strength of nativeTeamListTick(nativeTeamList)) teamPanelSoundState.bounce = strength << 2;
  if (teamWasRemoving && !nativeTeamList.removal && phase === "aim" &&
      [0, 1].some(id => !worms.some(w => w.team === id && w.hp > 0))) {
    cancelCharge(); stopRope(); stopJetpack();
    phase = "settle"; shotWait = 0; move = 0; aimInput = 0;
    updateUI();
  }
  const panelSounds = nativeTeamPanelSounds(teamPanelSoundState);
  if (sound && panelSounds.length) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    for (const request of panelSounds) nativeSoundQueue.enqueue(request);
  }
  if (pendingEliminationTeam !== null) {
    const id = pendingEliminationTeam;
    const message = nativeTeamEliminationAnnouncement(id ? "CORAL CREW" : "MOSS COMPANY", id ? 0 : 2, () => matchRandom.logicUint());
    queueNativeAnnouncement(nativeAnnouncements, message.text, message.font);
    pendingEliminationTeam = null;
  }
  const teamRosters = [0, 1].map(team => worms.filter(w => w.team === team));
  for (const roster of teamRosters)
    nativeTeamHealthMaximum = Math.max(nativeTeamHealthMaximum, roster.reduce((sum, w) => (sum + w.hp) | 0, 0));
  nativeTeamHealthValues = teamRosters.map((roster, index) => {
    const result = nativeTeamHealthTick(nativeTeamHealthValues[index], roster, nativeTeamHealthMaximum);
    if (result.busy) nativeBusy.wake(); // 004B8580 / 004A1A00.
    return result.value;
  });
  updateHudTeamHealth(nativeTeamHealthValues, phase === "over" ? -1 : team, selectionTick);
  updateHudTeamPanel(Math.max(nativeTeamPanelVisibility.minimum, nativeTeamPanel.progress), nativeTeamList);
  for (const w of worms) w.moving = false;
  jumpClock += dt;
  bannerTime = Math.max(0, bannerTime - dt);
  if (retreat > 0) {
    retreat = nativeRetreatCountdown(Math.round(retreat * 1000)) / 1000;
    if (retreat === 0) {
      move = 0;
      updateUI();
    }
  }
  const clockWasActive = phase === "aim";
  const clockCountdown = nativeTurnClockTick(Math.round(time * 1000), clockWasActive);
  time = clockCountdown.remaining / 1000;
  if (phase === "aim") {
    if (time <= 0) {
      cancelCharge();
      stopRope();
      stopJetpack();
      parachuteArmed = false;
      bungeeArmed = false;
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
        if (w.ground && !w.knocked) {
          markNativePickupAction(w);
          w.moving = walkWorm(w, terrain, aiMoveDirection, dt);
        }
        if (aiMoveTime === 0) aiAim();
      } else {
        aiWait -= dt;
        if (aiWait <= 0 && phase === "aim" && worms[current].ground)
          startAiTurn();
      }
    }
  }
  const clockUpdate = nativeClockPresentationTick(nativeClockPresentation, Math.max(0, Math.round(time * 1000)), clockWasActive);
  nativeClockPresentation = clockUpdate.state;
  const clockSounds = [...clockCountdown.sounds, ...clockUpdate.sounds];
  if (sound && clockSounds.length) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    for (const request of clockSounds) {
      if(request[0]&0x10000)queueControllerSpeech(request);
      else nativeSoundQueue.enqueue(request);
    }
  }
  if (canMove() && move && !rope.attached && !jetpack.active && !worms[current].originalParachute) {
    const w = worms[current];
    markNativePickupAction(w);
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
      if (aiRetreatDirection) markNativePickupAction(w);
      w.moving =
        aiRetreatDirection !== 0 &&
        walkWorm(w, terrain, aiRetreatDirection, dt);
    }
  }
  if (bungeeArmed && !rope.attached && !jetpack.active) {
    const w = worms[current];
    if (!w.ground && w.nativeWalkingBody && !w.knocked && !w.frozen) tryBungee(w);
  }
  if (rope.firing) stepRopeShot(worms[current]);
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
    let audioState = nativeWormState(w);
    // Charge/preparation/recoil still use host action controllers.
    if (audioState === 0x65) {
      if (w.originalDrill) audioState = 0x6e;
      else if (w === worms[current] && charging) audioState = 0x68;
      else if (w.originalPreparation) audioState = 0x69;
      else if (w.originalRecoil || (pendingFire?.worm === w && pendingFire.stage === "recoil")) audioState = 0x6a;
      else if (pendingFire?.worm === w && pendingFire.stage === "burst") audioState = 0x6b;
    }
    cleanupNativeWormAudio(w, audioState);
    w.nativeContactPlayback = cleanupNativeContactSound(w.nativeContactPlayback);
    stepOriginalWalking(w);
    if (w.nativeWalkingSounds?.length) {
      if (sound) {
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        audio.resume();
        for (const request of w.nativeWalkingSounds)
          w.nativeHitVoicePlayback = playNativeOwnedSound(audio, request, w.nativeHitVoicePlayback);
      }
      w.nativeWalkingSounds = [];
    }
    w.nativeHealthDisplay = nativeHealthDisplayTick(w.nativeHealthDisplay, w.hp).body;
    w.groundGrace = w.ground ? 0.08 : Math.max(0, (w.groundGrace || 0) - dt);
    w.landing = Math.max(0, (w.landing || 0) - dt);
    stepOriginalLanding(w);
    const jumpLaunch = stepOriginalJumpPreparation(w);
    if (jumpLaunch) {
      attachNativeJumpFlight(w, { height: H }, jumpLaunch.direction, jumpLaunch.backflip);
      startOriginalJump(w, jumpLaunch.backflip, jumpLaunch.direction,
        calls => dispatchWormEntryAudio(w, calls));
    }
    stepOriginalJump(w);
    stepOriginalParachute(w);
    w.hurt = Math.max(0, w.hurt - dt);
    w.recoil = Math.max(0, w.recoil - dt);
    if (w.nativeDeathRequest && !w.drowned && !w.originalDeath) {
      const body = w.nativeHurtBody ?? w.nativeFlight ?? {
        vx: Math.round(w.vx * 65536 / 50), vy: Math.round(-w.vy * 65536 / 50),
      };
      if (nativeRequestedDeathState(w.nativeDeathRequest, nativeWormState(w), body) === 0x84) {
        startOriginalDeath(w);
        w.dying = 1;
        w.nativeDeathRequest = 0;
      }
    }
    if (w.dying > 0) {
      if (w.drowned) {
        w.dying = stepNativeDrowningFlight(w, {
          height: H, waterLevel, gravityScale, frame: matchRandom.frame,
        }) ? 1 : 0;
        if (w.dying) queueWormCamera(w);
        else {
          nativeDamageReactionEvent(nativeDamageReaction,
            matchDamageSourceActive ? worms[current].team + 1 : 0, 0x3f3);
          announceWormDeath(w);
        }
        stepOriginalDrowning(w, {
          height: H, random: () => matchRandom.visualUint(),
          emit: ([x, y, vx, vy, size]) => spawnWaterBubble(
            x / 65536, H - y / 65536, vx / 0x30000, size,
          ),
        });
      }
      if (w.deathPending && !w.drowned) {
        if (!w.originalDeath) startOriginalDeath(w);
        w.dying = stepOriginalDeath(w, () => matchRandom.logicUint()) ? 0 : 1;
        queueWormCamera(w);
        if (w.originalDeathVoice && sound) {
          audio ??= new (window.AudioContext || window.webkitAudioContext)();
          audio.resume();
          queueControllerSpeech(w.originalDeathVoice,w);
        }
      } else if (!w.drowned) w.dying = Math.max(0, w.dying - dt);
      if (w.dying === 0 && w.deathPending) {
        w.deathPending = false;
        explode(w.x, w.y - 10, "death");
        spawnDeathSmoke(w);
        const grave = createOriginalGrave(w);
        if (grave) {
          graves.push(grave);
          group.add(grave.mesh);
        }
        announceWormDeath(w);
      }
    }
    w.g.visible = w.hp > 0 || w.deathPending || w.dying > 0;
    if (w.hp <= 0 && !w.deathPending && w.dying <= 0) {
      w.nativeHitVoicePlayback?.stop(); w.nativeHitVoicePlayback = null;
      w.nativeActionPlayback?.stop(); w.nativeActionPlayback = null;
      w.nativeContactPlayback?.stop(); w.nativeContactPlayback = null;
    }
    if ((w.hp <= 0 && !w.deathPending) || w.dying > 0) continue;
    if (w.originalTeleport) {
      const teleport = stepOriginalTeleport(w);
      if (teleport?.relocate) queueWormCamera(w);
      continue;
    }
    if (w.originalBlowtorch && !w.originalHurt && !w.frozen) continue;
    if (w.originalDrill && !w.originalHurt && !w.frozen) {
      stepNativeDrillFlight(w, {
        height:H, waterLevel, gravityScale, frame:matchRandom.frame,
        index:worms.indexOf(w),
        pickup: body => queryNativeWormPickup(w, body),
        collisionBody: hit => nativeContactBody(hit),
        updateCollisionBody: (hit,body) => { updateNativeContactBody(hit, body); },
      }, (x,y,body)=>nativeSceneCollision(w,body,x,y,terrain,worms,H));
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
    if (w === worms[current] && jetpack.active && (w.originalHurt || w.knocked || w.frozen || !w.nativeFlight)) stopJetpack();
    if (w === worms[current] && rope.attached && (w.originalHurt || w.knocked || w.frozen)) stopRope();
    let result = { fallDamage: 0 };
    if (w === worms[current] && jetpack.active) {
      stepJetpack(w, dt);
    } else if (w === worms[current] && rope.attached) {
      stepRope(w, dt);
    } else {
      if (!w.frozen && !w.originalHurt && !w.knocked && !w.nativeFlight &&
          (!w.ground || !bodyBlocked(terrain, w.x, w.y - 1)))
        attachNativeFallingFlight(w, { height: H });
      const fallState = nativeWormState(w);
      const fastFall = !w.frozen && [0x79, 0x7e, 0x7f].includes(fallState) && w.vy <= -400;
      if (w === worms[current] && parachuteArmed && !w.ground && fastFall) {
        parachuteArmed = false;
        bungeeArmed = false;
        utilityAmmo[team].parachute = spendAmmo(utilityAmmo[team].parachute);
        attachNativeParachuteFlight(w, { height: H });
        startOriginalParachute(w);
        $("#status").textContent = `${w.name}'s parachute deploys.`;
        updateUI();
      }
      if (fastFall && !w.originalParachute) {
        attachNativeFastFall(w, H);
        startOriginalHurt(w, 0x80);
      }
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
            pickup: body => queryNativeWormPickup(w, body),
        collisionBody: (hit) =>
              nativeContactBody(hit),
            updateCollisionBody: (hit, body) => {
              updateNativeContactBody(hit, body);
            },
          },
          (x, y, body) =>
            nativeSceneCollision(w, body, x, y, terrain, worms, H),
        );
        dispatchNativeWormMotionEvents(w, result);
      } else if (w.nativeFlight && !w.frozen) {
        const tickFlight = w.originalParachute ? stepNativeParachuteFlight : stepNativeJumpFlight;
        result = tickFlight(w, {
          height: H, waterLevel, gravityScale, wind, frame: matchRandom.frame, index: worms.indexOf(w),
          horizontal: w === worms[current] ? move : 0, vertical: w === worms[current] ? aimInput : 0,
          random: () => matchRandom.logicUint(),
          pickup: body => queryNativeWormPickup(w, body),
        collisionBody: hit => nativeContactBody(hit),
          updateCollisionBody: (hit, body) => { updateNativeContactBody(hit, body); },
        }, (x, y, body) => nativeSceneCollision(w, body, x, y, terrain, worms, H));
        dispatchNativeWormMotionEvents(w, { ...result,
          events: result.events.filter(call => call.target !== 0x7a) });
      } else {
        if (w.frozen) w.nativeFlight = null;
        result = stepWorm(w, terrain, dt, gravityScale);
      }
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
        w.nativeHitVoicePlayback = playNativeLandingSound(audio, landingSound, w.nativeHitVoicePlayback);
      } else if (!landingSound) sfx("land");
    }
    if (result.fallDamage) injure(w, Math.max(0, Math.round(result.fallDamage * fallDamageScale)));
    if (
      w === worms[current] &&
      w.ground &&
      w.jumpQueued &&
      jumpClock <= w.jumpQueued.until &&
      !result.fallDamage
    )
      jump(w.jumpQueued.kind);
    if (w.jumpQueued && jumpClock > w.jumpQueued.until) w.jumpQueued = null;
    const nativeWaterBody = w.nativeRopeBody ?? w.nativeHurtBody ?? w.nativeFlight;
    const drowning = nativeWaterBody ? nativeWormDrowningState(nativeWaterBody) === 0x87
      : nativeBodyBelowWater(0x420cc6,Math.round((H-w.y)*65536)|0,Math.floor(H-waterLevel));
    if (drowning || w.x < -30 || w.x > W + 30) {
      attachNativeDrowningFlight(w, H);
      if (w === worms[current] && rope.attached) stopRope();
      // Original004D811B..004D8147 consumes remaining health through
      // 004D8440 with force=1 and multiplier=1, including frozen worms.
      accountWormDamage(w, w.hp, { force: true });
      w.deathPending = false;
      w.originalParachute = null;
      w.drowned = true;
      w.nativeDeathRequest = 0;
      queueWormCamera(w, 9);
      w.dying = 1;
      startOriginalDrowning(w);
      w.hurt = 0.65;
      slowMo = Math.max(slowMo, 0.5);

      tone(150, 0.3);
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
  for (const w of worms) if (w.hp > 0) stepNativeWormPickup(w);
  const mineCameraRequests = [];
  for (let i = phase === "over" ? -1 : mines.length - 1; i >= 0; i--) {
    const mine = mines[i];
    const waterSound = (body, skim) => {
      const { sound: request } = nativeWaterSound(body, skim);
      if (!sound || !request) return;
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      nativeSoundQueue.enqueue(request);
    };
    const collide = (x, y, body) => nativeSceneCollision(mine, body, x / 65536, H - y / 65536, terrain, worms, H);
    mine.impactPlayback = cleanupNativeContactSound(mine.impactPlayback);
    mine.nativeBody = nativeSimpleBodyTick(mine.nativeBody, {
      frame: matchRandom.frame, index: i, waterY: Math.floor(H - waterLevel),
      gravity: Math.round(0x3d70 * gravityScale), wind: Math.round(wind / 2500 * 65536),
    }, {
      awake: nativeBodyAwake, collide,
      skim: body => waterSound(body, true),
      waterChanged: body => waterSound(body, false),
      bounce: (body, hit, side) => {
        const other = nativeContactBody(hit);
        nativeMineContact(body, mine.nativeTimer, side, 0, {
          sound: request => {
            if (!sound) return;
            audio ??= new (window.AudioContext || window.webkitAudioContext)();
            audio.resume();
            mine.impactPlayback = playNativeProjectileContactSound(audio, request, mine.impactPlayback);
          },
          receive: side => {

            const response = nativeContactReceiver(other, body, side, {});
            Object.assign(body, response.incoming);
            Object.assign(other, response.receiver);
            if (response.result) updateNativeContactBody(hit, other);
            return response.result;
          },
          bounce: side => {
            const response = nativeSimpleBounce(body, other, side, (x, y) => collide(x, y, body));
            Object.assign(body, response.body);
            updateNativeContactBody(hit, {...other, ...response.other});
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
      frame: matchRandom.frame, friction: matchFriction,
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
      nativeSoundQueue.enqueue(call.request);
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
          nativeSoundQueue.enqueue(call.request);
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
        nativeSoundQueue.enqueue(call.request);
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
      stopBlowtorch(pending);
      stopDrill(pending);
      stopBurstSound(pending.burst);
      pendingFire = null;
      if ((pending.burst?.spent || pending.spent) && phase === "aim") finishAction("Firing interrupted. Retreat!");
    } else if (pending.stage === "blowtorch") {
      stepBlowtorch(pending);
    } else if (pending.stage === "flamethrower") {
      if (pending.stream.frame % 4 === 0) stepFlamethrower(pending);
      else {
        pending.stream.frame++;
        if (pending.stream.remaining <= 0) {
          pendingFire = null;
          finishAction("Flame thrower complete. Retreat!");
        }
      }
    } else if (pending.stage === "drill") {
      stepDrill(pending);
    } else if (pending.stage === "firepunch") {
      // Native body/state tick runs in the worm loop above.
    } else if (pending.stage === "firepunch-recoil") {
      if (!w.originalRecoil) { pendingFire = null; finishAction("Fire punch complete. Retreat!"); }
    } else if (pending.stage === "axe") {
      for (const call of stepOriginalAxe(w, nativeHitscanWeapon("axe").record["0x70"], H)) {
        if (call.operation === "sound" && sound) {
          audio ??= new (window.AudioContext || window.webkitAudioContext)();
          audio.resume();
          w.nativeActionPlayback = playNativeOwnedSound(audio,
            [call.request[0], 3, ...call.request.slice(1)], w.nativeActionPlayback);
        }
        if (call.operation === "area") {
          const targets = [...nativeWormHitscanBodies(worms, w, H), ...nativeMineHitBodies(mines), ...nativeCrateHitBodies(), ...nativeBarrelHitBodies()].sort((a,b) => a.type-b.type);
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
      if (result) dispatchPreparationAudio(w, result.audioCalls);
      if (result?.released) {
        pendingFire = null;
        angle = pending.angle;
        if (pending.kind === "blowtorch") fireBlowtorch(true);
        else if (pending.kind === "drill") fireDrill(true);
        else if (pending.kind === "dragonball") fireDragonBall(true);
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
            collisionBody: (hit) => nativeContactBody(hit),
            updateCollisionBody: (hit, body) => {
              updateNativeContactBody(hit, body);
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
            nativeSoundQueue.enqueue(event);
        }
        if (sound) for (const event of nativeContact.events) {
          if (event.operation !== "sound") continue;
          audio ??= new (window.AudioContext || window.webkitAudioContext)();
          audio.resume();
          if (event.timer) nativeSoundQueue.enqueue(event.request);
          else p.nativeContactPlayback = playNativeProjectileContactSound(audio, event.request, p.nativeContactPlayback);
        }
      } else integrate(p, dt, WEAPONS[p.kind].wind ? wind : 0, gravityScale);
    }
    p.age += dt;
    emitProjectileTrail(p);
    if (
      !p.nativeBody && WEAPONS[p.kind].timed &&
      p.fuse - p.age < 1.5 &&
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

    if (p.nativeBody) updateNativeProjectileAudio(sound ? audio : null, p);
    if (!p.nativeTimer?.loopSound) {
      p.nativeFusePlayback?.stop();
      p.nativeFusePlayback = null;
    }
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
  const flameActivity = stepNativeFlames();
  const barrelActivity = { camera: [], busy: false };
  for (const barrel of [...hazards]) {
    let detonate = false;
    const collide = (x, y, body) => nativeSceneCollision(barrel, body, x / 65536, H - y / 65536, terrain, worms, H);
    const waterSound = (body, skim) => queueCrateSound(nativeWaterSound(body, skim).sound);
    barrel.impactPlayback = cleanupNativeContactSound(barrel.impactPlayback);
    const result = stepNativeBarrelBody(barrel.nativeBody, {
      frame: matchRandom.frame, index: hazards.indexOf(barrel),
      bottom: nativeProjectileDepth(Math.floor(H - waterLevel)),
      waterY: Math.floor(H - waterLevel), gravity: Math.round(0x3d70 * gravityScale),
      wind: Math.round(wind / 2500 * 65536),
    }, {
      collide,
      other: hit => nativeContactBody(hit),
      receive: (body, other, hit, side) => {

        const response = nativeContactReceiver(other, body, side, {});
        Object.assign(body, response.incoming);
        Object.assign(other, response.receiver);
        if (response.result) updateNativeContactBody(hit, other);
        return response.result;
      },
      otherUpdated: (hit, body) => { updateNativeContactBody(hit, body); },
      impactSound: request => {
        if (!sound) return;
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        audio.resume();
        barrel.impactPlayback = playNativeProjectileContactSound(audio, request, barrel.impactPlayback);
      },
      skim: body => waterSound(body, true), waterChanged: body => waterSound(body, false),
      camera: request => barrelActivity.camera.push(request), busy: () => { barrelActivity.busy = true; },
      promote: () => nativeRenderOrder.promote(barrel.nativeOrderId),
      delete: () => {},
      detonate: () => { detonate = true; },
      visualRandom: () => matchRandom.visualUint(),
      bubble: ([x, y, , , size]) => spawnWaterBubble(x / 65536, H - y / 65536, 0, size),
    });
    barrel.nativeBody = result.body;
    barrel.x = result.body.x / 65536; barrel.y = H - result.body.y / 65536;
    if (result.deleted) {
      hazards.splice(hazards.indexOf(barrel), 1);
      nativeRenderOrder.release(barrel.nativeOrderId);
      barrel.impactPlayback?.stop();
      dispose(barrel.mesh);
      if (detonate) detonateNativeBarrel(barrel);
    }
  }
  const crateCameraRequests = [];
  let cratesBusy = false;
  for (const crate of [...crates]) {
    const wasFalling = crate.falling;
    let detonate = false;
    const collide = (x, y, body) => nativeSceneCollision(crate, body, x / 65536, H - y / 65536, terrain, worms, H);
    const waterSound = (body, skim) => queueCrateSound(nativeWaterSound(body, skim).sound);
    crate.impactPlayback = cleanupNativeContactSound(crate.impactPlayback);
    const result = stepNativeCrateBody(crate.nativeBody, {
      frame: matchRandom.frame, index: crates.indexOf(crate),
      bottom: nativeProjectileDepth(Math.floor(H - waterLevel)),
      waterY: Math.floor(H - waterLevel), gravity: Math.round(0x3d70 * gravityScale),
      wind: Math.round(wind / 2500 * 65536),
    }, {
      collide,
      other: hit => nativeContactBody(hit),
      receive: (body, other, hit, side) => {

        const response = nativeContactReceiver(other, body, side, {});
        Object.assign(body, response.incoming);
        Object.assign(other, response.receiver);
        if (response.result) updateNativeContactBody(hit, other);
        return response.result;
      },
      otherUpdated: (hit, body) => { updateNativeContactBody(hit, body); },
      impactSound: request => {
        if (!sound) return;
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        audio.resume();
        crate.impactPlayback = playNativeProjectileContactSound(audio, request, crate.impactPlayback);
      },
      skim: body => waterSound(body, true), waterChanged: body => waterSound(body, false),
      camera: request => crateCameraRequests.push(request), busy: () => { cratesBusy = true; },
      delete: () => {},
      detonate: () => { detonate = true; },
      visualRandom: () => matchRandom.visualUint(),
      bubble: ([x, y, , , size]) => spawnWaterBubble(x / 65536, H - y / 65536, 0, size),
    });
    crate.nativeBody = result.body;
    crate.x = result.body.x / 65536;
    crate.y = H - result.body.y / 65536;
    crate.vy = -result.body.vy / 65536 * 50;
    crate.falling = !!nativeBodyAwake(result.body);
    crate.mesh.position.set(crate.x, crate.y, 18);
    if (result.deleted) {
      if (detonate) detonateNativeCrate(crate);
      nativeRenderOrder.release(crate.nativeOrderId);
      dispose(crate.mesh);
      crates.splice(crates.indexOf(crate), 1);
    } else if (wasFalling && !crate.falling) announce("SUPPLY CRATE LANDED");
  }
  // 004B64B0 gives damage reveal priority over 004EC060's single death dispatch.
  // Host physics still supplies the busy predicate until the full task scheduler is ported.
  if (cratesBusy || barrelActivity.busy || flameActivity.busy) nativeBusy.wake();
  const teamScores = teamRosters.map(roster => {
    const hp = roster.reduce((total, w) => (total + w.hp) | 0, 0);
    return hp === 0 ? 0 : (hp + 1) | 0; // 004B8510.
  });
  if (phase === "settle" || (phase === "aim" && (worms.some(w => w.deathPending) || nativeTeamList.removal || nativeTeamList.order.some(id => teamScores[id] === 0)))) {
    const settled =
      nativeBusy.value === 0 &&
      !projectile && !pendingFire &&
      bombs.length === 0 && airstrikes.length === 0 && retreat <= 0 &&
      worms.every(w => !w.originalTeleport && !w.originalJetpack && w.dying <= 0 &&
        ((w.hp <= 0 && !w.deathPending) ||
          (w.ground && Math.abs(w.vx) < 2 && Math.abs(w.vy) < 2)));
    let healthDisplayBusy = worms.some(w => w.nativeHealthDisplay.active);
    let deathStarted = false;
    if (settled && !healthDisplayBusy) {
      const teams = [0, 1].map(team => worms.filter(w => w.team === team));
      const dispatch = worms.some(w => w.nativeDeathRequest) ? null : nativeNextDeath(
        teams.map(roster => roster.map(w => ({ hp: w.hp,
          state: w.deathPending ? nativeWormState(w) : 0x89, x: Math.round(w.x * 65536) | 0 }))));
      const presentation = nativeSettlementPresentation({
        health: worms.some(w => w.nativeHealthDisplay.pending),
        sort: nativeTeamList.swap >= 0 || nativeTeamListNeedsSort(nativeTeamList, teamScores),
        death: !!dispatch, announcements: nativeAnnouncementsPending(nativeAnnouncements),
        removal: nativeTeamList.removal || nativeTeamList.order.length && teamScores[nativeTeamList.order.at(-1)] === 0,
        panelProgress: nativeTeamPanel.progress, panelTarget: nativeTeamPanel.target,
        // Original shared registry/controller fields are not yet represented
        // by the host. Presentation actions below use the live host objects.
        activeTeam: matchDamageSourceActive ? team + 1 : 0,
        activity: 0, mode: 0, rate: 0, turnFlag: 0, refreshHealth: 0, refreshTeams: 0,
      });
      healthDisplayBusy = !presentation.ready;
      for (const call of presentation.calls) {
        if (call === 'showPanel') showNativeTeamPanel(nativeTeamPanel);
        else if (call === 'revealHealth') {
          for (const w of worms) revealWormHealth(w);
          consumeDamageReaction(true);
        } else if (call === 'sortTeams') sortNativeTeamList(nativeTeamList, teamScores);
        else if (call === 'startDeath') {
          const w = teams[(dispatch.target >> 4) - 1][(dispatch.target & 15) - 1];
          w.nativeDeathRequest = 1;
          deathStarted = true;
        } else if (call === 'removeTeam') {
          const alreadyRemoving = nativeTeamList.removal !== 0;
          if (removeNativeTeamListRow(nativeTeamList, teamScores) && !alreadyRemoving) {
            teamPanelSoundState.drop = 65536;
            pendingEliminationTeam = nativeTeamList.order[nativeTeamList.removeIndex];
          }
        }
      }
    }
    if (phase === "settle") {
      shotWait = settled && !healthDisplayBusy && !deathStarted && !worms.some(w => w.nativeDeathRequest) ? shotWait + dt : 0;
      if (shotWait > 0.7 && !nativeAnnouncementsPending(nativeAnnouncements)) {
        if (currentScenario?.weaponsDontEndTurn && phase === "settle") {
          phase = "aim";
          retreat = 0;
          shotWait = 0;
          wormLocked = false;
          move = 0;
          updateUI();
        } else nextTurn();
      }
    }
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
  const wormTracking = pendingWormCamera.length > 0;
  const environmentTracking = pendingEnvironmentCamera !== null || nativeNuclearEffect?.progress >= 0;
  if (!nativeCameraFraming && (trackedProjectiles.length || mineCameraRequests.length || crateCameraRequests.length || barrelActivity.camera.length || flameActivity.camera.length || teleportTracking || wormTracking || environmentTracking)) {
    nativeCamera.reset();
    nativeCameraFraming = new NativeCameraFraming(
      Math.round(cameraX * 65536), Math.round((H - cameraY) * 65536), 1000 * 65536,
    );
  }
  if (pendingEnvironmentCamera) {
    nativeCamera.offerSpecial(...pendingEnvironmentCamera);
    pendingEnvironmentCamera = null;
  }
  for (const tracked of trackedProjectiles) {
    nativeCamera.offer(...nativeProjectileCameraRequest(tracked.nativeBody, [0, W * 65536, -256 * 65536]));
  }
  for (const request of pendingWormCamera) nativeCamera.offer(...request);
  for (const request of mineCameraRequests) nativeCamera.offer(...request);
  for (const request of crateCameraRequests) nativeCamera.offer(...request);
  for (const request of barrelActivity.camera) nativeCamera.offer(...request);
  for (const request of flameActivity.camera) nativeCamera.offer(...request);
  pendingWormCamera = [];
  if (nativeCameraFraming && (airstrikes.length || trackedProjectiles.length || mineCameraRequests.length || crateCameraRequests.length || barrelActivity.camera.length || flameActivity.camera.length || teleportTracking || wormTracking || environmentTracking)) {
    const aspect = arena.clientWidth / arena.clientHeight;
    const viewport = [Math.floor(Math.min(W, H * aspect)), Math.floor(Math.min(H, W / aspect))];
    const position = nativeCameraFraming.track(nativeCamera, matchRandom.frame, viewport, [0, -256 * 65536, W * 65536, H * 65536]);
    nativeCameraFocus = { x: position[0] / 65536, y: H - position[1] / 65536 };
  } else {
    nativeCameraFocus = null;
    nativeCameraFraming = null;
  }
  stepGroundPoses();
  stepIdleGestures();
  matchRandom.finishFrame();
}
function screen(x, y) {
  return {
    x: ((x - view.x) / view.w) * renderer.domElement.clientWidth,
    y: ((view.y + view.h - y) / view.h) * renderer.domElement.clientHeight,
  };
}
// Density may change without a layout resize (monitor moves/browser zoom).
let renderedDisplayDensity = 0;
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
  renderedDisplayDensity = window.devicePixelRatio;
  const pixels = pixelViewport(arena.clientWidth, arena.clientHeight, coarsePointer ? 480 : 960, renderedDisplayDensity);
  renderer.setSize(pixels.width, pixels.height, false);
  renderer.domElement.style.width = `${pixels.width * pixels.scale}px`;
  renderer.domElement.style.height = `${pixels.height * pixels.scale}px`;
  renderer.domElement.dataset.pixelScale = pixels.scale;
  renderer.domElement.dataset.devicePixelScale = pixels.deviceScale;
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
  if (renderedDisplayDensity !== window.devicePixelRatio) resize();
  syncMusic();
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
  if (mousePanPointer && matchStarted && !menu.open && !overview && !replaying && !touchPan) {
    const rect = arena.getBoundingClientRect();
    const x = mousePanPointer.x - rect.left, y = mousePanPointer.y - rect.top;
    const edge = 48;
    const speed = (position, size) => position < edge
      ? -Math.max(0, 1 - position / edge)
      : position > size - edge ? Math.max(0, 1 - (size - position) / edge) : 0;
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      const dx = speed(x, rect.width), dy = speed(y, rect.height);
      if (dx || dy) {
        const next = cameraView(view.x + view.w / 2 + dx * 700 * frameDt * view.w / rect.width,
          view.y + view.h / 2 - dy * 700 * frameDt * view.h / rect.height,
          view.zoom, rect.width / rect.height);
        manualCamera = { cx: next.x + next.w / 2, cy: next.y + next.h / 2, zoom: next.zoom };
      }
    }
  }
  if (manualCamera && !overview) camTarget = manualCamera;
  if (manualCamera || cameraSnap || (nativeCameraFocus && !overview)) {
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
    nativeCameraFocus && !overview && !manualCamera ? H + SKY_HEADROOM : H,
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
                      : "idle";
    w.g.visible = !w.invisible;
    w.label.style.display = w.invisible ? "none" : "";
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
      w.body.position.set(original.offsetX??0, 0, 24);
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
    const damagePlacement = nativeDamageTextPlacement({
      ...w.nativeHealthDisplay, x: Math.round(w.x * 65536),
      y: Math.round((H - w.y) * 65536), color: w.team ? 0 : 2, rank: 0,
    });
    if (damagePlacement && w.nativeDamageText !== undefined) {
      if (!w.damageCanvas) {
        w.damageCanvas = document.createElement("canvas");
        w.damageCanvas.className = "native-damage-number";
        $("#damage").append(w.damageCanvas);
      }
      paintOriginalDamageText(w.damageCanvas, w.nativeDamageText, w.team);
      const point = screen(damagePlacement.x / 65536, H - damagePlacement.y / 65536);
      w.damageCanvas.style.left = `${Math.round(point.x - w.damageCanvas.width / 2)}px`;
      w.damageCanvas.style.top = `${Math.round(point.y - w.damageCanvas.height / 2)}px`;
      w.damageCanvas.hidden = false;
    } else if (w.damageCanvas) w.damageCanvas.hidden = true;
    const labelPlacement = nativeWormLabelPlacement({
      x: Math.round(w.x * 65536), y: Math.round((H - w.y) * 65536),
      progress: 65536, labelMode, compact: 0, teamInactive: 0, surrendered: 0,
      state: nativeWormState(w), ammo: 0, suppressAmmo: 0,
      rank: 0, color: w.team ? 0 : 2, selected: active && phase !== "over",
      suppressed: 0, tick: selectionTick,
    });
    updateOriginalWormLabel(w.label, w, active && phase !== "over", selectionTick, labelPlacement, {
      x: Math.round(w.x * 65536), y: Math.round((H - w.y - 42) * 65536),
    });
    w.label.classList.toggle("hurt", w.hurt > 0);
    w.shadow.visible = w.ground && w.hp > 0;
    const p = screen(+w.label.dataset.nativeX, H - +w.label.dataset.nativeTop);
    const submerged = w.nativeHurtBody?.submerged || w.nativeFlight?.submerged || w.drowned;
    w.label.style.visibility = w.g.visible && !submerged ? "visible" : "hidden";
    if (active) {
      const charge = $("#worm-charge"),
        cp = screen(w.x, w.renderY - 16);
      charge.style.left = `${Math.round(cp.x)}px`;
      charge.style.top = `${Math.round(cp.y)}px`;
    }
    const labelLeft = Math.round(p.x) - Math.floor(+w.label.dataset.nativeWidth / 2);
    const labelTop = Math.round(p.y);
    w.label.style.left = labelLeft + "px";
    w.label.style.top = labelTop + "px";
    const arrow = nativeSelectionPlacement({ x: Math.round(w.x * 65536),
      y: Math.round((H - w.y) * 65536), progress: 65536,
      color: w.team ? 0 : 2, alternate: false, tick: selectionTick });
    const arrowPoint = screen(arrow.x >> 16, H - (arrow.y >> 16));
    updateOriginalSelection(w.label, w.team, selectionTick, active && w.hp > 0 && phase !== "over",
      { x: arrowPoint.x - labelLeft, y: arrowPoint.y - labelTop });
  }
  for (const flame of nativeFlames) if (flame) {
    const art = nativeFlameArt(flame.body);
    flame.body = art.body;
    const [, x, y, , sprite, progress] = art.request;
    updateOriginalObject(flame.mesh, nativeSpriteIds.sprites[sprite].name, 0, progress);
    flame.mesh.position.set(Math.round(x / 65536), Math.round(H - y / 65536), 26);
  }
  for (const barrel of hazards) {
    const [, x, y, , sprite, progress] = nativeBarrelArt(barrel.nativeBody, selectionTick,
      nativeRenderOrder.orders[barrel.nativeOrderId]);
    const name = nativeWaterSpriteIds.sprites[sprite]
      ? `water/${nativeWaterSpriteIds.sprites[sprite].name}` : nativeSpriteIds.sprites[sprite].name;
    updateOriginalObject(barrel.mesh, name, 0, progress);
    barrel.mesh.position.set(Math.round(x / 65536), Math.round(H - y / 65536), 17);
  }
  for (const crate of crates) {
    updateOriginalCrate(crate.mesh, crate.nativeBody, {
      rank: nativeRenderOrder.orders[crate.nativeOrderId], labelMode, frame: selectionTick,
      // Offline host control mapping: local humans have visibility; AI has a
      // negative native controller byte. Full scene permission ownership remains.
      showContents: nativeCrateContentsVisible(worms[current] ? team + 1 : 0, true,
        team === 1 && mode === "ai" ? -1 : 0, worms[current]?.nativeTeamModifiers || 0),
      contentName: (WEAPONS[crate.content] || UTILITIES[crate.content] || AUTOMATIC_UTILITIES[crate.content])?.label || "",
      contentSpecial: nativeSpecialCrateContent(WEAPON_SLOTS[crate.content]),
    });
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
    retreat > 0 ? Math.ceil(retreat) : Math.trunc((nativeClockPresentation.displayed + 999) / 1000);
  const timerMilliseconds = Math.max(0, (retreat > 0 ? Math.round(retreat * 1000) : nativeClockPresentation.displayed));
  const timerRunning = phase === "aim" && retreat <= 0;
  const timerState = `${timerValue}:${retreat > 0}:${Math.trunc(timerMilliseconds / 250)}:${timerRunning}`;
  if (timerState !== timerKey) {
    timerKey = timerState;
    updateOriginalTimer(timerValue, retreat > 0, document, timerMilliseconds, timerRunning);
  }
  updateNativeAnnouncement(nativeAnnouncements, $("#announcement"));
  water.userData.update(reducedMotion ? 0 : now * 0.001);
  motes.forEach((m, i) => {
    m.position.x = (i * 127 + now * 0.007) % W;
    m.position.y = 150 + ((i * 73) % 450) + Math.sin(now * 0.0007 + i) * 12;
  });
  camera.position.x = 0;
  camera.position.y = 0;
  if (!reducedMotion && nativeNuclearEffect?.shake) {
    const base = [Math.round((view.x + view.w / 2) * 65536),
      Math.round((H - view.y - view.h / 2) * 65536), 0];
    const shaken = nativeCameraShake(base, matchRandom.frame, [nativeNuclearEffect.shake, 0]);
    // 004C5250 rounds the native camera to world pixels for projection.
    camera.position.x += ((shaken[0] + 0x8000) >> 16) - ((base[0] + 0x8000) >> 16);
    camera.position.y -= ((shaken[1] + 0x8000) >> 16) - ((base[1] + 0x8000) >> 16);
  }
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
  markNativePickupAction();
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
$("#utilities-toggle").onclick = () => $("#inventory-toggle").click();
$("#special-toggle").onclick = () => { specialOpen = !specialOpen; updateUI(); };
for (const button of document.querySelectorAll("[data-utility]"))
  button.onclick = () => useUtility(button.dataset.utility);
$("#jump").onclick = () => jump("forward");
$("#backflip").onclick = () => jump("backflip");
$("#fuse").onchange = (e) => {
  if (canAct() && !charging) { markNativePickupAction(); fuse = +e.target.value; }
};
$("#bounce").onchange = (e) => {
  if (canAct() && !charging) { markNativePickupAction(); bounce = +e.target.value; }
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
  markNativePickupAction();
  const rect = arena.getBoundingClientRect(),
    x = view.x + ((e.clientX - rect.left) / rect.width) * view.w,
    y = view.y + (1 - (e.clientY - rect.top) / rect.height) * view.h,
    w = worms[current];
  let a =
    (Math.atan2(y - shot(w).pivot.y, x - shot(w).pivot.x) * 180) / Math.PI;
  if (a < -90) a += 360;
  angle = Math.max(-85, Math.min(265, a));
  w.facing = Math.cos((angle * Math.PI) / 180) < 0 ? -1 : 1;
  updateSliders();
}
arena.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button, a, input, select") || menu.open || !matchStarted) return;
  if (e.pointerType === "touch" || e.button === 1) {
    if (touchPan) return;
    e.preventDefault();
    touchPan = { id: e.pointerId, x: e.clientX, y: e.clientY,
      cx: view.x + view.w / 2, cy: view.y + view.h / 2,
      w: view.w, h: view.h, zoom: view.zoom, dragged: false, touch: e.pointerType === "touch" };
    arena.setPointerCapture(e.pointerId);
    return;
  }
  if (e.button !== 0) return;
  if (targetUtility) { handleUtilityTarget(e); return; }
  aiming = true;
  arena.setPointerCapture(e.pointerId);
  pointerAim(e);
});
arena.addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse") mousePanPointer =
    e.target.closest("button, a, input, select") ? null : { x: e.clientX, y: e.clientY };
  if (touchPan?.id === e.pointerId) {
    e.preventDefault();
    const dx = e.clientX - touchPan.x, dy = e.clientY - touchPan.y;
    touchPan.dragged ||= Math.hypot(dx, dy) > 6;
    if (!touchPan.dragged || overview) return;
    const rect = arena.getBoundingClientRect();
    const next = cameraView(touchPan.cx - dx * touchPan.w / rect.width,
      touchPan.cy + dy * touchPan.h / rect.height, touchPan.zoom,
      rect.width / rect.height);
    manualCamera = { cx: next.x + next.w / 2, cy: next.y + next.h / 2, zoom: next.zoom };
  } else if (aiming) pointerAim(e);
});
arena.addEventListener("pointerleave", () => { mousePanPointer = null; });
window.addEventListener("blur", () => { mousePanPointer = null; });
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  arena.addEventListener(event, e => {
    if (touchPan?.id === e.pointerId) {
      if (event === "pointerup" && !touchPan.dragged && touchPan.touch) {
        if (targetUtility) handleUtilityTarget(e);
        else pointerAim(e);
      }
      touchPan = null;
    }
    aiming = false;
  });
function updateLabelModeButton() {
  const detail = ['team, name and health', 'name and health', 'health only', 'hidden'][labelMode];
  $('#label-detail').setAttribute('aria-label', `Worm labels: ${detail}. Cycle label detail`);
  $('#label-detail').title = `Worm labels: ${detail} (Delete)`;
}
function cycleLabelMode() {
  labelMode = nextNativeLabelMode(labelMode);
  updateLabelModeButton();
}
$('#label-detail').onclick = cycleLabelMode;
window.addEventListener("keydown", (e) => {
  if (menu.open) return;
  if (e.key === 'Delete' && e.shiftKey) {
    e.preventDefault();
    if (!e.repeat) toggleTeamPanelVisibility = !toggleTeamPanelVisibility;
    return;
  }
  if (e.key === 'Delete' && !e.shiftKey) {
    e.preventDefault();
    if (!e.repeat) cycleLabelMode();
    return;
  }
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
  if (targetUtility === "girder" && (e.key === "[" || e.key === "]")) {
    girderAngle = Math.max(-90, Math.min(90, girderAngle + (e.key === "]" ? 22.5 : -22.5)));
    $("#status").textContent = `Girder angle ${girderAngle}°.`;
    updateUI();
    return;
  }
  if (targetUtility === "girder" && e.key.toLowerCase() === "l") {
    girderLength = girderLength === 64 ? 96 : 64;
    $("#status").textContent = girderLength === 96 ? "Long girder selected." : "Short girder selected.";
    updateUI();
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
  touchPan = null;
  aiming = false;
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
$("#daily").addEventListener("click", async () => {
  const { key, seed } = dailySeed();
  daily = { date: key, seed };
  $("#mode").value = "ai";
  $("#format").value = "single";
  $("#weather").value = "clear";
  $("#modifier").value = "standard";
  $("#scheme").value = "classic";
  currentScenario = null;
  scenarioProgress = null; scenarioSequence = []; scenarioSequenceIndex = 0; scenarioTimed = []; scenarioTurn = 0;
  syncMenuOptions();
  saveSettings();
  matchStarted = true;
  if (await reset({ seed, isDaily: true }) === false) return;
  menu.close();
});
$("#sound").onclick = () => {
  sound = !sound;
  syncMusic(); music.unlock();
  if (!sound) stopNativeNuclearAudio();
  if (!sound) { stopBurstSound(); stopProjectileSound(); }
  if (!sound) for (const b of bombs) {
    b.nativeFusePlayback?.stop();
    b.nativeFusePlayback = null;
  }
  updateSoundButton();
  saveSettings();
  tone(440);
};
$("#start").onclick = async event => {
  event.preventDefault();
  currentScenario = null;
  scenarioProgress = null; scenarioSequence = []; scenarioSequenceIndex = 0; scenarioTimed = []; scenarioTurn = 0;
  $("#start").textContent = "LET’S MAKE TROUBLE ↗";
  matchStarted = true;
  try {
    if (await reset() === false) return;
    menu.close();
  } catch (error) { console.error("Map loading failed", error); }
};
menu.addEventListener("close", () => {
  matchStarted = true;
  if (phase === "menu" && !mapLoading) reset();
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
for(const t of [0,1]) {
  const select=$('#team-voice-'+t);
  for(const bank of speechBankOptions)select.add(new Option(bank.label,bank.value));
  select.value='english';select.addEventListener('change',saveSettings);
}
applySettings();
let decorationLoadVersion = 0;
async function prepareDecorations() {
  const version = ++decorationLoadVersion;
  $("#start").disabled = $("#daily").disabled = true;
  try {
    await originalAssets;
    if ($("#map-layout").value === "random")
      preparedRandomSeed = crypto.getRandomValues(new Uint32Array(1))[0];
    await Promise.all([
      loadOriginalMap($("#map-layout").value === "random" ? randomOriginalMap(preparedRandomSeed) : $("#map-layout").value),
      loadOriginalDecorations($("#terrain-theme").value),
      loadNativeMapTheme($("#terrain-theme").value,true),
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
    await loadingStep(prepareDecorations());
    if (originalArtError) throw new Error(originalArtError);
    const firstMapSeed = preparedRandomSeed;
    syncMenuOptions(); updateRecordUI(); await reset({ seed: firstMapSeed });
    // The first match uses the map already loaded behind the setup screen.
    preparedRandomSeed = firstMapSeed;
    menu.showModal(); resetMenuScroll(); updateUI(); resize(); prewarmShaders();
    loadingSteps=12;updateLoadingProgress();
    last = performance.now();
    requestAnimationFrame(now => {
      frame(now);
      assetsReady = true;
      document.body.classList.remove("assets-loading");
      stopAssetProgress();
      $("#asset-loading").remove();
    });
  } catch (error) {
    originalArtError = error.message;
    stopAssetProgress();
    $("#asset-loading").textContent = "Game assets could not load. Reload to retry.";
    $("#asset-loading").setAttribute("role", "alert");
  }
}
mountArmageddonFrontend({
  playScenario: async (scenario) => {
    if (!scenario?.terrain) return;
    $("#mode").value = "ai";
    syncMenuOptions();
    $("#scheme").value = "custom";
    $("#format").value = "single";
    $("#weather").value = "clear";
    $("#modifier").value = "standard";
    $("#turn-time").value = String(scenario.turnTime);
    $("#retreat-time").value = String(scenario.retreatTime);
    $("#map-layout").value = `original:${scenario.terrain}`;
    currentScenario = { ...scenario };
    matchStarted = true;
    await prepareDecorations();
    if (await reset() === false) {
      announce("SCENARIO LANDSCAPE COULD NOT LOAD");
      return;
    }
    menu.close();
    announce(`${scenario.title}${scenario.briefing ? `: ${scenario.briefing}` : ""}`);
  },
});
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
    crate: crates.length ? crateSnapshot(crates[0]) : null,
    crates: crates.map(crateSnapshot),
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
    nativeFlames: nativeFlames.filter(Boolean).map(flame => ({
      body: { ...flame.body }, record: [...flame.record],
      sprite: flame.mesh.userData.originalSprite, frame: flame.mesh.userData.originalFrame,
    })),
    hazards: hazards.map((h) => ({
      nativeBody: { ...h.nativeBody },
      x: Math.round(h.x),
      y: Math.round(h.y),
      sprite: h.mesh.userData.originalSprite,
      scenario: h.scenario ?? null,
    })),
    mines: mines.map((m) => ({
      scenario: m.scenario ?? null,
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
    laserSight,
    scenario: scenarioProgress ? { ...scenarioProgress } : null,
    invisibleTeam,
    friction: matchFriction,
    fallDamageScale,
    mineFuse: currentScenario?.mineFuse ?? null,
    randomSeed: matchRandom.seed,
    flames: nativeFlames.filter(Boolean).length,
    suddenDeathDisabled: Boolean(currentScenario?.suddenDeath?.disabled),
    activeUtility,
    targetUtility,
    rope: {
      firing: Boolean(rope.firing),
      tip: rope.tip ? { x: rope.tip.position.x, y: rope.tip.position.y } : null,
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
    bungeeArmed,
    frozen: worms.map((w) => w.frozen ?? 0),
    waterLevel,
    nativeBusyTicks: nativeBusy.value,
    pendingPoisonSettlement,
    pendingEnvironmentSettlement,
    nativeWaterRise: nativeWaterRise ? { ...nativeWaterRise } : null,
    nativeNuclearEffect: nativeNuclearEffect ? { ...nativeNuclearEffect } : null,
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
    matchStatistics: { ...nativeMatchStatistics },
    damageReaction: { ...nativeDamageReaction },
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
        nativeSpeechBank,
        name,
        hp,
        damageTaken,
        matchStats,
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
        nativePoison,
        originalRecovery,
        invisible,
      }) => ({
        nativeSpeechBank,
        name,
        hp,
        damageTaken,
        matchStats: { ...matchStats, hp },
        nativePoison: { ...nativePoison },
        x,
        y,
        vx,
        vy,
        ground,
        knocked,
        invisible: Boolean(invisible),
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
    captureReplayState: captureMatchReplayState,
    restoreReplayState: restoreMatchReplayState,
    advanceReplayFrames(count=1) {
      const previous = replaySimulation;
      replaySimulation = true;
      try { for (let i=0;i<count;i++) step(LOGIC_STEP_SECONDS); }
      finally { replaySimulation = previous; }
    },
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
      collectCrate(worms[current]);
    },
    collectScenarioCrate() {
      const crate = crates.find((entry) => entry.scenario &&
        (entry.scenario.kind === "weapon" || entry.scenario.kind === "target"));
      if (!crate) return false;
      collectCrate(worms[current], crate);
      return true;
    },
    hit(teamIndex = 1, damage = 200) {
      for (const w of worms) if (w.team === teamIndex) injure(w, damage, 1);
    },
    triggerSuddenDeath() {
      return applySuddenDeath();
    },
    applySuddenDeathDamage() {
      return applyScenarioSuddenDeathDamage();
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
      // Start above the original automatic deployment threshold (400 px/s).
      w.vy = -450;
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
      if (kind === "napalm") {
        const p = { x, y, vx: 0, vy: 0, kind, owner: 0, fuse: 3, bounce: 0 };
        attachNativeProjectile(p, H);
        detonateNativeProjectile(p);
        return;
      }
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
    setUtility(teamIndex = 0, kind = "crateshower", value = 1) {
      utilityAmmo[teamIndex][kind] = value;
      updateUI();
    },
    resetSeed(seed = 42) {
      return reset({ seed });
    },
    consumeVisualRandom(count = 1) {
      for (let i = 0; i < count; i++) visualRandom();
    },
    setCrateKind(kind = "special") {
      if (crates[0]) {
        crates[0].kind = kind;
        crates[0].nativeBody.kind = nativeCrateKind(kind);
        crates[0].content = chooseCrateContent(kind);
        crates[0].quantity = kind === "health" ? 25 : 1;
      }
    },
    releaseRope() {
      releaseRope();
    },
  };
}
