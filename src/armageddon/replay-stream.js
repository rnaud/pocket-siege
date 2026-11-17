// 004C7370..004C74F0: native snapshot stream. Block operations align to
// four bytes; byte operations do not. Rewinding never truncates saved data.
export class NativeReplayStream {
  constructor(capacity) {
    this.bytes = new Uint8Array(capacity);
    this.reset();
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
