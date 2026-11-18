import {nativeForwardTaskEventMemory} from './task-memory.js';

//004B4CE0 ->004ECFB0 event3F6. The host dispatch interface receives the
//four-byte setting value; child-specific event handling remains its contract.
export function nativeApplyWorldStartupSetting(memory,root,setting,dispatch) {
  const offset={1:0x1ab8,3:0x1ac0,4:0x1abc}[setting];
  if(offset!==undefined)memory.put(memory.get(root+0x38)+offset,1);
  nativeForwardTaskEventMemory(memory,root,root,0x3f6,4,setting,dispatch);
}

//Event3F6 routes for the classes constructed by004EAAD0. Other events still
//need their own handlers; this is deliberately not a general task dispatcher.
export function nativeDispatchStartupSetting(memory,address,sender,event,size,setting,observe) {
  if(event!==0x3f6)throw new RangeError('Not a startup setting event');
  observe?.(address,sender,event,size,setting);
  const vtable=memory.get(address);
  if([0x527070,0x5277e0,0x526c78].includes(vtable))return;
  if(vtable===0x527428) {
    if(!memory.byte(address-0x3ac+event))return;
  } else if(![0x526ad0,0x5271b8,0x526de0,0x526988,0x527300].includes(vtable)) {
    throw new RangeError(`Unported startup setting receiver ${vtable.toString(16)}`);
  }
  nativeForwardTaskEventMemory(memory,address,sender,event,size,setting,
    (...args)=>nativeDispatchStartupSetting(memory,...args,observe));
}
