import { fixedMultiply } from './numeric.js';

const signedAbs = value => ((value ^ (value >> 31)) - (value >> 31)) | 0;
function approach(current, target, minimum) {
  const difference = (target - current) | 0;
  const step = Math.max(minimum, signedAbs(fixedMultiply(difference, 0x1999)));
  return step < signedAbs(difference) ? (current + (target < current ? -step : step)) | 0 : target;
}
function memoryView(memory) {
  return new DataView(memory.buffer, memory.byteOffset, memory.byteLength);
}

// Full0049E750; manager offsets retain the original presentation-state layout.
export function nativeAdvanceReplayFrameState(managerMemory) {
  const view = memoryView(managerMemory);
  const get = offset => view.getInt32(offset, true);
  const put = (offset, value) => view.setInt32(offset, value, true);
  put(0x210, approach(get(0x210), get(0x220) ? 65536 : 0, 0x1333));
  if (get(0x260)) put(0x260, get(0x260) - 1);
  put(0x264, approach(get(0x264), !get(0x220) && get(0x260) ? 65536 : 0, 0xccc));
  put(0x16c, approach(get(0x16c), get(0x168) >= 101 ? 65536 : 0, 0xccc));
  let delta = (get(0x21c) - get(0x214)) | 0;
  if (delta > 0) delta = Math.max(1, Math.min(2, Math.trunc(delta / 5)));
  put(0x214, get(0x214) + delta);
}

// Full0049E580 shares the state updates, then updates the task tree and renders.
export function nativeAdvanceInputFrameState(managerMemory, { dispatchRoot, renderFrame }) {
  nativeAdvanceReplayFrameState(managerMemory);
  dispatchRoot(0x3ed, new Uint8Array());
  if (!memoryView(managerMemory).getInt32(0x224, true)) renderFrame();
}

// Full004A33F0; actual audio/music devices are host interfaces.
export function nativeReplayFrameAudio(managerMemory, sceneMemory, { audio, music }) {
  const view = memoryView(managerMemory), scene = memoryView(sceneMemory);
  const get = offset => view.getInt32(offset, true);
  const target = !scene.getInt32(0x20, true) && get(0x244) ? 0 : 65536;
  view.setInt32(0x230, target, true);
  const current = approach(get(0x22c), target, 0x1999);
  view.setInt32(0x22c, current, true);
  const volume = Math.min(current, (65536 - get(0x28c)) | 0);
  audio.setVolume(volume);
  if (music) music.setVolume(Math.trunc(Math.imul(scene.getUint8(0x11e45), volume) / 100) | 0);
}
