import {originalResourceString} from './string-resources.js';
// Original00441E50/00441F10 return CString paths; the host transports strings.
const defaultThumbnail = 'graphics\\missionmenu\\thumb0.bmp';
const profile = (memory, owner, host, section, key) =>
  host.profileInt(section, key, 0, memory.get(owner + 0x880)) | 0;
export function nativeMissionThumbnail(memory, owner, host) {
  if ((memory.get(owner + 0x884) | 0) === -1) return defaultThumbnail;
  return `graphics\\missionmenu\\thumb${profile(memory, owner, host, 'Description', 'Name')}.bmp`;
}
export function nativeMissionTerrainPath(memory, owner, host) {
  if ((memory.get(owner + 0x884) | 0) === -1 && (memory.get(owner + 0x54) | 0) === -1)
    return defaultThumbnail;
  const name = profile(memory, owner, host, 'Description', 'Name');
  // The executable re-reads selection and drive after the profile call.
  const kind = (memory.get(owner + 0x884) | 0) === -1 ? 'training' : 'mission';
  return `${String.fromCharCode(memory.byte(0x6e1178))}:\\data\\mission\\${kind}${name}.img`;
}
//00442000 /00442020.
export const nativeMissionWinningCondition = (memory, owner, host) =>
  profile(memory, owner, host, 'Mission', 'WinningCondition');
export const nativeMissionSelection = (memory, owner) => memory.get(owner + 0x884) | 0;

//0043E620. The mission/training branch is chosen before reading the profile.
export function nativeMissionTitle(memory, owner, host) {
  const load = host.loadText ?? originalResourceString;
  const mission = nativeMissionSelection(memory, owner) !== -1;
  if (!mission && (memory.get(owner + 0x54) | 0) === -1) return load(0x137) + ' ';
  const name = profile(memory, owner, host, 'Description', 'Name');
  return load(memory.get((owner + (mission ? 0x58 : 0xdc) + Math.imul(name, 4)) >>> 0)) + ' ';
}

//0043E7F0. With no selection, the original loads the placeholder into a
//temporary CString but returns its separate, empty output string.
export function nativeMissionBriefing(memory, owner, host) {
  const load = host.loadText ?? originalResourceString;
  const mission = nativeMissionSelection(memory, owner) !== -1;
  if (!mission && (memory.get(owner + 0x54) | 0) === -1) {load(0x13f);return '';}
  const name = profile(memory, owner, host, 'Description', 'Name');
  return load(memory.get((owner + (mission ? 0x120 : 0x1a4) + Math.imul(name, 4)) >>> 0));
}
