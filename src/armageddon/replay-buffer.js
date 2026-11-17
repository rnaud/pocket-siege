// 004AF390..004AF4F0. Pointer values are represented as byte offsets;
// null remains distinct from a valid record at offset zero.
export class NativeReplayBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.bytes = new Uint8Array(capacity);
    this.records = new Map();
    this.clear();
  }
  clear() {
    this.writeOffset = 0;
    this.readOffset = 0;
    this.head = null;
    this.tail = null;
    this.count = 0;
    this.records.clear();
  }
  allocate(size) {
    const aligned = (size + 11) & ~3;
    let offset = this.writeOffset;
    if (offset < this.readOffset) {
      if (this.readOffset <= offset + aligned) return null;
    } else if (this.capacity <= offset + aligned) {
      offset = 0;
      if (this.readOffset <= aligned) return null;
    }
    const record = { offset, size, next: null };
    if (this.tail !== null) this.records.get(this.tail).next = offset;
    this.records.set(offset, record);
    this.tail = offset;
    if (this.head === null) this.head = offset;
    this.writeOffset = offset + aligned;
    this.count++;
    return offset + 8;
  }
  push(bytes) {
    const offset = this.allocate(bytes.length);
    if (offset === null) return null;
    this.bytes.set(bytes, offset);
    return offset;
  }
  peek() {
    if (this.head === null) return null;
    const { offset, size } = this.records.get(this.head);
    return { offset: offset + 8, bytes: this.bytes.slice(offset + 8, offset + 8 + size) };
  }
  pop() {
    if (this.head === null) return 0;
    const previous = this.head;
    this.head = this.records.get(previous).next;
    this.records.delete(previous);
    if (this.head === null) {
      this.tail = null;
      this.readOffset = this.writeOffset = 0;
    } else this.readOffset = this.head;
    this.count--;
    return 1;
  }
  contains(offset) {
    for (let head = this.head; head !== null; head = this.records.get(head).next)
      if (head + 8 === offset) return 1;
    return 0;
  }
  percentUsed() {
    const used = this.writeOffset - this.readOffset +
      (this.writeOffset < this.readOffset ? this.capacity : 0);
    return Math.trunc(Math.imul(used, 100) / this.capacity);
  }
  copyFrom(source) {
    // Native copying is incremental: a full destination retains the prefix.
    for (let head = source.head; head !== null; head = source.records.get(head).next) {
      const record = source.records.get(head);
      if (this.push(source.bytes.slice(head + 8, head + 8 + record.size)) === null) return 0;
    }
    return 1;
  }
  writeEvent(event, payload) {
    const bytes = new Uint8Array(payload.length + 4);
    new DataView(bytes.buffer).setUint32(0, event >>> 0, true);
    bytes.set(payload, 4);
    return this.push(bytes) === null ? 0 : 1;
  }
  readEvent() {
    const record = this.peek();
    // 0049C780 refuses an oversized head without consuming it.
    if (!record || record.bytes.length > 0x128) return null;
    const event = new DataView(record.bytes.buffer).getUint32(0, true);
    this.pop();
    return { event, payload: [...record.bytes.slice(4)] };
  }
  snapshot() {
    const records = [];
    for (let head = this.head; head !== null; head = this.records.get(head).next) {
      const record = this.records.get(head);
      records.push({ offset: head, payload: [...this.bytes.slice(head + 8, head + 8 + record.size)] });
    }
    return { writeOffset: this.writeOffset, readOffset: this.readOffset,
      head: this.head, tail: this.tail, count: this.count,
      percent: this.percentUsed(), records };
  }
}
