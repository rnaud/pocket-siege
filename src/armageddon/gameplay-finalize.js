import {nativeApplyWorldStartupSetting,nativeDispatchStartupSetting} from './world-startup-setting.js';
import {nativeCreateMatchRootAt} from './match-create.js';
import {nativeCreateTeamPanelTree} from './team-panel-setup.js';

//0049DB9A..0049DD00, the final startup block before the function epilogue.
//World construction and external scene reset remain explicit interfaces.
export function nativeFinalizeGameplaySetup(memory,owner,scene,host) {
  for(let offset=0x450;offset<=0x4ac;offset+=4)memory.put(scene+offset,0);
  for(let offset=0x4b0;offset<=0x7cc;offset+=4)memory.put(scene+offset,0);
  for(let offset=0x1d428;offset<=0x1d448;offset+=4)memory.put(scene+offset,0);
  const panels=host.allocate(76);
  memory.put(scene+0x7dc,panels?nativeCreateTeamPanelTree(memory,panels,scene,host):0);
  const reset=memory.get(scene+12);
  if(reset)host.resetScene(reset);
  const allocation=host.allocate(0x28c);
  const root=allocation?(host.createMatchRoot?host.createMatchRoot(allocation,scene,scene+0x47a8):nativeCreateMatchRootAt(memory,allocation,scene,scene+0x47a8,host)):0;
  memory.put(owner+4,root);memory.put(owner+0x4c,-1);memory.put(owner+0x294,1);
  for(let setting=1;setting<5;setting++)if(memory.byte(scene+0x11d70+setting)) {
    if(host.send)host.send(root,0x3f6,4,setting);
    else nativeApplyWorldStartupSetting(memory,root,setting,host.dispatchStartupSetting??((...args)=>nativeDispatchStartupSetting(memory,...args,host.observeStartupSetting)));
  }
}
