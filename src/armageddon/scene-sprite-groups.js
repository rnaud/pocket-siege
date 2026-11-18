import {nativeAdvanceSceneLoading} from './scene-loading-progress.js';

//004A6FF0: descriptor order is authoritative. A sprite load failure does not
//stop the group; progress advances after every dispatched descriptor.
export function nativeLoadSceneSpriteGroup(memory,owner,bank,palette,archive,prefix,descriptors,host) {
  for(const descriptor of descriptors) {
    if(!descriptor[1]||!descriptor[0])break;
    const name=prefix+descriptor[1];
    host.loadRendererSprite(memory.get(owner+0x2b4),bank,palette,descriptor[0],archive,name,descriptor[2]);
    nativeAdvanceSceneLoading(memory,owner,1,host);
  }
}
