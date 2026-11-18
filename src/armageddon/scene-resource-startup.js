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
  const services={...host,initializePalette:host.initializePalette??((first,last)=>nativeCreateGamePalette(memory,scratch.palette,first,last))};
  nativeCreateSceneContext(memory,owner,bindings,frontend,services);
  services.loadStartupFonts=host.loadStartupFonts??(()=>nativeLoadSceneFonts(memory,owner,scratch.fontPalette,host));
  nativePrepareSceneGraphics(memory,owner,frontend,bindings[1],services);
  nativeCreateSceneWorldResources(memory,owner,bindings[0],scratch,host);
  nativeFinishSceneResources(memory,owner,scratch.palette,scratch.waterColor,host);
}
