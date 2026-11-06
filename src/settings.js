const KEY = "pocket-siege-settings-v1";
const MODES = ["ai", "local"];
const DIFFICULTIES = ["rookie", "regular", "veteran"];
const FORMATS = ["single", "best3"];
const WEATHERS = ["clear", "rain", "storm"];
const MODIFIERS = [
  "standard",
  "low-gravity",
  "big-blasts",
  "quick-turns",
  "moon-chaos",
];

export function defaultSettings() {
  return {
    sound: false,
    mode: "ai",
    difficulty: "regular",
    format: "single",
    weather: "clear",
    modifier: "standard",
  };
}

function getStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readSettings(storage) {
  try {
    const parsed = JSON.parse(getStorage(storage)?.getItem(KEY) || "null");
    if (!parsed || typeof parsed !== "object") return defaultSettings();
    const base = defaultSettings();
    return {
      ...base,
      sound: Boolean(parsed.sound),
      mode: MODES.includes(parsed.mode) ? parsed.mode : base.mode,
      difficulty: DIFFICULTIES.includes(parsed.difficulty)
        ? parsed.difficulty
        : base.difficulty,
      format: FORMATS.includes(parsed.format) ? parsed.format : base.format,
      weather: WEATHERS.includes(parsed.weather)
        ? parsed.weather
        : base.weather,
      modifier: MODIFIERS.includes(parsed.modifier)
        ? parsed.modifier
        : base.modifier,
    };
  } catch {
    return defaultSettings();
  }
}

export function writeSettings(settings, storage) {
  try {
    getStorage(storage)?.setItem(KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
