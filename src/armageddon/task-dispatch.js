//004CCF50: signed bucket arithmetic and first matching registry entry.
export function nativeLookupTask(registry,type,index) {
  const bucket=((Math.imul(index,17)+type)|0)%256;
  for(const entry of registry[bucket] ?? [])if(entry.type===type && entry.index===index)return entry.task;
  return null;
}
//004B26F0: re-read children after each callback; callbacks may change the list.
export function nativeForwardTaskEvent(task,sender,event,size,payload,dispatch) {
  let index=0;
  while(index<task.children.length) {
    const child=task.children[index++];
    if(child!=null)dispatch(child,sender,event,size,payload);
  }
}
//004B26A0: existence determines success, regardless of the receiver's return.
export function nativeSendTaskEvent(registry,sender,type,index,event,size,payload,dispatch) {
  const task=nativeLookupTask(registry,type,index);if(task===null)return 0;
  dispatch(task,sender,event,size,payload);return 1;
}
