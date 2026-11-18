import {nativeSelectSetupScheme} from './scheme-selection.js';
//00440670 and00440860. Write the original frontend globals, retaining byte/
//short truncation and callback order. INI access and scheme/music/team services
//are explicit interfaces; loading these options alone does not run a mission.
const schemeFields = [
  ["FallDamage", 0, 0x4565],
  ["DisplayRoundTime", 0, 0x4563],
  ["EnableActionReplay", 0, 0x4564],
  ["LandRetreatTime", 3, 0x4561],
  ["RopeRetreatTime", 5, 0x4562],
  ["RoundTime", 30, 0x4577],
  ["TurnTime", 45, 0x4576],
  ["MineFuse", 3, 0x4572],
  ["ObjectType", 0, 0x4571],
  ["WeaponCrateDrops", 0, 0x456c],
  ["HealthCrateDrops", 0, 0x456e],
  ["UtilityCrateDrops", 0, 0x4570],
  ["HealthCrateEnergy", 15, 0x456f],
  ["EnableSecretWeapons", 1, 0x4583],
  ["SuddenDeathType", 0, 0x456a],
  ["PauseBetweenTurns", 10, 0x4560],
  ["WormSelect", 0, 0x4569],
];
export function nativeLoadMissionScheme(memory, owner, host) {
  const result = host.selectScheme ? host.selectScheme(0x6f454c, 4, 0) : nativeSelectSetupScheme(memory, 0x6f454c, 4, 0, host);
  if (result === -1) return -1;
  for (const [key, fallback, offset] of schemeFields)
    memory.putByte(
      0x6f0000 + offset,
      host.profileInt("Options", key, fallback, memory.get(owner + 0x880)),
    );
  memory.putByte(0x6f45e5, 4);
  return 0;
}
export function nativeLoadMissionOptions(memory, owner, host) {
  const read = (section, key, fallback = 0) =>
    host.profileInt(section, key, fallback, memory.get(owner + 0x880));
  const byte = (section, key, offset, fallback = 0) =>
    memory.putByte(0x6f0000 + offset, read(section, key, fallback));
  const short = (section, key, offset, fallback = 0) => {
    const value = read(section, key, fallback);
    memory.putByte(0x6f0000 + offset, value);
    memory.putByte(0x6f0001 + offset, value >>> 8);
  };
  byte("Options", "FallDamage", 0x3e80);
  byte("Options", "SuddenDeathWaterRise", 0x3e98);
  short("Options", "SuddenDeathWormDamage", 0x3e9a);
  short("Options", "GirderRadius", 0x3eac, 400);
  byte("Enviroment", "Wind", 0x3cdc, (memory.byte(0x6f3cdc) << 24) >> 24);
  short("Enviroment", "FixedWind", 0x3cde);
  byte("Enviroment", "Friction", 0x3ce0, memory.byte(0x6f3ce0));
  byte("Enviroment", "IndestructableBorder", 0x3ea7);
  byte("Enviroment", "IndestructableLandscape", 0x3ea8);
  memory.put(
    0x6f3cd8,
    read("Enviroment", "LogicRandomSeed", memory.get(0x6f3cd8) | 0),
  );
  byte("Enviroment", "AlliedGroupToGoFirst", 0x3cd6);
  host.setupMusic(read("Enviroment", "Sound", -1));
  //00442000 is called again unless the first result is exactly1.
  const first = read("Mission", "WinningCondition");
  const winning = first === 1 || read("Mission", "WinningCondition") === 3;
  memory.put(0x6f3eb8, winning ? 3 : 2);
  byte("Options", "WeaponsDontEndTurn", 0x3ea2);
  byte("Options", "LossOfControlDoesntEndTurn", 0x3ea0);
  byte("Options", "TurnEndFinishesGame", 0x3ea1);
  byte("Options", "JetPackTimeLimit", 0x3e4a, 20);
  byte("Options", "Sheep", 0x3eb1);
  byte("Options", "Score", 0x3e81);
  memory.putByte(0x6f3e97, 1);
  byte("Options", "PauseTimerWhileFiring", 0x3e9f, 1);
  for (let i = 0; i < host.teamCount(); i++)
    memory.putByte(0x6f3622 + i * 0x11e, 0);
}
