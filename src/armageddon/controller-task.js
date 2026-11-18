import { nativeControllerCommand } from './controller-command.js';
import { nativeForwardTaskEvent, nativeSendTaskEvent } from './task-dispatch.js';

//004E6810 task entry. Native notifications carry either the incoming sender
// or this controller; a declared size may exceed the initialized payload prefix.
export function nativeDispatchControllerTask(task,sceneMemory,sender,event,size,payload,host) {
  const forward=(nextEvent,nextPayload)=>nativeForwardTaskEvent(task,sender,nextEvent,size,nextPayload,host.dispatch);
  const send=(from,type,index,nextEvent,nextSize,nextPayload)=>nativeSendTaskEvent(task.registry,from,type,index,nextEvent,nextSize,nextPayload,host.dispatch);
  const adapters={
    sendWorm:(type,index,nextEvent,...data)=>data.length===2
      ?send(task,type,index,nextEvent,data[0],data[1])
      :send(sender,type,index,nextEvent,size,data[0]),
    sendTask:(type,index,nextEvent,nextSize,nextPayload)=>send(task,type,index,nextEvent,nextSize,nextPayload),
    selfEvent:(nextEvent,nextSize,nextPayload)=>nativeDispatchControllerTask(task,sceneMemory,task,nextEvent,nextSize,nextPayload,host),
    selectionCommand:(team,worm,slot,flag,declaredSize)=>{
      const prefix=new Uint8Array(16),view=new DataView(prefix.buffer);
      [team,worm,slot,flag].forEach((value,i)=>view.setInt32(i*4,value,true));
      return send(task,0x14,0,0x41b,declaredSize,prefix);
    },
    ...host,forward,
  };
  if(!nativeControllerCommand(task.memory,sceneMemory,event,payload,adapters))forward(event,payload);
}
