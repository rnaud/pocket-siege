//004C2C40: signed32 sum of the current team's worm health; surrendered teams
//contribute zero. Team numbers are one-based in scene-owned inventory memory.
export function nativeMatchTeamHealth(memory,scene,team) {
  const row=scene+0x1b94+Math.imul(team,0x51c);
  if(memory.get(row-12))return 0;
  let health=0;
  for(let i=0;i<(memory.get(row)|0);i++)health=(health+(memory.get(row-0x49c+i*0x9c)|0))|0;
  return health;
}
//004B3A50/004B3AF0/004B3B80: living alliance counts, with mode-specific
//human/AI and retired-team filters. Valid native alliance IDs are0..5.
export function nativeLivingAlliances(memory,root,kind) {
  const scene=memory.get(root+0x38),groups=new Set(),mode=memory.get(scene+0x11d78)|0;
  for(let team=1;team<=(memory.get(scene+0x3a48)|0);team++) {
    if(nativeMatchTeamHealth(memory,scene,team)<=0)continue;
    const row=scene+0x4888+(team-1)*3000,ai=memory.byte(row)>=128,retired=memory.byte(row+2)!==0;
    if(kind==='human'&&(ai||(retired&&mode===1)))continue;
    if(kind==='ai'&&(!ai||retired))continue;
    groups.add(memory.byte(row+3));
  }
  return groups.size;
}
//004B39A0, including forced ending and no-current-team scheme gates.
export function nativeMatchEndedMemory(memory,root) {
  const scene=memory.get(root+0x38);
  if(memory.get(scene+0x1b90))return true;
  if(memory.byte(scene+0x11d5d)&&!memory.get(root+0x180)&&!memory.get(root+0x128))return true;
  switch(memory.get(scene+0x11d78)|0) {
    case 1:return nativeLivingAlliances(memory,root,'all')<2;
    case 2:return nativeLivingAlliances(memory,root,'human')<1||nativeLivingAlliances(memory,root,'ai')<1;
    case 3:return nativeLivingAlliances(memory,root,'human')<1;
    default:return true;
  }
}
//004B9010/004B8E40/004B8570: first team in the first visible alliance list.
export function nativeFirstPanelTeam(memory,panel) {
  if(!memory.get(panel+4))return 0;
  const group=memory.get(memory.get(panel+12)),teams=memory.get(group+12);
  if(!memory.get(teams+4))return 0;
  return memory.get(memory.get(memory.get(teams+12))+4);
}
//004B7970. Unknown queries return0 without touching the output. The nine
//status words are written in native order, including the panel query boundary.
export function nativeQueryMatchMemory(memory,root,event,output,queryPanel=at=>nativeFirstPanelTeam(memory,at)) {
  if(event!==0x7d2)return 0;
  const view=new DataView(output.buffer,output.byteOffset,output.byteLength),put=(word,value)=>view.setInt32(word*4,value,true);
  put(0,memory.get(root+0x14c)?0:memory.get(root+0x128));put(1,memory.get(root+0x140));
  put(2,nativeMatchEndedMemory(memory,root)?1:0);put(3,memory.get(root+0x150)||memory.get(root+0x154)?1:0);
  put(6,memory.get(root+0x128));put(7,memory.get(root+0x12c));put(5,memory.get(root+0x180));
  put(8,queryPanel(memory.get(memory.get(root+0x38)+0x7dc)));
  put(4,!memory.get(root+0x128)?-1:memory.get(root+0x174)?0:memory.get(root+0x188));return 1;
}
