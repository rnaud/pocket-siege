import {nativeFindSetupTeam} from './inventory-setup.js';

//0044C030. Invalid country IDs preserve the destination; valid unknown IDs
//use English. The original copies65 bytes with NUL padding.
export function nativeCountrySpeech(memory,offset,country) {
  country|=0;
  if(country>=50||country===0)return -1;
  const groups=[['Hispanic',[2]],['Australian',[3]],['German',[4,16,29,30,47]],
    ['French',[5,14]],['Portuguese',[6,39]],['Russian',[8,15,42]],['Danish-Pyrus',[12]],
    ['Finnish',[13]],['Greek',[17]],['Hungarian',[19]],['American',[23,24,49]],
    ['Irish',[25]],['Italian',[27]],['Spanish',[33,40,45]],['Dutch',[35]],
    ['Norwegian',[37]],['Polish',[38]],['Africaan',[44]],['Swedish',[46]]];
  const name=groups.find(([,ids])=>ids.includes(country))?.[0]??'English';
  memory.fill(0,offset,offset+65);memory.set(new TextEncoder().encode(name),offset);
  return 0;
}
const cstring=(memory,offset)=>{
  let end=offset;while(memory[end])end++;
  return memory.subarray(offset,end);
};
//004194CB..00419602. Resource probing replaces process-wide chdir in the
//browser; preserve the original probe/fallback order and final restore.
export function nativeResolveSetupSpeech(memory,teamData,host) {
  const view=new DataView(teamData.buffer,teamData.byteOffset,teamData.byteLength);
  for(let team=0;team<memory[0x11a];team++) {
    const speech=0xd812+team*0xc2,base=cstring(memory,speech),name=cstring(memory,speech+0x81);
    const path=new Uint8Array(base.length+name.length+2);
    path.set(base);path[base.length]=92;path.set(name,base.length+1);
    if(host.changeDirectory(path)!==0) {
      if(!teamData[0x887e])memory.set(host.defaultSpeech.subarray(0,65),speech+0x81);
      else {
        const index=nativeFindSetupTeam(teamData,memory.subarray(0x122+team*3000),true);
        const controller=view.getInt8(0x379c+index*0xd7b);
        nativeCountrySpeech(memory,speech+0x81,view.getInt32(0x31f4+controller*0x78,true));
      }
      memory.set(host.speechPath(true),speech);
    }
  }
  host.changeDirectory(host.workingDirectory);
}
