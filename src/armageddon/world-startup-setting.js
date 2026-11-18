import {nativeForwardTaskEventMemory} from './task-memory.js';

//004B4CE0 ->004ECFB0 event3F6. The host dispatch interface receives the
//four-byte setting value; child-specific event handling remains its contract.
export function nativeApplyWorldStartupSetting(memory,root,setting,dispatch) {
  const offset={1:0x1ab8,3:0x1ac0,4:0x1abc}[setting];
  if(offset!==undefined)memory.put(memory.get(root+0x38)+offset,1);
  nativeForwardTaskEventMemory(memory,root,root,0x3f6,4,setting,dispatch);
}
