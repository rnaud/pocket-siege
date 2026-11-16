// Shared context+824 pool, initialized by004A5386..004A53C8.
export class NativeRenderOrder {
  constructor() {
    this.free = Array.from({ length: 256 }, (_, i) => i);
    this.active = [];
    this.orders = Array(256).fill(-1);
  }
  promote(index) {
    const rank = this.orders[index];
    if (!rank) return;
    for (const id of this.active) if (this.orders[id] < rank) this.orders[id]++;
    this.orders[index] = 0;
  }
  // Mine constructor004E944A..004E9512.
  allocate() {
    if (!this.free.length) return -1;
    const index = this.free.pop();
    this.orders[index] = this.active.length;
    this.active.push(index);
    this.promote(index);
    return index;
  }
  // Mine destructor004E9790..004E986E: compact ranks, swap-last active list.
  release(index) {
    const rank = this.orders[index];
    for (const id of this.active) if (this.orders[id] > rank) this.orders[id]--;
    const position = this.active.indexOf(index);
    if (position < 0) return;
    this.free.push(index);
    const last = this.active.pop();
    if (position < this.active.length) this.active[position] = last;
    this.orders[index] = -1;
  }
}
