import { NativeGamePalette } from "./game-palette.js";

// Graphics-manager bank ownership:00497750/00497850/00497870.
export class NativePaletteBanks {
  constructor() {
    // 00496F60 makes0..254 available;255 stays reserved.
    this.available = Array(256).fill(1);
    this.available[255] = 0;
    this.banks = Array(8).fill(null);
    this.references = Array(8).fill(0);
  }
  get(bank) {
    return bank > 0 && bank < 8 ? this.banks[bank] : null;
  }
  allocate(bank, count, create = (first, last) => new NativeGamePalette(first, last)) {
    if (bank < 1 || bank > 7 || this.banks[bank]) return 0;
    let first = -1;
    for (let start = 0; start < 256; start++) {
      let blocked = false;
      for (let index = start; index < start + count && !blocked; index++)
        blocked = !this.available[index];
      if (blocked) continue;
      first = start;
      // The original clears the whole prefix, including previously free holes.
      this.available.fill(0, 0, start + count);
      break;
    }
    // Original returns1 even if allocation fails or the search returns-1.
    this.banks[bank] = create(first, first + count - 1);
    this.references[bank] = 0;
    return 1;
  }
  release(bank) {
    const palette = this.get(bank);
    if (!palette || this.references[bank]) return 0;
    for (let index = palette.first; index <= palette.last; index++) this.available[index] = 1;
    this.banks[bank] = null;
    return 1;
  }
}

// Entire gameplay setup004A6A70, including the reserved black entry.
export function createNativeGamePaletteBanks() {
  const manager = new NativePaletteBanks();
  manager.allocate(1, 105);
  manager.allocate(2, 32);
  manager.allocate(3, 112);
  manager.get(1).add([0, 0, 0]);
  return manager;
}
