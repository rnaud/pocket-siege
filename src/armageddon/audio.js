import speech from "./speech-slots.json";

const sounds = {
  splash: "splash",
  sizzle: "sizzle", // Native ID 0x37, descriptor 0055F228.
  splish: "splish",
  freeze: "freeze",
  unfreeze: "unfreeze",
  frozenhit: "frozenwormimpact",
  rocket: "rocketrelease",
  homing: "rocketrelease",
  mortar: "rocketrelease",
  shotgun: "shotgunfire",
  batimpact: "baseballbatimpact",
  axeimpact: "vikingaxeimpact",
  firepunchimpact: "firepunchimpact",
  dragonball: "dragonballrelease",
  dragonballimpact: "dragonballimpact",
  axerelease: "vikingaxerelease",
  shotgunreload: "shotgunreload",
  grenade: "throwrelease",
  sticky: "throwrelease",
  cluster: "throwrelease",
  holy: "holygrenade",
  napalm: "petrol",
  explosion: "explosion1",
  bounce: "grenadeimpact",
  fuse: "fuse",
  land: "wormlanding",
  jump: "wormspring",
  hit: "wormimpact",
  airstrike: "airstrike",
};
const contexts = new WeakMap();
export function playOriginalSound(context, kind, fallback, level = 1) {
  const name = sounds[kind];
  if (!name) {
    fallback();
    return;
  }
  playOriginalClip(context, `sounds/${name}.wav`, fallback, level);
}
export function preloadOriginalSound(context, kind) {
  const name = sounds[kind];
  return name
    ? loadOriginalClip(context, `sounds/${name}.wav`)
    : Promise.resolve(null);
}
function loadOriginalClip(context, name) {
  let cache = contexts.get(context);
  if (!cache) {
    cache = new Map();
    contexts.set(context, cache);
  }
  if (!cache.has(name))
    cache.set(
      name,
      fetch(`${import.meta.env.BASE_URL}armageddon/${name}`)
        .then((r) => {
          if (!r.ok) throw new Error(name);
          return r.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes)),
    );
  return cache.get(name);
}
function playOriginalClip(context, name, fallback, level, loop = false) {
  const requested = performance.now();
  let cancelled = false,
    activeSource = null;
  const playback = {
    stop() {
      cancelled = true;
      if (activeSource) {
        activeSource.stop();
        activeSource = null;
      }
    },
  };
  loadOriginalClip(context, name)
    .then((buffer) => {
      if (cancelled || performance.now() - requested > 500) return;
      const source = context.createBufferSource(),
        gain = context.createGain();
      activeSource = source;
      source.buffer = buffer;
      source.loop = loop;
      gain.gain.value = 0.35 * Math.max(0, Math.min(1, level));
      source.connect(gain);
      gain.connect(context.destination);
      source.onended = () => {
        activeSource = null;
        source.disconnect();
        gain.disconnect();
      };
      source.start();
    })
    .catch(() => {
      contexts.get(context).delete(name);
      if (!cancelled) fallback();
    });
  return playback;
}

// Native IDs verified at descriptors 0055F258 / 0055F260. Browser gain is a
// host adapter; native priority, spatial mixing and backend attenuation remain.
export function playNativeWaterSound(context, request) {
  const kind =
    request[0] === 0x39 ? "splash" : request[0] === 0x3a ? "splish" : null;
  if (kind) playOriginalSound(context, kind, () => {}, request[3] / 65536);
}

// 0055F120 maps native ID 0x23 to WormLanding.wav. Strength comes from
// 004D7E5C (absolute native vertical velocity / 8); gain remains a host adapter.
export function playNativeLandingSound(context, request) {
  if (request[0] === 0x23)
    playOriginalSound(context, "land", () => {}, request[3] / 65536);
}

// Original table 0055F460 consists of explicit ID/filename pairs, not ordinal
// slots: Oops/Orders/Ouch precede IDs38..40 in the table. English remains the
// host default until team speech selection and native priority arbitration land.
export function playNativeSpeech(context, slot, level = 1) {
  const entry = speech.slots[slot];
  return entry ? playOriginalClip(context, `voices/english/${entry.clip}`, () => {}, level) : null;
}

export function playNativeDeathVoice(context, request) {
  if (request[0] === 6 || request[0] === 33)
    return playNativeSpeech(context, request[0], request[3] / 65536);
}

export function playNativeHitVoice(context, request, previousPlayback) {
  previousPlayback?.stop();
  return playNativeSpeech(context, request.index);
}

// Descriptors 0055F1C8..0055F1F0 (Twang1..6), 0055F220 (WormPop).
export function playNativeRecoverySound(context, request, previousPlayback) {
  const id = request[0];
  const name =
    id >= 8 && id <= 13 ? `twang${id - 7}` : id === 0x36 ? "wormpop" : null;
  if (!name) return null;
  previousPlayback?.stop();
  return playOriginalClip(
    context,
    `sounds/${name}.wav`,
    () => {},
    request[3] / 65536,
  );
}

// Executable descriptors0055F3B8/0055F3F8: IDs105/113. Original004F4260
// stops the previous per-body clip before playing the next impact request.
export function playNativeProjectileContactSound(context, request, previous) {
  // MineImpact.wav is ID107 at descriptor0055F3D0.
  const name = request[0] === 105 ? "holygrenadeimpact" : request[0] === 113 ? "grenadeimpact" : request[0] === 107 ? "mineimpact" : null;
  if (!name) return previous;
  previous?.stop?.();
  return playOriginalClip(context, `sounds/${name}.wav`, () => {}, request[2] / 65536);
}

// Original descriptors 0055F2B0/0055F2C0 map release IDs 73/75.
// Native projectile releases and type2 English laugh speech are routed here;
// Uzi/Minigun loop descriptors are0055F2D8/0055F2E0 (IDs78/79).
// The caller owns the returned loop and stops it on completion/interruption.
export function playNativeProjectileReleaseSound(context, release) {
  let loop = null;
  for (const event of release.calls) {
    if (event.operation === "loopSound") {
      const name = { 78: "uzifire", 79: "minigunfire" }[event.request[0] & 65535];
      if (name) loop = playOriginalClip(context, `sounds/${name}.wav`, () => {}, event.request[2] / 65536, true);
      continue;
    }
    // Speech descriptor0055F540 maps native slot29 to Laugh.wav.
    if (event.operation === "voice" && event.request[1] === 29) {
      playOriginalClip(context, "voices/english/laugh.wav", () => {}, 1);
      continue;
    }
    if (event.operation !== "sound") continue;
    const name = { 73: "throwrelease", 75: "rocketrelease", 82: "handgunfire", 96: "baseballbatrelease" }[event.request[0]];
    if (name)
      playOriginalClip(context, `sounds/${name}.wav`, () => {}, event.request[3] / 65536);
  }
  return loop;
}

// 004E2050 starts record+31C. Descriptors0055F238/0055F278 map
// ID62 MagicBullet.wav and ID66 Fuse.wav.
export function playNativeProjectileFuse(context, sound) {
  const name = { 62: "magicbullet", 66: "fuse" }[sound & 65535];
  if (!name) return null;
  return playOriginalClip(context, `sounds/${name}.wav`, () => {}, 1, Boolean(sound & 0x10000));
}

// Executable descriptors0055F328/330/338: MineArm, MineTick, MineDud.
export function playNativeMineSound(context, request) {
  const name = {88:"minearm",89:"minetick",90:"minedud"}[request[0]];
  if (!name) return null;
  return playOriginalClip(context, `sounds/${name}.wav`, () => {}, request[3] / 65536);
}
