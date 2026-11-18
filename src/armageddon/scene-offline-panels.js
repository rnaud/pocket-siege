import {nativeCreatePanelImage,nativeCreatePanelText} from './panel-resources.js';
import {nativeDestroyPanelImage,nativeDestroyPanelText} from './object-destroy.js';

//004C5D90 specialized to owned native images (their virtual dimensions read20/24).
function createImageController(memory,address,renderer,image,foreground,background) {
  memory.put(address,0x5268a0);
  for(const [offset,value] of [[12,foreground],[16,background],[8,renderer],[4,image]])memory.put(address+offset,value);
  const width=memory.get(image+20)|0,height=memory.get(image+24)|0;
  for(const [offset,value] of [[28,0],[32,0],[20,Math.trunc(width/2)],[36,0],[44,height],[24,Math.trunc(height/2)],[0x330,0],[40,width]])memory.put(address+offset,value);
  return address;
}
//0049CE7F..0049D2CE, offline scene (no session device at scene+20).
export function nativeCreateOfflineScenePanels(memory,owner,scene,host) {
  if(memory.get(scene+0x20))throw new Error('Offline scene initialization requires no session device');
  memory.put(owner+0x50,1);memory.put(owner+0x280,0);
  const local=(memory.byte(scene+0x11d7c)<<24)>>24;
  const short=at=>memory.byte(at)|(memory.byte(at+1)<<8);
  for(let i=0;i<13;i++) {
    for(const [offset,value] of [[0x54,0],[0x88,Number(local===i)],[0xbc,short(scene+0x11ba2)*50],[0x124,short(scene+0x11ba4)*50],[0xf0,0],[0x198,1]])memory.put(owner+offset+i*4,value);
  }
  memory.put(owner+0x158,500);memory.put(owner+0x230,65536);
  for(const offset of [0x268,0x270,0x26c,0x284,0x22c])memory.put(owner+offset,0);
  for(const [offset,width,height] of [[0x18,340,256],[0x20,192,48]]) {
    const image=host.allocate(44);
    if(image){nativeCreatePanelImage(memory,image,width,height,8,host);memory.put(image,0x5249b0);}
    memory.put(owner+offset,image);
  }
  const text=host.allocate(0x138);
  memory.put(owner+0x48,text?nativeCreatePanelText(memory,text,memory.get(scene+8),23,480,host):0);
  for(const [offset,imageOffset] of [[0x1c,0x18],[0x24,0x20]]) {
    const controller=host.allocate(0x334);
    memory.put(owner+offset,controller?createImageController(memory,controller,memory.get(scene+8),memory.get(owner+imageOffset),memory.get(scene+0x12454),memory.get(scene+0x12438)):0);
  }
  for(const offset of [0x244,0x250,0x254,0x234,0x238,0x258,0x25c,0x23c,0x240,0x220,0x224,0x228,0x260,0x264])memory.put(owner+offset,0);
  memory.put(owner+0x248,-1);memory.put(owner+0x24c,-1);
}
//Matching ownership order in0049DED0; image controllers borrow their images.
export function nativeDestroyOfflineScenePanels(memory,owner,flags,host) {
  for(const offset of [0x18,0x1c,0x20,0x24]) {
    const address=memory.get(owner+offset);if(!address)continue;
    if(offset===0x18||offset===0x20)nativeDestroyPanelImage(memory,address,flags,host);
    else {memory.put(address,0x524a14);if(flags&1)host.release(address,0x334);}
  }
  const text=memory.get(owner+0x48);if(text)nativeDestroyPanelText(memory,text,flags,host);
}
