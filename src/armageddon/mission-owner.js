import tables from './mission-owner-tables.json' with {type:'json'};

//0043D6C0. Constant writes recovered from the original constructor, in order.
//CString storage and CRT clock/random seeding are platform-owned services.
export function nativeCreateMissionOwner(memory, owner, host) {
  host.initializeString(owner + 0x880);
  for (const [offset, value] of tables.beforeTime) memory.put(owner + offset, value);
  host.seedRandom(host.time(0) >>> 0);
  for (const [offset, value] of tables.afterSeed) memory.put(owner + offset, value);
  return owner;
}
