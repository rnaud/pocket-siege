import { test, expect } from "./helpers/shared-page.js";
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

test("settings round-trip and reject unknown values", { tag: "@logic" }, () => {
  const storage = fakeStorage();
  expect(readSettings(storage)).toEqual(defaultSettings());
  const settings = {
    sound: true,
    teamSpeech:['danish~1','austra~1','english','german'],
    teamCount: 4,
    teamControl: ["human", "cpu", "human", "cpu"],
    weaponDelays: { holy: 2, airstrike: -1 },
    mode: "local",
    difficulty: "veteran",
    format: "best3",
    weather: "storm",
    mapLayout: "archipelago",
    terrainTheme: "snow",
    modifier: "moon-chaos",
    scheme: "custom",
    turnTime: 60,
    retreatTime: 8,
    suddenDeath: "nuke",
  };
  writeSettings(settings, storage);
  expect(readSettings(storage)).toEqual(settings);
  const { weaponDelays, ...legacy } = settings;
  writeSettings(legacy, storage);
  expect(readSettings(storage)).toEqual({ ...legacy, weaponDelays: {} });
  writeSettings({ ...settings, mode: "online", weather: "snow" }, storage);
  expect(readSettings(storage).mode).toBe("ai");
  expect(readSettings(storage).weather).toBe("clear");
  writeSettings({ ...settings, mapLayout: "invalid" }, storage);
  expect(readSettings(storage).mapLayout).toBe("random");
  writeSettings({ ...settings, terrainTheme: "invalid" }, storage);
  expect(readSettings(storage).terrainTheme).toBe("forest");
  writeSettings({...settings,teamSpeech:['missing','german']},storage);
  expect(readSettings(storage).teamSpeech).toEqual(['english','german','english','english']);
  writeSettings({ ...settings, teamCount: 5, teamControl: ["robot", "cpu"] }, storage);
  expect(readSettings(storage).teamCount).toBe(2);
  expect(readSettings(storage).teamControl).toEqual(["human", "cpu", "human", "human"]);
  storage.setItem("pocket-siege-settings-v1", "{nope");
  expect(readSettings(storage)).toEqual(defaultSettings());
});
