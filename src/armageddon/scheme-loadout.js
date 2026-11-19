import resources from './scheme-data.json' with {type:'json'};
import {nativePrepareInventoryScheme,nativeBuildInventorySetup} from './inventory-setup.js';
import {nativeInitializeInventory} from './inventory-initialization.js';

// Starting inventory from an original scheme resource: 00415540 preparation,
// 00417750 frontend setup and 004C2640 import, for teams on separate banks.
// No saved teams or handicap descriptors (round 1, empty frontend records).
// Returns per-team 71-slot counts (-1 = unlimited) and turn delays.
export function nativeSchemeLoadouts(resourceId, teamCount = 2) {
  const scheme = resources.schemes.find(row => row.resource_id === resourceId);
  if (!scheme) throw new RangeError(`Unknown native scheme resource ${resourceId}`);
  const memory = new Uint8Array(0x10000);
  const state = new Uint8Array(0x1c4);
  state.set(scheme.bytes, 0x14);
  nativePrepareInventoryScheme(memory, state);
  memory[0x11a] = teamCount;
  memory[0xcd74] = teamCount;
  for (let team = 0; team < teamCount; team++) {
    memory[0x11e + team * 3000] = 0;
    memory[0x11f + team * 3000] = team;
  }
  const descriptors = new Uint8Array(0x1d8);
  descriptors.fill(255, 0xd0);
  nativeBuildInventorySetup(memory, state.subarray(0x14, 0xec), 0, [],
    { descriptors, teamData: new Uint8Array(0x9000) });
  const inventory = new Uint8Array(0x2c14);
  nativeInitializeInventory(inventory, memory.subarray(0x3c));
  const view = new DataView(inventory.buffer);
  return Array.from({ length: teamCount }, (_, bank) => ({
    counts: Array.from({ length: 71 }, (_, slot) => view.getInt32(0x1eb8 + bank * 0x238 + slot * 4, true)),
    delays: Array.from({ length: 71 }, (_, slot) => view.getInt32(0x1eb8 + bank * 0x238 + 0x11c + slot * 4, true)),
  }));
}
