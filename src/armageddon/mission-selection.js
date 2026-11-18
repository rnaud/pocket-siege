//0043E710 /00440590. CFile and CString allocation remain host services.
//Selection writes occur only after successful open and close. A failed open
//still leaves the newly formatted filename in the original owner.
function selectFile(memory, owner, selection, score, training, host) {
  const file = host.createFile();
  const kind = training ? 'Training' : 'mission';
  host.assignString(owner + 0x880,
    `${String.fromCharCode(memory.byte(0x6e1178))}:\\data\\mission\\${kind}${selection | 0}.wam`);
  if (!host.openFile(file, memory.get(owner + 0x880), 0x8000, 0)) {
    host.messageBox(`WARNING: ${training ? 'Training' : 'Mission'} File not found`, 0, 0);
    host.destroyFile(file);
    return -1;
  }
  host.closeFile(file);
  if (training) {
    memory.put(owner + 0x54, selection);
    memory.put(owner + 0x884, -1);
    memory.put(owner + 0x87c, 999999);
  } else {
    memory.put(owner + 0x884, selection);
    memory.put(owner + 0x54, -1);
    memory.put(owner + 0x87c, score);
  }
  host.destroyFile(file);
  return 0;
}
export function nativeSelectMission(memory, owner, selection, score, host) {
  if ((selection | 0) === -1) {
    memory.put(owner + 0x884, -1);
    return 0;
  }
  return selectFile(memory, owner, selection, score, false, host);
}
export function nativeSelectTraining(memory, owner, selection, host) {
  return selectFile(memory, owner, selection, 999999, true, host);
}
