import { test, expect } from "@playwright/test";
import {
  defaultSettings,
  readSettings,
  writeSettings,
} from "../src/settings.js";

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
  };
}

test("settings round-trip and reject unknown values", () => {
  const storage = fakeStorage();
  expect(readSettings(storage)).toEqual(defaultSettings());
  const settings = {
    sound: true,
    mode: "local",
    difficulty: "veteran",
    format: "best3",
    weather: "storm",
    modifier: "moon-chaos",
  };
  writeSettings(settings, storage);
  expect(readSettings(storage)).toEqual(settings);
  writeSettings({ ...settings, mode: "online", weather: "snow" }, storage);
  expect(readSettings(storage).mode).toBe("ai");
  expect(readSettings(storage).weather).toBe("clear");
  storage.setItem("pocket-siege-settings-v1", "{nope");
  expect(readSettings(storage)).toEqual(defaultSettings());
});
