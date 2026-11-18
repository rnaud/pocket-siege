import icons from './hud-resource-table.json' with {type:'json'};
import {nativeCreatePanelImage} from './panel-resources.js';

//004CB380: original scene HUD slots and ordered resource requests.
export function nativeLoadSceneHUDResources(memory,scene,archive,host) {
  const palette=host.getRendererPalette(memory.get(scene+8),1);
  for(let i=0;i<71;i++) {
    memory.put(scene+0xb8+i*8,0);memory.put(scene+0xbc+i*8,0);
  }
  const load=name=>host.loadNamedArchiveImage(palette,archive,name);
  for(const [id,name] of icons) {
    memory.put(scene+0xb8+id*8,load(`lo\\${name}`));
    memory.put(scene+0xbc+id*8,load(`hi\\${name}`));
  }
  for(const [slot,name] of [[0x7e4,'fire-red.img'],[0x7e8,'fire-blu.img'],[0xb0,'windl.img'],[0xb4,'windr.img'],[0x310,'stopsign.img']])memory.put(scene+slot,load(name));
  for(let i=0;i<9;i++) {
    memory.put(scene+0x314+i*4,load(`grds${i}.img`));
    memory.put(scene+0x338+i*4,load(`grdl${i}.img`));
  }
  for(let i=0;i<6;i++)memory.put(scene+0x2f8+i*4,load('stdnumw.img'));
  const bitmap=host.allocate(44);
  if(bitmap){nativeCreatePanelImage(memory,bitmap,181,17,8,host);memory.put(bitmap,0x5249b0);}
  memory.put(scene+0x2f0,bitmap);
}
