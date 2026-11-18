//004197D0: original setup feature flags, including default/out-of-range modes.
export function nativeConfigureSetupMode(memory, owner, mode) {
  mode |= 0;
  memory.putByte(owner + 0xd5f9, mode === 4 || mode === 5 ? 0 : 1);
  memory.putByte(owner + 0xd5f7, mode === 5 ? 0 : 1);
  memory.putByte(owner + 0xd5f8, mode === 1 || mode === 5 ? 0 : 1);
}

//0041B730/0041B820: count represented alliance IDs 0..5 among enabled teams.
//This is not the number of worms or individual CPU teams.
export function nativeCountSetupAlliances(memory, owner = 0x6e117c) {
  let count = 0;
  for (let alliance = 0; alliance < 6; alliance++) {
    let teams = 0;
    for (let team = 0; team < 6; team++) {
      const at = owner + 0x621 + team * 0xd7b;
      if (memory.byte(at + 0x123) && memory.byte(at) === alliance) teams++;
    }
    if (teams) count++;
  }
  return count;
}
