import {NativeReplayStream} from './replay-stream.js';
import {NativeReplayBuffer} from './replay-buffer.js';
import { nativeReplayFrame } from './replay-frame.js';
import { nativeCollectReplayInput } from './replay-input.js';
import { nativeDispatchReplayEvents } from './replay-dispatch.js';
import { nativeReplaySessionTick } from './replay-session.js';
import { nativeRestoreReplaySnapshot } from './replay-restore.js';
import { nativeAdvanceReplayFrameState, nativeAdvanceInputFrameState, nativeReplayFrameAudio } from './replay-frame-state.js';

// Shared backing memory keeps scalar manager fields coherent across the ports.
// Object references (root/environment) retain host identities, not native pointers.
export function createNativeReplayPipeline({ sceneMemory, managerMemory, root, environment, stream, incoming, recording, host }) {
  const view = new DataView(managerMemory.buffer, managerMemory.byteOffset, managerMemory.byteLength);
  const manager = { root, environment, globalCounter: 0 };
  const offsets = { captureFrame: 0x15c, checksum: 0x160, hasSnapshot: 0x164,
    suppressRender: 0x224, paused: 0x244, playbackFailure: 0x26c, playbackError: 0x270,
    abortValue: 0x280, pendingInputEvent: 0x284, abortFirst: 0x288, abortSecond: 0x28c,
    inputMode: 0x290, abortMode: 0x294 };
  for (const [key, offset] of Object.entries(offsets)) Object.defineProperty(manager, key, {
    enumerable: true, get: () => view.getInt32(offset, true), set: value => view.setInt32(offset, value, true),
  });
  const dispatchRoot = (event, payload) => host.dispatchRoot(manager.root, event, payload);
  const renderFrame = () => host.renderFrame(manager);
  const adapters = {
    audio: host.audio, device: host.device, incoming, recording,
    restoreSnapshot: () => nativeRestoreReplaySnapshot(stream, manager, { ...host.restore, sceneMemory }),
    updateAudio: () => nativeReplayFrameAudio(managerMemory, sceneMemory, host),
    collectInput: queue => nativeCollectReplayInput(manager, queue, {
      collectRoot: (target, event, size) => host.collectRoot(manager.root, target, event, size),
      collectDevice: target => host.collectDevice(target),
    }),
    dispatchEvents: queue => nativeDispatchReplayEvents(sceneMemory, manager, {
      incoming: queue, recording, dispatch: dispatchRoot,
      flushRoot: () => host.flushRoot(manager.root), flushEnvironment: () => host.flushEnvironment(manager.environment),
      sessionTick: playback => nativeReplaySessionTick(sceneMemory, manager, { stream, recording, playback, device: host.device, audio: host.audio }),
      playSound: host.audio ? (...args) => host.audio.playSound(...args) : undefined,
    }),
    advancePlayback: () => nativeAdvanceReplayFrameState(managerMemory),
    advanceInput: () => nativeAdvanceInputFrameState(managerMemory, { dispatchRoot, renderFrame }),
    dispatchRoot, renderFrame, queryRoot: (event, output) => host.queryRoot(manager.root, event, output),
  };
  return { manager, tick: () => nativeReplayFrame(sceneMemory, manager, adapters) };
}

//Bind004A30A0's offline channels at owner+30/+34 to their existing native
//allocations. Root/environment objects may be supplied by replay restoration;
//otherwise the host receives their native addresses. Scratch is caller-owned.
export function createNativeSceneReplayPipeline({memory,owner,scratch,host,stream,root,environment}) {
  const scene=memory.get(owner+0x2a0);
  const snapshot=stream??(memory.get(owner+8)?NativeReplayStream.fromMemory(memory,memory.get(owner+8)):undefined);
  const incoming=NativeReplayBuffer.fromMemory(memory,memory.get(owner+0x30),scratch);
  const recording=NativeReplayBuffer.fromMemory(memory,memory.get(owner+0x34),scratch+304);
  return {...createNativeReplayPipeline({sceneMemory:memory.range(scene,0x20000),managerMemory:memory.range(owner,0x2a4),
    root:root??memory.get(owner+4),environment:environment??memory.get(scene+0x7d4),stream:snapshot,incoming,recording,host}),incoming,recording,stream:snapshot};
}
