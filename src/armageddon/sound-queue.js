// 004EDC90: sixteen five-word requests; overflow is rejected, not replaced.
// 004A1C22..004A1CBB: submit in insertion order after the simulation frame.
// Muted or missing backends still discard the entire frame's requests.
export class NativeSoundQueue {
  constructor() { this.requests = []; }
  enqueue(request) {
    if (this.requests.length > 15) return 0;
    this.requests.push(request.slice(0, 5).map(value => value | 0));
    return 1;
  }
  flush(submit, disabled = false) {
    if (!disabled && submit)
      for (let i = 0; i < this.requests.length; i++) submit(this.requests[i]);
    this.requests.length = 0;
  }
}

// 004967E0: first vacant channel, otherwise the last lowest-priority channel.
// The backend stops/releases an occupied selection and invalidates its handle.
export function nativeSoundChannel(channels, priority) {
  let selected = -1, lowest = 0;
  for (let i = 0; i < 8; i++) {
    if (!channels[i]) return i;
    const candidate = channels[i].priority | 0;
    if (selected < 0 || candidate <= lowest) {
      selected = i;
      lowest = candidate;
    }
  }
  return lowest <= (priority | 0) ? selected : -1;
}

// 00495F70 initializes 32 handles.00496B90 allocates from the free stack;
// 00496C90 returns a handle and removes it by swapping the last used entry.
// Channel displacement (004967E0) invalidates the link without freeing it.
export class NativeSoundHandles {
  constructor() {
    this.channels = Array(32).fill(-1);
    this.free = Array.from({ length: 32 }, (_, i) => i);
    this.used = [];
  }
  allocate(channel) {
    if (!this.free.length || channel < 0) return 0;
    const index = this.free.pop();
    this.used.push(index);
    this.channels[index] = channel;
    return index + 1;
  }
  invalidate(handle) {
    if (handle > 0 && handle <= 32) this.channels[handle - 1] = -1;
  }
  release(handle, stopChannel) {
    const index = (handle | 0) - 1;
    if (index < 0 || index >= 32) return 0;
    const channel = this.channels[index];
    if (channel >= 0) {
      this.channels[index] = -1;
      stopChannel(channel);
    }
    this.free.push(index);
    const position = this.used.indexOf(index);
    if (position < 0) return 0;
    this.used[position] = this.used[this.used.length - 1];
    this.used.pop();
    return 1;
  }
}

// 004DDF28..004DDFA6: per-worm cleanup of+388 action and+38C voice.
export function nativeWormSoundCleanup(state, action, voice, finished) {
  const calls = [];
  const done = handle => { calls.push(["query", handle]); return finished(handle); };
  const actionState = state >= 0x68 && state <= 0x75 && state !== 0x73;
  if (action && (!actionState || done(action))) {
    calls.push(["stop", action]); action = 0;
  }
  if (voice && done(voice)) { calls.push(["stop", voice]); voice = 0; }
  return { action, voice, calls };
}

// 00496EA0, called through audio vtable+2C on replay entry. This is not a
// blanket reset: query every occupied channel, release only playing buffers
// with a negative owner index, and leave the native handle pool untouched.
// Rows are the six words at backend+14+i*18 (flags, owner, slot, rate,
// volume, buffer). DirectSound status/release are explicit host interfaces.
export function nativeReplaySoundCleanup(channels, { query, release }) {
  let count = 0;
  for (let i = 0; i < 8; i++) {
    const row = channels[i];
    if (!row[5]) continue;
    const { result, flags } = query(row[5]);
    if (result === 0 && (flags & 1) && (row[1] | 0) < 0) {
      count++;
      release(row[5]);
      row[5] = 0; row[3] = 0; row[4] = 0;
      row[2] = -1; row[1] = -1;
    }
  }
  return count;
}
