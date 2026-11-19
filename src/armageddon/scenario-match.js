import mapNames from "./map-names.json" with { type: "json" };
import { resolveMissionDefinition } from "./mission-files.js";
import inventoryKeys from "./mission-inventory-keys.json" with { type: "json" };
import { WEAPON_SLOTS } from "./delays.js";

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
const AMMO_SLOT_BY_NAME = new Map(
  inventoryKeys.entries.filter(([kind]) => kind === "ammo")
    .map(([, slot, name]) => [name.toLowerCase(), slot]),
);
const HOST_WEAPON_BY_SLOT = new Map(
  Object.entries(WEAPON_SLOTS).map(([kind, slot]) => [slot, kind]),
);
const UTILITY_BY_SLOT = new Map([
  [34, "girder"], [36, "bridgekit"], [37, "rope"], [38, "bungee"],
  [39, "parachute"], [40, "teleport"], [60, "freeze"], [62, "jetpack"],
  [63, "lowgravity"], [64, "fastwalk"], [65, "laser"], [66, "invisibility"],
]);
function scenarioUtilityLoadouts(record) {
  const loadouts = [{}, {}];
  for (const team of record.sections) {
    const match = /^(HumanTeam|CPUTeam\d+)$/i.exec(team.name);
    if (!match) continue;
    const index = match[1].toLowerCase() === "humanteam" ? 0 : 1;
    for (const [key, value] of team.entries) {
      if (!/^Ammo_/i.test(key)) continue;
      const slot = AMMO_SLOT_BY_NAME.get(key.toLowerCase());
      const kind = slot === undefined ? null : UTILITY_BY_SLOT.get(slot);
      const amount = Number.parseInt(value, 10);
      if (kind && Number.isFinite(amount)) loadouts[index][kind] = amount;
    }
  }
  return loadouts;
}
function scenarioLoadouts(record) {
  const loadouts = [{}, {}];
  for (const team of record.sections) {
    const match = /^(HumanTeam|CPUTeam(\d+))$/i.exec(team.name);
    if (!match) continue;
    const index = match[1].toLowerCase() === "humanteam" ? 0 : 1;
    if (index < 0 || index > 1) continue;
    for (const [key, value] of team.entries) {
      if (!/^Ammo_/i.test(key)) continue;
      const slot = AMMO_SLOT_BY_NAME.get(key.toLowerCase());
      const kind = slot === undefined ? null : HOST_WEAPON_BY_SLOT.get(slot);
      const amount = Number.parseInt(value, 10);
      if (kind && Number.isFinite(amount)) loadouts[index][kind] = amount;
    }
  }
  return loadouts;
}
export function resolveScenarioMatch(path) {
  const record = resolveMissionDefinition(path);
  const match = path.match(/^mission\/(mission|training)(\d+)\.wam$/i);
  if (!record || !match) return null;
  const training = match[1].toLowerCase() === "training";
  const name = read(record, "Description", "Name", Number(match[2]));
  const terrainName = `mission/${training ? "training" : "mission"}${name}.img`;
  const terrain = mapNames[terrainName]?.id ?? null;
  const teams = read(record, "Teams", "TeamsInMission", 1);
  let worms = read(record, "HumanTeam", "NumberOfWorms", 1);
  for (let team = 1; team < teams; team++)
    worms += read(record, `CPUTeam${team}`, "NumberOfWorms", 1);
  return {
    path,
    training,
    name,
    terrain,
    turnTime: read(record, "Options", "TurnTime", 45),
    retreatTime: read(record, "Options", "LandRetreatTime", 3),
    roundTime: read(record, "Options", "RoundTime", 0),
    displayRoundTime: read(record, "Options", "DisplayRoundTime", 0) === 1,
    enableActionReplay: read(record, "Options", "EnableActionReplay", 1) === 1,
    jetpackTimeLimit: read(record, "Options", "JetPackTimeLimit", null),
    wormSelectDisabled: read(record, "Options", "WormSelect", null) === 0,
    pauseBetweenTurns: read(record, "Options", "PauseBetweenTurns", null),
    teams,
    worms,
    difficulty: read(record, "Description", "Difficulty", 0),
    winningCondition: read(record, "Mission", "WinningCondition", 0),
    logicRandomSeed: read(record, "Enviroment", "LogicRandomSeed", null),
    sound: read(record, "Enviroment", "Sound", null),
    windStrength: read(record, "Enviroment", "Wind", null),
    fixedWind: read(record, "Enviroment", "FixedWind", null),
    friction: read(record, "Enviroment", "Friction", null),
    fallDamage: read(record, "Options", "FallDamage", null),
    mineFuse: read(record, "Options", "MineFuse", null),
    weaponsDontEndTurn: read(record, "Options", "WeaponsDontEndTurn", 0) === 1,
    turnEndFinishesGame: read(record, "Options", "TurnEndFinishesGame", 0) === 1,
    lossOfControlDoesntEndTurn: read(record, "Options", "LossOfControlDoesntEndTurn", 0) === 1,
    enableSecretWeapons: read(record, "Options", "EnableSecretWeapons", 1) === 1,
    loadouts: scenarioLoadouts(record),
    utilityLoadouts: scenarioUtilityLoadouts(record),
    healthCrateEnergy: read(record, "Options", "HealthCrateEnergy", null),
    suddenDeath: {
      type: read(record, "Options", "SuddenDeathType", null),
      waterRise: read(record, "Options", "SuddenDeathWaterRise", null),
      wormDamage: read(record, "Options", "SuddenDeathWormDamage", null),
      disabled: read(record, "Options", "SuddenDeathType", null) === 0 &&
        read(record, "Options", "SuddenDeathWaterRise", null) === 0 &&
        read(record, "Options", "SuddenDeathWormDamage", null) === 0,
    },
    crateDrops: {
      weapon: read(record, "Options", "WeaponCrateDrops", 0),
      health: read(record, "Options", "HealthCrateDrops", 0),
      utility: read(record, "Options", "UtilityCrateDrops", 0),
    },
    indestructibleBorder: read(record, "Enviroment", "IndestructableBorder", 0) === 1,
    indestructibleLandscape: read(record, "Enviroment", "IndestructableLandscape", 0) === 1,
    objects: scenarioInitialObjects(record),
    timedObjects: scenarioTimedObjects(record),
    sequenceObjects: scenarioSequenceObjects(record),
  };
}

