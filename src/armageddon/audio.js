import { nativeSoundVolume, nativeSoundPan, nativeAttenuationGain } from "./sound-mix.js";
import { nativeSoundChannel } from "./sound-queue.js";
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
  drillimpact: "drillimpact",
  ropefire: "ninjaropefire",
  ropeimpact: "ninjaropeimpact",
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
// Eight-channel selection is native. Web Audio completion currently releases
// channels directly; the original 32-handle pool and its cleanup pass remain.
const playbackChannels = new WeakMap();
export function playOriginalSound(context, kind, fallback, level = 1, priority = 3, pan = 0) {
  const name = sounds[kind];
  if (!name) {
    fallback();
    return;
  }
  playOriginalClip(context, `sounds/${name}.wav`, fallback, level, false, 1, priority, pan);
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
function playOriginalClip(context, name, fallback, level, loop = false, rate = 1, priority = 3, pan = 0) {
  let channels = playbackChannels.get(context);
  if (!channels) {
    channels = Array(8).fill(null);
    playbackChannels.set(context, channels);
  }
  let channel = -1;
  const releaseChannel = () => {
    if (channel >= 0 && channels[channel]?.playback === playback) channels[channel] = null;
  };
  const requested = performance.now();
  let cancelled = false,
    activeSource = null, activeGain = null;
  const playback = {
    setVolume(value) {
      level = value;
      if (activeGain) activeGain.gain.value = nativeAttenuationGain(nativeSoundVolume(Math.round(level * 65536), 65536, 0, false));
    },
    stop() {
      cancelled = true;
      releaseChannel();
      if (activeSource) {
        activeSource.stop();
        activeSource = null;
      }
    },
  };
  loadOriginalClip(context, name)
    .then((buffer) => {
      if (cancelled || performance.now() - requested > 500) return;
      channel = nativeSoundChannel(channels, priority);
      if (channel < 0) return;
      channels[channel]?.playback.stop();
      channels[channel] = { priority, playback };
      const source = context.createBufferSource(),
        gain = context.createGain();
      activeSource = source;
      activeGain = gain;
      source.buffer = buffer;
      source.loop = loop;
      if (rate !== 1) source.playbackRate.value = rate;
      gain.gain.value = nativeAttenuationGain(nativeSoundVolume(Math.round(level * 65536)));
      source.connect(gain);
      const panNodes = [];
      if (pan) {
        // DirectSound balance attenuates one channel; it is not the equal-power
        // crossfeed used by StereoPannerNode. Explicit stereo duplicates mono.
        gain.channelCount = 2;
        gain.channelCountMode = "explicit";
        const split = context.createChannelSplitter(2), merge = context.createChannelMerger(2);
        const left = context.createGain(), right = context.createGain();
        const balance = nativeSoundPan(pan);
        left.gain.value = nativeAttenuationGain(-Math.max(0, balance));
        right.gain.value = nativeAttenuationGain(Math.min(0, balance));
        gain.connect(split);
        split.connect(left, 0); split.connect(right, 1);
        left.connect(merge, 0, 0); right.connect(merge, 0, 1);
        merge.connect(context.destination);
        panNodes.push(split, left, right, merge);
      } else gain.connect(context.destination);
      source.onended = () => {
        activeSource = null;
        releaseChannel();
        source.disconnect();
        gain.disconnect();
        for (const node of panNodes) node.disconnect();
      };
      source.start();
    })
    .catch(() => {
      releaseChannel();
      contexts.get(context).delete(name);
      if (!cancelled) fallback();
    });
  return playback;
}

// Native IDs verified at descriptors 0055F258 / 0055F260.
// Spatial position routing remains a host adapter.
export function playNativeWaterSound(context, request) {
  const kind =
    request[0] === 0x39 ? "splash" : request[0] === 0x3a ? "splish" : null;
  if (kind) playOriginalSound(context, kind, () => {}, request[3] / 65536, request[1], request[4]);
}

// 0055F120 maps native ID 0x23 to WormLanding.wav. Strength comes from
// 004D7E5C (absolute native vertical velocity / 8).
export function playNativeLandingSound(context, request) {
  if (request[0] === 0x23)
    playOriginalSound(context, "land", () => {}, request[3] / 65536, request[1], request[4]);
}

export function playNativeRopeContactSound(context, request) {
  if (request[0] === 35)
    return playOriginalClip(context, 'sounds/wormlanding.wav', () => {}, request[3] / 65536, false, request[2] / 65536, request[1], request[4]);
  return null;
}

// Original table 0055F460 consists of explicit ID/filename pairs, not ordinal
// slots: Oops/Orders/Ouch precede IDs38..40 in the table. English remains the
// host default until team speech selection lands.
export function playNativeSpeech(context, slot, level = 1, priority = 3, pan = 0) {
  const entry = speech.slots[slot];
  return entry ? playOriginalClip(context, `voices/english/${entry.clip}`, () => {}, level, false, 1, priority, pan) : null;
}

export function playNativeDeathVoice(context, request) {
  if (request[0] === 6 || request[0] === 33)
    return playNativeSpeech(context, request[0], request[3] / 65536, request[1], request[4]);
}

export function playNativeHitVoice(context, request, previousPlayback) {
  previousPlayback?.stop();
  return playNativeSpeech(context, request.index, 1, 3);
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
    request[3] / 65536, false, request[2] / 65536, request[1], request[4],
  );
}

