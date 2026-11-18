// 004C7370..004C74F0: native snapshot stream. Block operations align to
// four bytes; byte operations do not. Rewinding never truncates saved data.
export class NativeReplayStream {
  constructor(capacity) {
    this.bytes = new Uint8Array(capacity);
    this.reset();
  }
  //Borrow the snapshot stream created at owner+8 without resetting its cursor.
  static fromMemory(memory,address) {
    const stream=Object.create(NativeReplayStream.prototype);
    Object.defineProperties(stream,{
      bytes:{get:()=>memory.range(memory.get(address+4),memory.get(address+8))},
      position:{get:()=>memory.get(address+16),set:value=>memory.put(address+16,value)},
      length:{get:()=>memory.get(address+12),set:value=>memory.put(address+12,value)},
    });
    return stream;
  }
  reset() { this.position = 0; this.length = 0; }
  seek(position) { this.position = position; }
  readByte() { return this.bytes[this.position++]; }
  writeByte(value) {
    this.bytes[this.position++] = value;
    this.length = this.position;
  }
  readBlock(size) {
    this.position = (this.position + 3) & ~3;
    const bytes = this.bytes.slice(this.position, this.position + size);
    this.position += size;
    return bytes;
  }
  writeBlock(bytes) {
    while (this.position & 3) this.bytes[this.position++] = 255;
    this.bytes.set(bytes, this.position);
    this.position += bytes.length;
    this.length = this.position;
  }
  checksum() {
    // Full004AAA80, called with current position, not stored length.
    let value = 0;
    for (let i = 0; i < this.position; i++)
      value = (((value >>> 29) | (value << 3)) + this.bytes[i]) >>> 0;
    return value;
  }
}
