const view=memory=>new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
function ownsKeyboard(body,scene) {
  const handle=body.getInt32(0xf0,true);
  return body.getInt32(0x40,true)!==0 && handle>=0 && scene.getInt16(0x1b8aa,true)>0 && scene.getInt16(0x1b88a,true)===handle;
}
//00502850: focus the selected worm, using query coordinates (not key code43).
export function nativeCollectCameraInput(memory,sceneMemory,host) {
  const body=view(memory),scene=view(sceneMemory),get=o=>body.getInt32(o,true);
  if(!ownsKeyboard(body,scene) || !host.key(0x2b) || host.wormState(get(0x3c),get(0x4c))===100)return;
  host.consume(0x2b);
  const worm=host.lookup(2,((get(0x3c)<<4)+get(0x4c))|0);if(!worm)return;
  const info=host.wormQuery(worm,0x7d0,0x154);if(!info)return;
  const position=view(info),x=position.getInt32(0,true),y=position.getInt32(4,true);
  // Only word0 is initialized in the native292-byte command buffer.
  host.sendTask(0x14,0,0x3f8,0x124,new Uint8Array(4));
  host.cameraMode(0xe);host.cameraPosition(x,y);
  scene.setInt32(0x1247c,x,true);scene.setInt32(0x12480,(y-0x200000)|0,true);
}
//005027D0: latch the pause request, consuming its key only for a new request.
export function nativeCollectPauseInput(memory,sceneMemory,host) {
  const body=view(memory),scene=view(sceneMemory);
  if(ownsKeyboard(body,scene) && host.key(2) && !scene.getInt32(0x12418,true)) {
    host.consume(2);scene.setInt32(0x12418,1,true);
  }
}