// Executable descriptors0055F3B8/0055F3F8: IDs105/113. Original004F4260
// stops the previous per-body clip before playing the next impact request.
export function playNativeProjectileContactSound(context, request, previous) {
  // MineImpact.wav is ID107 at descriptor0055F3D0.
  const name = request[0] === 105 ? "holygrenadeimpact" : request[0] === 113 ? "grenadeimpact" : request[0] === 107 ? "mineimpact" : null;
  if (!name) return previous;
  previous?.stop?.();
  return playOriginalClip(context, `sounds/${name}.wav`, () => {}, request[2] / 65536, false, request[1] / 65536, 3, request[3]);
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
      playOriginalClip(context, `sounds/${name}.wav`, () => {}, event.request[3] / 65536, false, event.request[2] / 65536, event.request[1], event.request[4]);
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
  return playOriginalClip(context, `sounds/${name}.wav`, () => {}, request[3] / 65536, false, request[2] / 65536, request[1], request[4]);
}

// Descriptor0055F308 maps native84 to Drill.wav (85 at0055F310 is impact).
// The host applies tick-requested volume changes.
export function playNativeDrillLoop(context) {
  return playOriginalClip(context, "sounds/drill.wav", () => {}, 1, true);
}

// Original descriptor {93, TimerTick.wav}; speech slot 22 is Hurry.wav.
export function playNativeClockSound(context, request) {
  if (request[0] === 0x10016) return playNativeSpeech(context, 22, request[3] / 65536, request[1], request[4]);
  if (request[0] === 0x5d)
    return playOriginalClip(context, "sounds/timertick.wav", () => {}, request[3] / 65536, false, request[2] / 65536, request[1], request[4]);
  return null;
}

// Sound descriptor ID 1 is Morse.wav; 0x10000 requests looping.
export function playNativeAnnouncementLoop(context, volume) {
  return playOriginalClip(context, "sounds/morse.wav", () => {}, volume / 65536, true, 1, 9);
}

export function playNativeTeamPanelSound(context, request) {
  const clip = request[0] === 0x7a ? "teamdrop" : request[0] === 0x7b ? "teambounce" : null;
  if (clip) return playOriginalClip(context, `sounds/${clip}.wav`, () => {}, request[3] / 65536, false, request[2] / 65536, request[1], request[4]);
  return null;
}

// 004B64B0 requests ID94, priority8, unity pitch/gain at sudden-death onset.
// Descriptor 0055F358 maps ID94 to SuddenDeath.wav.
export function playNativeSuddenDeathSound(context) {
  return playOriginalClip(context, "sounds/suddendeath.wav", () => {}, 1, false, 1, 8);
}

// 004B7D00: weapon/utility drops request ID81 at priority8, unity pitch/gain;
// health drops skip it. Descriptor 0055F2F0 identifies ShotgunReload.wav.
export function playNativeCrateDropSound(context, kind) {
  if (kind === "health") return null;
  return playOriginalClip(context, "sounds/shotgunreload.wav", () => {}, 1, false, 1, 8);
}
