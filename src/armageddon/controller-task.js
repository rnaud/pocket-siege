import { nativeControllerCommand } from './controller-command.js';
import { nativeForwardTaskEvent } from './task-dispatch.js';

//004E6810 task entry. Events outside the local switch still reach children,
// including440 emitted during activation. Preserve the original sender/size.
export function nativeDispatchControllerTask(task,sceneMemory,sender,event,size,payload,host) {
  const forward=(nextEvent,nextPayload)=>nativeForwardTaskEvent(task,sender,nextEvent,size,nextPayload,host.dispatch);
  if(!nativeControllerCommand(task.memory,sceneMemory,event,payload,{...host,forward}))forward(event,payload);
}
