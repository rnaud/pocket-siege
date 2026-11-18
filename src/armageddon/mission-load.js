import {nativeLoadMissionScheme, nativeLoadMissionOptions} from './mission-options.js';
import {nativeLoadMissionTeams} from './mission-teams.js';
import {nativeLoadMissionEvents} from './mission-events.js';
import {nativeLoadMissionWorms} from './mission-worms.js';

//0043E910. Compose original mission validation, team creation, options, events,
//and placement. Shared match initialization/finalization remain explicit hosts.
export function nativeLoadMission(memory, owner, host) {
  const read = (section, key, fallback = 0) => host.profileInt(section, key, fallback, memory.get(owner + 0x880)) | 0;
  const fail = text => {host.messageBox(text, 0, 0); return -1;};
  if ((memory.get(owner + 0x884) | 0) === -1 && (memory.get(owner + 0x54) | 0) === -1)
    return fail('ERROR: Mission Not Set');
  if (read('Mission', 'MissionNumber', -1) === -1)
    return fail(`ERROR - The Mission found is not the save as the mission set - ${memory.get(owner + 0x884) | 0}`);
  const teams = read('Teams', 'TeamsInMission', 1);
  if (teams < 2 && (read('Mission', 'WinningCondition') === 0 || read('Mission', 'WinningCondition') === 2))
    return fail(`ERROR - Not enough  or  too many teams -  ${read('Teams', 'TeamsInMission', 1)}`);
  if (teams > 6) return fail(`ERROR - Too many teams -  ${read('Teams', 'TeamsInMission', 1)}`);
  if (nativeLoadMissionScheme(memory, owner, host) === -1)
    return fail('ERROR: Could not load Mission scheme');
  nativeLoadMissionTeams(memory, owner, teams, host);
  host.initializeSetup(0x6e68ac);
  host.initializeMode(0x6e68ac, 2);
  nativeLoadMissionOptions(memory, owner, host);
  nativeLoadMissionEvents(memory, owner, host);
  const buffer = host.readLandFile('Enviroment', 'LandFile', 'none', 48, memory.get(owner + 0x880));
  const nul = buffer.indexOf(0), land = nul < 0 ? buffer : buffer.subarray(0, nul);
  if (land.length === 4 && land[0] === 110 && land[1] === 111 && land[2] === 110 && land[3] === 101)
    return fail('ERROR: Failed due to no land file specified');
  nativeLoadMissionWorms(memory, owner, host);
  let i = 0;
  while (i < land.length && land[i]) memory.putByte(0x6f3f88 + i, land[i++]);
  memory.putByte(0x6f3f88 + i, 0);
  host.finalizeSetup(0x6e68ac);
  return 0;
}
