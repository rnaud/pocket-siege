import { nativeProjectileSoundTick } from "./projectile-timer.js";
import soundSlots from "./sound-slots.json";
import { nativeSoundVolume, nativeSoundPan, nativeAttenuationGain } from "./sound-mix.js";
import { nativeSoundChannel, NativeSoundHandles, nativeWormSoundCleanup } from "./sound-queue.js";
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
// Queued samples release on completion; owned sounds retain a native handle
// until the body/UI owner stops them, including after channel displacement.
const playbackChannels = new WeakMap();
const playbackHandles = new WeakMap();
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
function playOriginalClip(context, name, fallback, level, loop = false, rate = 1, priority = 3, pan = 0, tracked = loop) {
  let channels = playbackChannels.get(context);
  if (!channels) {
    channels = Array(8).fill(null);
    playbackChannels.set(context, channels);
    playbackHandles.set(context, new NativeSoundHandles());
  }
  const handles = playbackHandles.get(context);
  let channel = -1, handle = 0;
  const releaseChannel = () => {
    if (channel >= 0 && channels[channel]?.playback === playback) channels[channel] = null;
  };
  const requested = performance.now();
  let settled = false, cancelled = false,
    activeSource = null, activeGain = null;
  const playback = {
    setVolume(value) {
      level = value;
      if (activeGain) activeGain.gain.value = nativeAttenuationGain(nativeSoundVolume(Math.round(level * 65536), 65536, 0, false));
    },
    get handle() { return handle; },
    get finished() { return cancelled || (settled && !activeSource); },
    displace() {
      handles.invalidate(handle);
      cancelled = true;
      releaseChannel();
      if (activeSource) { activeSource.stop(); activeSource = null; }
    },
    stop() {
      if (handle) {
        handles.release(handle, () => playback.displace());
        handle = 0;
      }
      playback.displace();
    },
  };
  loadOriginalClip(context, name)
    .then((buffer) => {
      if (cancelled || performance.now() - requested > 500) return;
      if (tracked && !handles.free.length) return;
      channel = nativeSoundChannel(channels, priority);
      if (channel < 0) return;
      channels[channel]?.playback.displace();
      if (tracked) handle = handles.allocate(channel);
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
        if (!tracked) releaseChannel();
        source.disconnect();
        gain.disconnect();
        for (const node of panNodes) node.disconnect();
      };
      source.start();
    })
    .catch(() => {
      const wasCancelled = cancelled;
      playback.stop();
      contexts.get(context).delete(name);
      if (!wasCancelled) fallback();
    }).finally(() => { settled = true; });
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
export function playNativeLandingSound(context, request, previous) {
  if (request[0] === 0x23) return playNativeOwnedSound(context, request, previous);
  return previous;
}

export function playNativeRopeContactSound(context, request) {
  if (request[0] === 35)
    return playOriginalClip(context, 'sounds/wormlanding.wav', () => {}, request[3] / 65536, false, request[2] / 65536, request[1], request[4], true);
  return null;
}

// Original table 0055F460 consists of explicit ID/filename pairs, not ordinal
// slots: Oops/Orders/Ouch precede IDs38..40 in the table. English remains the
// host default until team speech selection lands.
export function playNativeSpeech(context, slot, level = 1, priority = 3, pan = 0, tracked = false) {
  const entry = speech.slots[slot];
  return entry ? playOriginalClip(context, `voices/english/${entry.clip}`, () => {}, level, false, 1, priority, pan, tracked) : null;
}

export function playNativeDeathVoice(context, request) {
  if (request[0] === 6 || request[0] === 33)
    return playNativeSpeech(context, request[0], request[3] / 65536, request[1], request[4]);
}

export function playNativeHitVoice(context, request, previousPlayback) {
  previousPlayback?.stop();
  return playNativeSpeech(context, request.index, 1, 3, 0, true);
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
    request[3] / 65536, false, request[2] / 65536, request[1], request[4], true,
  );
}

// Executable descriptors0055F3B8/0055F3F8: IDs105/113. Original004F4260
// stops the previous per-body clip before playing the next impact request.
export function playNativeProjectileContactSound(context, request, previous) {
  // MineImpact.wav is ID107 at descriptor0055F3D0.
  const name = request[0] === 105 ? "holygrenadeimpact" : request[0] === 113 ? "grenadeimpact" : request[0] === 107 ? "mineimpact" : null;
  if (!name) return previous;
  previous?.stop?.();
  return playOriginalClip(context, `sounds/${name}.wav`, () => {}, request[2] / 65536, false, request[1] / 65536, 0, request[3], true);
}

