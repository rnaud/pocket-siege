import { nativeSin, nativeCos } from './trig.js';
//004E6190: persistent targets, teleport markers, girder previews and aim cursor.
export function nativeDrawControllerTarget(memory,sceneMemory,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength),scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const get=o=>body.getInt32(o,true),sg=o=>scene.getInt32(o,true),team=get(0x3c);
  if(!host.teamIndicator(team) && (host.teamVisible(team)&8))return;
  if(get(0xf8))host.drawTarget(0x40001,get(0xfc),get(0x100),0,(get(0x54)+0x322)|0,get(0x104));
  if(!get(0xac)){if(!get(0xbc))return;}
  else if(get(0xe8)<0 || scene.getInt16(0x1b7da,true)<1 || scene.getInt16(0x1b7ba,true)!==get(0xe8))return;
  if(get(0x64)===40 && host.teamTeleportMarker(team))
    host.drawTarget(0x40001,sg(0x1247c),sg(0x12480),0,0x23,Math.trunc(get(0x104)/4)|0);
  else if([34,36].includes(get(0x64))) {
    const image=scene.getUint32(0x310+get(0xe0)*4,true),size=host.imageSize(image);
    host.drawPlacement(0x40001,sg(0x1247c),sg(0x12480),0,image,0,0,size[0],size[1],0);
    if(!get(0xe0))return;
  }
  const angle=get(0xb0);
  host.drawTarget(0x40000,(sg(0x1247c)-Math.imul(nativeSin(angle),16))|0,(sg(0x12480)-Math.imul(nativeCos(angle),16))|0,0,(get(0x54)+0x31c)|0,angle);
}
