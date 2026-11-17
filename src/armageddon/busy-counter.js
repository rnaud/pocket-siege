// Shared context+800, advanced before event3E9 by004A1A00. The original
// wake setter overwrites even a longer delay; it is not a maximum operation.
export class NativeBusyCounter {
  constructor(value = 0) { this.value = value | 0; }
  tick() { if (this.value !== 0) this.value = (this.value - 1) | 0; }
  wake() { this.value = 12; } // 004EEBE0.
  delay(seconds) { this.value = Math.imul(seconds, 50); } // 004EEBF0.
}
