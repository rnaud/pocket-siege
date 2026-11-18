import {nativeLoadSetupFlag} from './team-flags.js';
import {nativeCountrySpeech} from './speech-setup.js';

//0043E910 block0043EB22..0043ED7A. Selection/scheme validation precedes this
//block. Profile/CString services and team flag resource loading remain hosts.
export function nativeLoadMissionTeams(memory, owner, teamCount, host) {
  const read = (section, key, fallback = 0) => host.profileInt(section, key, fallback, memory.get(owner + 0x880)) >>> 0;
  const copyString = (address, bytes) => {
    let i = 0;
    while (i < bytes.length && bytes[i]) memory.putByte(address + i, bytes[i++]);
    memory.putByte(address + i, 0);
  };
  memory.putByte(0x6e1834, read('HumanTeam', 'NumberOfWorms', 1));
  for (let team = 1; team < (teamCount | 0); team++) {
    const base = 0x6e2518 + (team - 1) * 0xd7b;
    const section = `CPUTeam${team}`, fallback = new Uint8Array(65);
    nativeCountrySpeech(fallback, 0, memory.get(0x6f47f4));
    memory.putByte(base - 1, -read(section, 'TeamSkill', 50));
    memory.putByte(base, read(section, 'AlliedGroup', 1));
    memory.putByte(base + 1, 0);
    host.profileString(section, 'SoundBank', fallback, base + 0x13, 65, memory.get(owner + 0x880));
    copyString(base + 0x54, new TextEncoder().encode('scifisynth.wav'));
    memory.putByte(base + 0x95, 1);
    memory.putByte(base + 0x96, 1);
    memory.putByte(base + 0x97, read(section, 'NumberOfWorms', 1));
    memory.putByte(base + 0x98, 0);
    memory.putByte(base + 0x122, 255);
    memory.putByte(base + 0x123, 1);
    memory.putByte(base + 0x99, read(section, 'MissionVital'));
    if(host.loadTeamFlag)host.loadTeamFlag(0x6e117c, team);
    else nativeLoadSetupFlag(memory,0x6e117c,team,host);
    const name = read(section, 'TeamNameNumber');
    copyString(base + 2, host.loadString(memory.get((owner + 0x508 + Math.imul(name, 4)) >>> 0)));
    for (let worm = 1; worm <= (memory.byte(base + 0x97) << 24 >> 24); worm++) {
      const name = read(section, `Worm${worm}_NameNumber`);
      copyString(base + 0x9a + (worm - 1) * 17, host.loadString(memory.get((owner + 0x378 + Math.imul(name, 4)) >>> 0)));
    }
    memory.putByte(0x6e6880, memory.byte(0x6e6880) + 1);
  }
}
