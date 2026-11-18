import {nativeDestroyPanelImage,nativeDestroyPanelText} from './object-destroy.js';

//004B8F70/004B8D30/004B8B90/004B8490. The original inline ownership
//array is distinct from the mutable display list stored at offset12.
export function nativeDestroyTeamPanelTree(memory,address,flags,host) {
  const vtable=memory.get(address);let size;
  if(vtable===0x526828||vtable===0x526780) {
    size=vtable===0x526828?76:72;
    for(let index=0;index<(memory.get(address+44)|0);index++) {
      const child=memory.get(address+48+index*4);
      if(child)nativeDestroyTeamPanelTree(memory,child,1,host);
    }
    memory.put(address,0x527498);host.free(memory.get(address+12));
  } else if(vtable===0x5267e8) {
    size=16;const panel=memory.get(address+12);
    if(panel)nativeDestroyTeamPanelTree(memory,panel,1,host);
  } else if(vtable===0x526740) {
    size=36;const text=memory.get(address+16),image=memory.get(address+20);
    if(text)nativeDestroyPanelText(memory,text,1,host);
    if(image)nativeDestroyPanelImage(memory,image,1,host);
  } else throw new RangeError(`Unsupported team panel destructor ${vtable.toString(16)}`);
  memory.put(address,0x524a14);if(flags&1)host.release(address,size);return address;
}
