const sounds = {
  freeze: "freeze",
  unfreeze: "unfreeze",
  frozenhit: "frozenwormimpact",
  rocket: "rocketrelease",
  homing: "rocketrelease",
  mortar: "rocketrelease",
  shotgun: "shotgunfire",
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
export function playOriginalSound(context, kind, fallback) {
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
      gain.gain.value = 0.35;
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
