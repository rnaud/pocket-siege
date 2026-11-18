//004E82C0: localized selection countdown, flashing palette and viewport anchor.
export function nativeDrawControllerCountdown(memory,sceneMemory,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength),scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const remaining=body.getInt32(0x7c,true);if(!remaining)return;
  const color=(Math.trunc(scene.getInt32(0x1b8ec,true)/25)&1)?(body.getInt32(0x54,true)+0x11)|0:0x17;
  const suffix=host.countdownSuffix();
  const text=`${host.teamName(body.getInt32(0x3c,true))} : ${Math.trunc(((remaining+999)|0)/1000)} ${suffix}`;
  const palette7=host.palette(7),palette8=host.palette(8);
  const rendered=host.renderText(text,color,palette8,palette7,65536);
  const y=(64-Math.trunc(scene.getInt32(0x1b8e0,true)/2))<<16;
  host.drawImage(0,0,y,rendered.image,0,0,rendered.width,rendered.height,0);
}
