import {nativeLoadSceneThemeResources} from './scene-theme-resources.js';
import {nativeLoadSceneHUDResources} from './scene-hud-resources.js';
import {nativeCreateSceneTeamFlags} from './scene-team-flags.js';
import {nativeCreateSceneTeamGraves} from './scene-team-graves.js';
import {nativeFinishSceneGraphics} from './scene-graphics.js';

//004A5B30..004A5CB7: compose the final scene resource phase. External archive,
//renderer and heap services share one owner throughout the native sequence.
export function nativeFinishSceneResources(memory,owner,temporaryPalette,waterColor,host) {
  nativeLoadSceneThemeResources(memory,owner,host);
  nativeLoadSceneHUDResources(memory,memory.get(owner+0x5cd0),memory.get(owner+0x2ac),host);
  nativeCreateSceneTeamFlags(memory,owner,host);
  nativeCreateSceneTeamGraves(memory,owner,waterColor,host);
  nativeFinishSceneGraphics(memory,owner,temporaryPalette,host);
}
