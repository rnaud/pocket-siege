import mapNames from "./map-names.json" with { type: "json" };
import { resolveMissionDefinition } from "./mission-files.js";

const section = (record, name) =>
  record.sections.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
function read(record, sectionName, key, fallback) {
  const value = section(record, sectionName)?.entries.find(
    ([entryKey]) => entryKey.toLowerCase() === key.toLowerCase(),
  )?.[1];
  if (value === undefined) return fallback;
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

// Maps a selected WAM to the original landscape long name and the turn rules
// stored in its Options section. Objective/event execution remains separate.
export function resolveScenarioMatch(path) {
  const record = resolveMissionDefinition(path);
  const match = path.match(/^mission\/(mission|training)(\d+)\.wam$/i);
  if (!record || !match) return null;
  const training = match[1].toLowerCase() === "training";
  const name = read(record, "Description", "Name", Number(match[2]));
  const terrainName = `mission/${training ? "training" : "mission"}${name}.img`;
  const terrain = mapNames[terrainName]?.id ?? null;
  return {
    path,
    training,
    name,
    terrain,
    turnTime: read(record, "Options", "TurnTime", 45),
    retreatTime: read(record, "Options", "LandRetreatTime", 3),
    roundTime: read(record, "Options", "RoundTime", 0),
  };
}
