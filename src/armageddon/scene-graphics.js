//004A6820: clear/present all three initial surfaces using one renderer and
//one dimension query. The original repeats the same rectangle each time.
export function nativeClearStartupRenderer(memory, owner, host) {
  const renderer=memory.get(memory.get(owner+0x5cd0)+8);
  const [width,height]=host.rendererDimensions(renderer);
  for(let i=0;i<3;i++) {
    host.clearRendererRect(renderer,(-width)|0,(-height)|0,Math.trunc((width|0)/2),Math.trunc((height|0)/2),0);
    host.presentRenderer(renderer);
  }
}
//004A68E0. Re-read the scene after each palette service callback.
export function nativeInitializeSceneTeamColors(memory, owner, palette, host) {
  const colors=[[0x12438,255,128,128],[0x1243c,128,128,255],[0x12440,128,255,128],
    [0x12444,255,255,128],[0x12448,255,128,255],[0x1244c,128,255,255],
    [0x12454,0,0,0],[0x12450,157,157,157],[0x12458,255,255,255]];
  for(const [offset,...color] of colors) {
    const index=host.addPaletteColor(palette,color);
    memory.put(memory.get(owner+0x5cd0)+offset,index);
  }
}
//004A55E3..004A56BA, immediately after nativeCreateSceneContext. Archive,
//font/palette backends and sound loading remain explicit resource services.
export function nativePrepareSceneGraphics(memory,owner,frontend,initialAudio,host) {
  const archive=host.allocate(0x19c);
  if(archive) {
    memory.put(archive,0x5265d8);memory.put(archive+0x194,0);
    memory.put(archive,0x526938);memory.put(archive+0x198,0);
  }
  memory.put(owner+0x2ac,archive);
  host.openGraphicsArchive(memory.get(owner+0x2ac),'data\\Gfx\\Gfx.dir');
  nativeClearStartupRenderer(memory,owner,host);
  host.initializePaletteBanks(owner);
  memory.put(owner+0x2bc,0);
  const progress=initialAudio?memory.byte(frontend+0xde)*0x38+0x7b:0;
  memory.put(owner+0x2c4,-100);memory.put(owner+0x5ccc,0);memory.put(owner+0x2c0,progress+0x349);
  host.loadStartupFonts(owner);
  const palette=host.getRendererPalette(memory.get(memory.get(owner+0x5cd0)+8),1);
  nativeInitializeSceneTeamColors(memory,owner,palette,host);
  const audio=memory.get(memory.get(owner+0x5cd0)+12);
  if(audio) {
    host.loadEffects(owner,audio);
    host.loadSpeech(owner,memory.get(memory.get(owner+0x5cd0)+12));
  }
}
