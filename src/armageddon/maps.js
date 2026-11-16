import { decodeImage, imageRGBA } from "./image.js";

// Full-size authored terrain. Coordinates are upward-positive like the host
// simulation; source IMG rows are top-down. Index zero is empty space.
// Destruction uses the host circular brush, not the native explosion routine.
export class OriginalMapTerrain {
  constructor(buffer, id = "") {
    const image = decodeImage(buffer);
    this.id = id;
    this.width = image.width;
    this.height = image.height;
    this.pixels = imageRGBA(image, true);
    this.data = new Uint8Array(this.width * this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.data[y * this.width + x] =
          image.pixels[(this.height - 1 - y) * this.width + x] !== 0 ? 1 : 0;
      }
    }
  }
  solid(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    return (
      x >= 0 &&
      x < this.width &&
      y >= 0 &&
      y < this.height &&
      this.data[y * this.width + x] === 1
    );
  }
  surface(x) {
    for (let y = this.height - 1; y >= 0; y--)
      if (this.solid(x, y)) return y + 1;
    return 0;
  }
  carve(cx, cy, radius) {
    let removed = 0;
    for (
      let y = Math.max(0, Math.floor(cy - radius));
      y < Math.min(this.height, cy + radius);
      y++
    ) {
      for (
        let x = Math.max(0, Math.floor(cx - radius));
        x < Math.min(this.width, cx + radius);
        x++
      ) {
        if ((x - cx) ** 2 + (y - cy) ** 2 >= radius ** 2) continue;
        const i = y * this.width + x;
        removed += this.data[i];
        this.data[i] = 0;
        const offset = ((this.height - 1 - y) * this.width + x) * 4;
        this.pixels.fill(0, offset, offset + 4);
      }
    }
    return removed;
  }
}
