// Original00419740. State is the global window006F3EC0..006F3F86.
export function nativeSetupMusic(memory, selection, drive, enabled, random) {
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  memory.set(new TextEncoder().encode(`${String.fromCharCode(drive&255)}:\\data\\streams\0`));
  if(selection===0) { memory[0xc4]=0;return; }
  let index=0;
  if(selection!==-1) {view.setInt32(0x84,selection,true);index=1;}
  for(;index<16;index++)view.setInt32(0x84+index*4,random.random()%11+1,true);
  memory[0xc4]=enabled?16:0;
  memory[0xc5]=75;
}

// Original004175EA..00417714. Profile storage and installed language are
// platform interfaces; all setup writes and CRT playlist draws retain order.
export function nativeSetupMetadata(memory,host) {
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  view.setUint32(0xd42c,host.random.nextSeed(host.seedStorage),true);
  memory.set(host.speechPath(true),0xd750);
  memory.set(host.defaultSpeech.subarray(0,64),0xd7d1);
  nativeSetupMusic(host.music,-1,host.drive,host.musicEnabled,host.random);
  memory.set(new TextEncoder().encode('data\\land.dat\0'),0xd6dc);
  memory[0xd70c]=0;memory[0xd73d]=1;memory[0xd73e]=host.displayFlags;
  memory[0xd73f]=host.readOption('DetailLevel',5);
  view.setInt16(0xd742,0,true);
  const [width,height]=host.resolution===1?[800,600]:host.resolution===2?[1024,768]:[640,480];
  view.setInt32(0xd744,width,true);view.setInt32(0xd748,height,true);
  view.setInt32(0xd74c,host.language(),true);
  memory[0xd740]=host.readOption('EnergyBar',0);
  return -1;
}
