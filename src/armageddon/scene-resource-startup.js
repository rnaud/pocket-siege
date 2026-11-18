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
  const services={...host,archiveScratch:scratch.archiveScratch,initializePalette:host.initializePalette??((first,last)=>nativeCreateGamePalette(memory,scratch.palette,first,last))};
  const loadImage=(palette,archive,name)=>{
    for(let i=0;i<name.length;i++)memory.putByte(scratch.imageName+i,name.charCodeAt(i));
    memory.putByte(scratch.imageName+name.length,0);
    return nativeLoadNamedArchiveImage(memory,palette,archive,scratch.imageName,scratch.imageScratch,nativeFileArchiveServices(memory,services));
  };
  services.loadNamedArchiveImage=host.loadNamedArchiveImage??loadImage;
  services.loadNamedImage=host.loadNamedImage??services.loadNamedArchiveImage;
  nativeCreateSceneContext(memory,owner,bindings,frontend,services);
  services.loadStartupFonts=host.loadStartupFonts??(()=>nativeLoadSceneFonts(memory,owner,scratch.fontPalette,host));
  nativePrepareSceneGraphics(memory,owner,frontend,bindings[1],services);
  nativeCreateSceneWorldResources(memory,owner,bindings[0],scratch,services);
  nativeFinishSceneResources(memory,owner,scratch.palette,scratch.waterColor,services);
}
