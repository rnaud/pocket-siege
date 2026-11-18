import {nativeCreatePanelText,nativeCreateWormPanel} from './panel-resources.js';
//004D64F0 resource initialization shared by fresh and restored worms.
export function nativeInitializeWormResources(memory,options) {
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const put=(offset,value)=>view.setInt32(offset,value,true);
  for (let i = 0; i < 6; i++) {
    const pointer = options.allocateResource(0x138);
    put(0x338 + i * 4, pointer ? options.constructText(pointer, options.renderer, 15, i < 3 ? 256 : 48) : 0);
  }
  const panel = options.allocateResource(0x34);
  put(0x358, panel ? options.constructPanel(panel, 2, 2, 30, 30) : 0);
  for (const offset of [0x35c, 0x360, 0x364, 0x370, 0x374, 0x380, 0x384, 0x38c, 0x388]) put(offset, 0);
  put(0x36c, 65536);
  put(0x368, 65536);
  put(0x37c, options.matchState.presentationValue);
  if (view.getInt32(0x13c, true)) options.matchState.activeCount = (options.matchState.activeCount + 1) | 0;
}

//Share resource ownership between addressed fresh and restored worms.
export function nativeInitializeWormResourcesAt(memory,address,scene,host) {
  nativeInitializeWormResources(memory.range(address,0x390),{
    allocateResource:size=>host.allocate(size),renderer:memory.get(scene+8),
    constructText:host.constructText??((at,...args)=>nativeCreatePanelText(memory,at,...args,host)),
    constructPanel:host.constructPanel??((at,...args)=>nativeCreateWormPanel(memory,at,...args,host)),
    matchState:{get presentationValue(){return memory.get(scene+0x1b76c);},get activeCount(){return memory.get(scene+0x12460);},set activeCount(value){memory.put(scene+0x12460,value);}},
  });
}
