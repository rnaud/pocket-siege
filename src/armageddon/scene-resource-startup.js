import {nativeLoadRendererSprite} from './renderer-sprite.js';
import {nativeLoadRendererFont} from './renderer-font.js';
import spriteGroups from './scene-sprite-groups.json' with {type:'json'};
import {nativeLoadSceneSpriteGroup} from './scene-sprite-groups.js';
import {nativeLoadNamedArchiveImage} from './terrain-image.js';
import {nativeFileArchiveServices} from './archive-file.js';
import {nativeLoadSceneFonts} from './scene-fonts.js';
import {nativeCreateGamePalette} from './game-palette-memory.js';
import {nativeCreateSceneContext} from './scene-context.js';
import {nativePrepareSceneGraphics} from './scene-graphics.js';
import {nativeCreateSceneWorldResources} from './scene-world-resources.js';
import {nativeFinishSceneResources} from './scene-resource-finish.js';

//004A5350: original offline scene startup from frontend payload through final
//palette cleanup. Scratch belongs to the caller; external services share one
//memory/heap/renderer throughout all stages.
export function nativeStartScene(memory,owner,bindings,frontend,scratch,host) {
  const services={...host,streamSpriteScratch:scratch.streamSpriteScratch,archiveScratch:scratch.archiveScratch,initializePalette:host.initializePalette??((first,last)=>nativeCreateGamePalette(memory,scratch.palette,first,last))};
  const loadImage=(palette,archive,name)=>{
    for(let i=0;i<name.length;i++)memory.putByte(scratch.imageName+i,name.charCodeAt(i));
    memory.putByte(scratch.imageName+name.length,0);
    return nativeLoadNamedArchiveImage(memory,palette,archive,scratch.imageName,scratch.imageScratch,nativeFileArchiveServices(memory,services));
  };
  services.loadRendererSprite=host.loadRendererSprite??((renderer,bank,priority,id,archive,name,flags)=>{
    for(let i=0;i<name.length;i++)memory.putByte(scratch.imageName+i,name.charCodeAt(i));
    memory.putByte(scratch.imageName+name.length,0);
    return nativeLoadRendererSprite(memory,renderer,bank,priority,id,archive,scratch.imageName,flags,nativeFileArchiveServices(memory,services));
  });
  services.loadRendererFont=host.loadRendererFont??((renderer,bank,priority,id,archive,name)=>{
    for(let i=0;i<name.length;i++)memory.putByte(scratch.imageName+i,name.charCodeAt(i));
    memory.putByte(scratch.imageName+name.length,0);
    return nativeLoadRendererFont(memory,renderer,bank,priority,id,archive,scratch.imageName,scratch.fontMapping,nativeFileArchiveServices(memory,services));
  });
  services.loadNamedArchiveImage=host.loadNamedArchiveImage??loadImage;
  services.loadNamedImage=host.loadNamedImage??services.loadNamedArchiveImage;
  const prefixString=address=>{
    if(address===0x56fb80)return '';
    let value='';for(let i=0;memory.byte(address+i);i++)value+=String.fromCharCode(memory.byte(address+i));return value;
  };
  services.loadResourceGroup=host.loadResourceGroup??((receiver,bank,palette,archive,prefix,table)=>nativeLoadSceneSpriteGroup(memory,receiver,bank,palette,archive,prefixString(prefix),spriteGroups[table],services));
  services.loadFontResourceGroup=host.loadFontResourceGroup??((receiver,bank,palette,archive,prefix,descriptor)=>nativeLoadSceneSpriteGroup(memory,receiver,bank,palette,archive,prefixString(prefix),[descriptor.slice(0,3)],services));
  nativeCreateSceneContext(memory,owner,bindings,frontend,services);
  services.loadStartupFonts=host.loadStartupFonts??(()=>nativeLoadSceneFonts(memory,owner,scratch.fontPalette,services));
  nativePrepareSceneGraphics(memory,owner,frontend,bindings[1],services);
  nativeCreateSceneWorldResources(memory,owner,bindings[0],scratch,services);
  nativeFinishSceneResources(memory,owner,scratch.palette,scratch.waterColor,services);
}
