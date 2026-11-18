import {nativeReplayEntry} from './replay-entry.js';
import {NativeReplayStream} from './replay-stream.js';
import {nativeReadEnvironmentMemory} from './physics-memory.js';
import {nativeReadRootMemory} from './replay-task-memory.js';

//004A1D20. Cleanup may replace/null the owned pointers, so reread them before
//destruction. Allocation and old-object virtual cleanup remain host interfaces.
export function nativeRestoreSceneSnapshot(memory,owner,streamAddress,host) {
  host.flushTask(memory.get(owner+4));
  const oldRoot=memory.get(owner+4);if(oldRoot)host.destroyTask(oldRoot,1);
  host.flushEnvironment(memory.get(memory.get(owner+0x2a0)+0x7d4));
  const oldEnvironment=memory.get(memory.get(owner+0x2a0)+0x7d4);
  if(oldEnvironment)host.destroyEnvironment(oldEnvironment,1);
  const stream=NativeReplayStream.fromMemory(memory,streamAddress);
  stream.seek(0);
  memory.range(memory.get(owner+0x2a0)+0x7ec,0x3fbc).set(stream.readBlock(0x3fbc));
  const environment=host.allocate(0x3c4),scene=memory.get(owner+0x2a0);
  memory.put(scene+0x7d4,environment?nativeReadEnvironmentMemory(memory,environment,scene,stream,host):0);
  stream.readByte();
  const root=host.allocate(0x28c);
  memory.put(owner+4,root?nativeReadRootMemory(memory,root,memory.get(streamAddress+20),stream,host):0);
  memory.put(memory.get(owner+0x2a0)+0x12414,14);
  return memory.get(owner+4);
}

//004A30A0 playback-entry branch with scene-owned snapshot reconstruction.
//A true result asks the caller to continue ordinary frame processing.
export function nativeReplaySceneEntry(memory,owner,host) {
  const manager={};
  for(const [key,offset] of [['playbackError',0x270],['playbackFailure',0x26c]])Object.defineProperty(manager,key,{
    get:()=>memory.get(owner+offset)|0,set:value=>memory.put(owner+offset,value),
  });
  return nativeReplayEntry(memory.range(memory.get(owner+0x2a0),0x20000),manager,{
    device:host.device,audio:host.audio,
    restoreSnapshot:()=>nativeRestoreSceneSnapshot(memory,owner,memory.get(owner+8),host),
  });
}
