//004B2EA0. Shared by fresh match creation and replay restoration.
export function nativeInitializeMatchResources(memory,sceneMemory,host) {
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const put=(offset,value)=>view.setInt32(offset,value,true);
  const surface=host.allocateResource(44);
  if(surface)host.constructSurface(surface,56,42,8);
  put(0x21c,surface);
  for(const [offset,font,width] of [[0x210,25,64],[0x214,15,64],[0x218,15,80]]) {
    const text=host.allocateResource(0x138);
    put(offset,text?host.constructText(text,host.renderer,font,width):0);
  }
  const count=scene.getInt16(0x1b868,true);
  if(!count)put(0x284,-1);
  else {
    scene.setInt16(0x1b868,count-1,true);
    const index=scene.getInt16(0x1b868,true),id=scene.getInt16(0x1b848+index*2,true);
    const length=scene.getInt16(0x1b8aa,true);
    let slot=0;
    while(slot<length&&scene.getInt16(0x1b86a+slot*2,true)>=2)slot++;
    for(let i=length;i>slot;i--) {
      scene.setInt16(0x1b86a+i*2,scene.getInt16(0x1b86a+(i-1)*2,true),true);
      scene.setInt16(0x1b88a+i*2,scene.getInt16(0x1b88a+(i-1)*2,true),true);
    }
    scene.setInt16(0x1b86a+slot*2,1,true);scene.setInt16(0x1b88a+slot*2,id,true);
    scene.setInt16(0x1b8aa,length+1,true);put(0x284,id);
  }
  put(0x288,0);
}