// 004A7570 loads explicit ID/filename descriptors at0055F080. The high
// speech marker is the host's English-bank adapter, not an original sample ID.
export function playNativeQueuedSound(context, request) {
  if (request[0] & 0x10000)
    return playNativeSpeech(context, request[0] & 65535, request[3] / 65536, request[1], request[4]);
  const entry = soundSlots.slots[request[0]];
  return entry ? playOriginalClip(context, `sounds/${entry.clip}`, () => {},
    request[3] / 65536, false, request[2] / 65536, request[1], request[4]) : null;
}

// 004DD5D0 stops the worm's previous sound at+38C before retaining a new one.
export function playNativeOwnedSound(context, request, previous) {
  previous?.stop();
  const entry = soundSlots.slots[request[0]];
  return entry ? playOriginalClip(context, `sounds/${entry.clip}`, () => {},
    request[3] / 65536, false, request[2] / 65536, request[1], request[4], true) : null;
}

export function cleanupNativeWormAudio(owner, state) {
  const slots = { 1: "nativeActionPlayback", 2: "nativeHitVoicePlayback" };
  const result = nativeWormSoundCleanup(state, owner.nativeActionPlayback ? 1 : 0,
    owner.nativeHitVoicePlayback ? 2 : 0, id => owner[slots[id]].finished);
  for (const [operation, id] of result.calls) if (operation === "stop") {
    owner[slots[id]].stop(); owner[slots[id]] = null;
  }
}

// 004F9FA0 uses004DD5D0 (+38C speech) and004DD610 (+388 weapon
// priming) independently. These slots must not cancel one another.
export function playNativeFireInputAudio(context, owner, calls, enqueue) {
  for (const call of calls) {
    const request = call.request;
    if (call.operation === "speech") {
      owner.nativeHitVoicePlayback?.stop();
      owner.nativeHitVoicePlayback = playNativeSpeech(context, request[0], request[2] / 65536, 3, request[3], true);
    } else if (call.operation === "localSound") {
      owner.nativeActionPlayback = playNativeOwnedSound(context,
        [request[0], 3, ...request.slice(1)], owner.nativeActionPlayback);
    } else if (call.operation === "sound" || call.operation === "failureSound") {
      enqueue(request);
    }
  }
}

// Original004FABA9..004FADDB queues one-shots, but004DD610 owns immediate
// body loops. Voice lookup precedes its queued sound request; it is not itself
// a playback call. The caller retains the returned loop for stop/interruption.
export function playNativeProjectileReleaseSound(context, release, enqueue = request => playNativeQueuedSound(context, request), owner = null) {
  let loop = null, voiceSlot = null;
  for (const event of release.calls) {
    if (event.operation === "stopLoop") {
      owner?.nativeActionPlayback?.stop();
      if (owner) owner.nativeActionPlayback = null;
      continue;
    }
    if (event.operation === "loopSound") {
      owner?.nativeActionPlayback?.stop();
      const entry = soundSlots.slots[event.request[0] & 65535];
      if (entry) loop = playOriginalClip(context, `sounds/${entry.clip}`, () => {},
        event.request[2] / 65536, Boolean(event.request[0] & 0x10000), event.request[1] / 65536, 3, event.request[3], true);
      if (owner) owner.nativeActionPlayback = loop;
      continue;
    }
    if (event.operation === "voice") {
      voiceSlot = event.request[1];
      continue;
    }
    if (event.operation !== "sound") continue;
    const request = [...event.request];
    if (voiceSlot !== null) { request[0] = voiceSlot | 0x10000; voiceSlot = null; }
    enqueue(request);
  }
  return loop;
}

// 004E2050 starts record+31C as a tracked sound at priority4.
// The descriptor ID and loop flag come directly from the weapon record.
export function playNativeProjectileFuse(context, sound) {
  const entry = soundSlots.slots[sound & 65535];
  if (!sound || !entry) return null;
  return playOriginalClip(context, `sounds/${entry.clip}`, () => {}, 1, Boolean(sound & 0x10000), 1, 4, 0, true);
}

// 004E4B39 owns fuse(+3D8) and secondary-phase(+3D4) independently.
export function updateNativeProjectileAudio(context, projectile) {
  const slots = { 1: "nativeFusePlayback", 2: "nativeSecondaryPlayback" };
  const result = nativeProjectileSoundTick({
    fuse: projectile.nativeFusePlayback ? 1 : 0,
    secondary: projectile.nativeSecondaryPlayback ? 2 : 0,
    active: projectile.nativeBody.delay,
    sound: projectile.nativeSecondarySound,
  }, {
    finished: handle => projectile[slots[handle]].finished,
    stop: handle => {
      projectile[slots[handle]].stop();
      projectile[slots[handle]] = null;
    },
    start: request => {
      if (!context) return 0;
      projectile.nativeSecondaryPlayback = playNativeProjectileFuse(context, request[0]);
      return projectile.nativeSecondaryPlayback ? 2 : 0;
    },
  });
  if (!result.fuse && projectile.nativeFusePlayback === null)
    projectile.nativeTimer.loopSound = 0;
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
