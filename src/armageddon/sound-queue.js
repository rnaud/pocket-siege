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