// Mission event types are stored as profile indices; the original owner table
// maps them to the internal types used by00440EB0.
const EVENT_TYPES = [0, 3, 4, 5, 8, 9, 10, 11, 15, 16, 7, 19, 14, 1, 2, 17, 6];
function numbered(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function placementObject(entries, type) {
  if (type === 3) {
    const x = numbered(entries.PlaceWeapon_XPosition);
    const y = numbered(entries.PlaceWeapon_YPosition);
    const content = numbered(entries.PlaceWeapon_Contents);
    if (x === null || y === null || content === null) return null;
    return { kind: "weapon", x, y, content,
      marked: numbered(entries.PlaceWeapon_Marked) === 1,
      vital: numbered(entries.PlaceWeapon_Vital) === 1,
      bonusPoints: numbered(entries.PlaceWeapon_Bonus_Points) ?? 0,
      bonusTurns: numbered(entries.PlaceWeapon_Bonus_TurnExtension) ?? 0 };
  }
  if (type === 4) {
    const x = numbered(entries.PlaceHealth_XPosition);
    const y = numbered(entries.PlaceHealth_YPosition);
    if (x === null || y === null) return null;
    return { kind: "health", x, y,
      health: numbered(entries.PlaceHealth_Health) ?? 15,
      marked: numbered(entries.PlaceHealth_Marked) === 1,
      vital: numbered(entries.PlaceHealth_Vital) === 1,
      onGround: numbered(entries.PlaceHealth_OnGround) === 1 };
  }
  if (type === 5) {
    const x = numbered(entries.PlaceTarget_XPosition);
    const y = numbered(entries.PlaceTarget_YPosition);
    if (x === null || y === null) return null;
    return { kind: "target", x, y,
      content: numbered(entries.PlaceTarget_TargetType),
      marked: numbered(entries.PlaceTarget_Marked) === 1,
      vital: numbered(entries.PlaceTarget_Vital) === 1 };
  }
  if (type === 1 || type === 2) {
    const prefix = type === 1 ? "PlaceMine_" : "PlaceDrum_";
    const x = numbered(entries[prefix + "XPosition"]);
    const y = numbered(entries[prefix + "YPosition"]);
    if (x === null || y === null) return null;
    return { kind: type === 1 ? "mine" : "drum", x, y,
      onGround: numbered(entries[prefix + "OnGround"]) === 1 };
  }
  return null;
}
function objectsInSections(record, pattern, sort = false) {
  const sections = record.sections.filter((section) => pattern.test(section.name));
  if (sort) sections.sort((a, b) => Number(a.name.replace(/\D/g, "")) - Number(b.name.replace(/\D/g, "")));
  const objects = [];
  for (const section of sections) {
    const raw = Object.fromEntries(
      section.entries.map(([key, value]) => [key.toLowerCase(), value]),
    );
    const entries = new Proxy(raw, {
      get: (target, key) => target[String(key).toLowerCase()],
    });
    const type = EVENT_TYPES[numbered(entries.TypeOfEvent)];
    if (type === undefined) continue;
    if (!sort && numbered(entries.Turn ?? 0) !== 0) continue;
    if (sort && type === 7) {
      const textIndex = numbered(entries.Text_String_Index);
      if (textIndex !== null) objects.push({ kind: "text", textIndex });
      continue;
    }
    const object = placementObject(entries, type);
    if (object) objects.push(object);
  }
  return objects;
}
function eventObjects(record, initial) {
  const objects = [];
  for (const section of record.sections) {
    if (!/^Event\d+$/i.test(section.name)) continue;
    const raw = Object.fromEntries(
      section.entries.map(([key, value]) => [key.toLowerCase(), value]),
    );
    const entries = new Proxy(raw, {
      get: (target, key) => target[String(key).toLowerCase()],
    });
    const type = EVENT_TYPES[numbered(entries.TypeOfEvent)];
    const turn = numbered(entries.Turn ?? 0);
    if (type === undefined) continue;
    if (initial ? turn !== 0 : turn <= 0) continue;
    if (type === 7) {
      if (initial) continue;
      const textIndex = numbered(entries.Text_String_Index);
      if (textIndex !== null) objects.push({ kind: "text", textIndex, turn });
      continue;
    }
    const object = placementObject(entries, type);
    if (object) objects.push(initial ? object : { ...object, turn });
  }
  return objects;
}
export function scenarioInitialObjects(record) {
  return eventObjects(record, true);
}
export function scenarioTimedObjects(record) {
  return eventObjects(record, false);
}
export function scenarioSequenceObjects(record) {
  return objectsInSections(record, /^Sequence\d+$/i, true);
}
