// Short synthesized voices: no downloaded samples, and silence until enabled.
export const SOUND_PROFILES = {
  rocket: [130, 40, 0.28, "sawtooth", 0.07],
  homing: [460, 150, 0.28, "triangle", 0.08],
  mortar: [85, 32, 0.35, "triangle", 0.12],
  shotgun: [180, 35, 0.14, "square", 0.09],
  grenade: [340, 180, 0.12, "triangle", 0.07],
  cluster: [300, 85, 0.18, "square", 0.06],
  holy: [880, 440, 0.35, "triangle", 0.07],
  napalm: [240, 65, 0.3, "sawtooth", 0.05],
  explosion: [85, 25, 0.42, "sawtooth", 0.1],
  bounce: [180, 75, 0.055, "triangle", 0.045],
  fuse: [1100, 800, 0.035, "square", 0.025],
  land: [90, 40, 0.06, "triangle", 0.035],
  jump: [220, 550, 0.11, "sine", 0.05],
  hit: [430, 110, 0.08, "square", 0.04],
  airstrike: [120, 340, 0.6, "sawtooth", 0.04],
};
export function playSound(context, kind) {
  const [start, end, duration, type, volume] =
    SOUND_PROFILES[kind] ?? SOUND_PROFILES.grenade;
  const now = context.currentTime,
    voice = context.createOscillator(),
    gain = context.createGain();
  voice.type = type;
  voice.frequency.setValueAtTime(start, now);
  voice.frequency.exponentialRampToValueAtTime(end, now + duration);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  voice.connect(gain);
  gain.connect(context.destination);
  voice.start(now);
  voice.stop(now + duration);
  voice.onended = () => {
    voice.disconnect();
    gain.disconnect();
  };
  if (!["explosion", "shotgun", "rocket", "napalm"].includes(kind)) return;
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * duration),
    context.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
  const noise = context.createBufferSource(),
    filter = context.createBiquadFilter(),
    level = context.createGain();
  noise.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.value = kind === "shotgun" ? 2600 : 900;
  level.gain.value = volume * 0.6;
  noise.connect(filter);
  filter.connect(level);
  level.connect(context.destination);
  noise.start(now);
  noise.onended = () => {
    noise.disconnect();
    filter.disconnect();
    level.disconnect();
  };
}
