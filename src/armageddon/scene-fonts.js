import {nativeCreateGamePalette,nativeCopyGamePalette} from './game-palette-memory.js';

const fonts=[...['red','blu','grn','yel','ppl','cyn','wht'].map((color,i)=>[i+1,`sml${color}1.fnt`]),
  ...['red','blu','grn','yel','ppl','cyn','wht'].map((color,i)=>[i+9,`std${color}1.fnt`]),
  [8,'smlwht2.fnt'],[16,'stdwht2.fnt'],
  ...['red','blu','grn','yel','ppl','cyn','wht'].map((color,i)=>[i+17,`med${color}1.fnt`]),
  [24,'lnumred1.fnt'],[25,'lnumwht1.fnt'],[26,'lnumred2.fnt'],[27,'lnumwht2.fnt'],[28,'digiwht.fnt']];

//004A6B10 +004A6AE0: retain the palette across loading the CD-ROM sprite,
//then load the phone sprite and28 fonts in their original (non-numeric) order.
export function nativeLoadSceneFonts(memory,owner,temporaryPalette,host) {
  nativeCreateGamePalette(memory,temporaryPalette,1,255);
  const source=host.getRendererPalette(memory.get(memory.get(owner+0x5cd0)+8),1);
  nativeCopyGamePalette(memory,temporaryPalette,source);
  const loadGroup=host.loadFontResourceGroup;
  loadGroup(owner,1,1,memory.get(owner+0x2ac),0x56fb80,[5,'cdrom.spr',0,0,0,0]);
  host.commitRendererPalette(memory.get(owner+0x2b4),1);
  const target=host.getRendererPalette(memory.get(memory.get(owner+0x5cd0)+8),1);
  nativeCopyGamePalette(memory,target,temporaryPalette);
  loadGroup(owner,1,1,memory.get(owner+0x2ac),0x56fb80,[6,'phone.spr',0,0,0,0]);
  for(const [id,name] of fonts)host.loadRendererFont(memory.get(owner+0x2b4),1,1,id,memory.get(owner+0x2ac),name);
  memory.put(temporaryPalette,0x524a14);
}
