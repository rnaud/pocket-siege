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
    objects: scenarioInitialObjects(record),
  };
}

// Mission event types are stored as profile indices; the original owner table
// maps them to the internal types used by00440EB0.
const EVENT_TYPES = [0, 3, 4, 5, 8, 9, 10, 11, 15, 16, 7, 19, 14, 1, 2, 17, 6];
function numbered(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
export function scenarioInitialObjects(record) {
  const objects = [];
  for (const section of record.sections) {
    if (!/^Event\d+$/i.test(section.name)) continue;
    const entries = Object.fromEntries(section.entries);
    const type = EVENT_TYPES[numbered(entries.TypeOfEvent)];
    const turn = numbered(entries.Turn ?? 0);
    if (type === undefined || turn !== 0) continue;
    if (type === 3) {
      const x = numbered(entries.PlaceWeapon_XPosition);
      const y = numbered(entries.PlaceWeapon_YPosition);
      const content = numbered(entries.PlaceWeapon_Contents);
      if (x === null || y === null || content === null) continue;
      objects.push({ kind: "weapon", x, y, content,
        marked: numbered(entries.PlaceWeapon_Marked) === 1,
        vital: numbered(entries.PlaceWeapon_Vital) === 1,
        bonusPoints: numbered(entries.PlaceWeapon_Bonus_Points) ?? 0,
        bonusTurns: numbered(entries.PlaceWeapon_Bonus_TurnExtension) ?? 0 });
    } else if (type === 5) {
      const x = numbered(entries.PlaceTarget_XPosition);
      const y = numbered(entries.PlaceTarget_YPosition);
      if (x === null || y === null) continue;
      objects.push({ kind: "target", x, y,
        content: numbered(entries.PlaceTarget_TargetType),
        marked: numbered(entries.PlaceTarget_Marked) === 1,
        vital: numbered(entries.PlaceTarget_Vital) === 1 });
    } else if (type === 1 || type === 2) {
      const prefix = type === 1 ? "PlaceMine_" : "PlaceDrum_";
      const x = numbered(entries[prefix + "XPosition"]);
      const y = numbered(entries[prefix + "YPosition"]);
      if (x === null || y === null) continue;
      objects.push({ kind: type === 1 ? "mine" : "drum", x, y,
        onGround: numbered(entries[prefix + "OnGround"]) === 1 });
    }
  }
  return objects;
}
