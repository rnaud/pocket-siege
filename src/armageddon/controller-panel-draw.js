import { fixedMultiply } from './numeric.js';
//004E5BF0: team panel and arsenal slide placement, including pointer ownership.
export function nativeDrawControllerPanels(memory,sceneMemory,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength),scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const get=o=>body.getInt32(o,true),sg=o=>scene.getInt32(o,true),half=v=>Math.trunc(v/2);
  const position=(width,height,progress)=>[
    (((half(sg(0x1b8dc))-half(width)-10)<<16)+fixedMultiply((width+30)<<16,(65536-progress)|0))|0,
    (half(sg(0x1b8e0))-half(height)-23)<<16,
  ];
  if(get(0xcc)) {
    const panel=host.teamPanel(host.teamVisible(get(0x3c)));
    if(panel.image) {
      const [x,y]=position(panel.width,panel.height,get(0xcc));
      host.drawImage(3,x,y,panel.image,0,0,panel.width,panel.height,0x800000);
    }
  }
  if(!get(0xd4))return;
  const width=get(0xc0),height=get(0xc4),[x,y]=position(width,height,get(0xd4));
  host.drawImage(2,x,y,scene.getUint32(0xac,true),0,0,width,height,0x800000);
  const pointer=get(0xf4);
  if(pointer>=0 && scene.getInt16(0x1b7da,true)>0 && scene.getInt16(0x1b7ba,true)===pointer && get(0xe4)) {
    host.drawCursor(1,(((10-half(width))<<16)+sg(0x12474)+x)|0,(((10-half(height))<<16)+sg(0x12478)+y)|0,(get(0x54)+0x31c)|0,0xa000);
  }
}
