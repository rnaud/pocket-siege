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
function playOriginalClip(context, name, fallback, level) {
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

// Speech table entries 0055F48C / 0055F564 map IDs 6 / 33 to these files.
// English is the host team's default until native team speech selection lands.
export function playNativeDeathVoice(context, request) {
  const name =
    request[0] === 6 ? "byebye" : request[0] === 33 ? "ohdear" : null;
  if (name)
    playOriginalClip(
      context,
      `voices/english/${name}.wav`,
      () => {},
      request[3] / 65536,
    );
}

// Speech descriptors 0055F59C/0055F5A4/0055F5AC carry IDs 38/39/40.
export function playNativeHitVoice(context, request, previousPlayback) {
  previousPlayback?.stop();
  const name = { 38: "ouch", 39: "ow1", 40: "ow2" }[request.index];
  if (!name) return null;
  return playOriginalClip(context, `voices/english/${name}.wav`, () => {}, 1);
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
