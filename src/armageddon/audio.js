const sounds = {
  splash: "splash",
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
  let cache = contexts.get(context);
  if (!cache) {
    cache = new Map();
    contexts.set(context, cache);
  }
  if (!cache.has(name))
    cache.set(
      name,
      fetch(`${import.meta.env.BASE_URL}armageddon/sounds/${name}.wav`)
        .then((r) => {
          if (!r.ok) throw new Error(name);
          return r.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes)),
    );
  const requested = performance.now();
  cache
    .get(name)
    .then((buffer) => {
      if (performance.now() - requested > 500) return;
      const source = context.createBufferSource(),
        gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = 0.35 * Math.max(0, Math.min(1, level));
      source.connect(gain);
      gain.connect(context.destination);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
      source.start();
    })
    .catch(() => {
      cache.delete(name);
      fallback();
    });
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
