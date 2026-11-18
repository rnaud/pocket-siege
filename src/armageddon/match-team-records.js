//00475C70. Each bank occupies194C bytes; clearing both also clears the trailing
//shared records. Invalid positive bank IDs leave memory intact and report -1.
export function nativeClearMatchTeamRecords(memory,owner,bank,host) {
  bank|=0;
  if(bank>1){host.messageBox(`ERROR: Can't clear Stats -  ${bank}`,0,0);return -1;}
  const start=(owner+0x18fc+(bank===-1?0:Math.imul(bank,0x194c)))>>>0;
  const size=bank===-1?0x3538:0x194c;
  for(let offset=0;offset<size;offset+=4)memory.put((start+offset)>>>0,0);
  return 0;
}

//00475FA0. Startup copies selected frontend names/counts to both match banks.
//Inactive slots remain cleared. The final count includes every visited slot;
//the original reads its global team count as a signed byte without clamping.
export function nativeInitializeMatchTeamRecords(memory,owner=0x6db650) {
  nativeClearMatchTeamRecords(memory,owner,-1);
  let team=0;
  for(;team<(memory.byte(0x6e6880)<<24>>24);team++) {
    const source=0x6e179f+team*0xd7b,record=0x6dd2f5+team*0x39c;
    if(!memory.byte(source+0x121))continue;
    for(const delta of [0,0x194c]) {
      for(let offset=0;offset<16;offset+=4)
        memory.put(record+delta-0x11+offset,memory.get(source+offset));
      memory.putByte(record+delta-1,memory.byte(source+16));
      memory.putByte(record+delta,1);
      memory.put(record+delta-0x19,memory.byte(source+0x95)<<24>>24);
    }
  }
  memory.put(owner+0x2eb4,team);memory.put(owner+0x4800,team);
}
