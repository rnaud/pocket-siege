//00419840/004198D0. Frontend bank and within-bank starting-team ordinals.
//004190C0 is a persistent frontend seed service, supplied by the host.
const countTeams=(memory,bank)=>{
  let count=0;
  for(let team=0;team<memory[0x11a];team++)if((memory[0x11f+team*3000]<<24>>24)===bank)count++;
  return count;
};
export function nativeInitializeSetupTurnOrder(memory,nextSeed) {
  const banks=memory[0xcd74],seed=nextSeed()>>>0;
  if(!banks)throw new RangeError('Native starting-bank selection divides by zero');
  memory[0xd42a]=seed%banks;
  for(let bank=0;bank<banks;bank++) {
    const count=countTeams(memory,bank);
    if(count)memory[0xcd76+bank*0x11e]=(nextSeed()>>>0)%count;
  }
  return banks;
}
export function nativeAdvanceSetupTurnOrder(memory) {
  const banks=memory[0xcd74],next=(memory[0xd42a]<<24>>24)+1;
  memory[0xd42a]=next>=banks?0:next;
  for(let bank=0;bank<banks;bank++) {
    const offset=0xcd76+bank*0x11e,next=(memory[offset]<<24>>24)+1;
    memory[offset]=next>=countTeams(memory,bank)?0:next;
  }
}
