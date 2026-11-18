import {nativeLoadMissionInventory} from './mission-inventory.js';

//0043E910 block0043EE47..0043F245. The preceding team/scheme initialization
//supplies team counts, alliance bytes and owner resource tables.
export function nativeLoadMissionWorms(memory, owner, host) {
  const signedByte = address => (memory.byte(address) << 24) >> 24;
  const short = (address, value) => {
    memory.putByte(address, value);
    memory.putByte(address + 1, value >>> 8);
  };
  function worms(section, count, base, cpu) {
    for (let i = 1; i <= count; i++, base += 40) {
      const read = (key, fallback = 0) => host.profileInt(section, `Worm${i}_${key}`, fallback, memory.get(owner + 0x880)) >>> 0;
      short(base, read('Energy', 100));
      short(base + 28, read('DeseasePoints'));
      memory.putByte(base + 26, read('ArtileryMode'));
      memory.putByte(base + 30, read('PlaceWorm'));
      memory.put(base + 32, read('XPosition'));
      memory.put(base + 36, read('YPosition'));
      if (cpu) {
        const weapon = read('FixedWeapon');
        memory.put(base + 20, memory.get((owner + 0x888 + Math.imul(weapon, 4)) >>> 0));
        short(base + 24, read('ActionRadius'));
      }
      memory.putByte(base + 2, read('Vital'));
    }
  }
  const count = signedByte(0x6e1834);
  nativeLoadMissionInventory(memory, owner, 'HumanTeam', 0, host);
  if ((memory.get(owner + 0x54) | 0) !== -1) {
    short(0x6f3696, 0);
    short(0x6f3698, 0);
  }
  worms('HumanTeam', count, 0x6e743c, false);
  for (let team = 1; team < memory.byte(0x6e69c6); team++) {
    const metadata = 0x6e2518 + (team - 1) * 0xd7b;
    const base = 0x6e7ff4 + (team - 1) * 3000;
    const count = signedByte(metadata + 0x97);
    const section = `CPUTeam${team}`;
    nativeLoadMissionInventory(memory, owner, section, signedByte(metadata), host);
    memory.putByte(base - 0xa70, 1);
    worms(section, count, base, true);
  }
}
