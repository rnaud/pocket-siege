import { nextLogicRandom, nextVisualRandom } from "./numeric.js";

export class MatchRandom {
  constructor(seed) {
    this.reset(seed);
  }
  reset(seed) {
    // 0049CA90 initializes both streams from the same mission logic seed.
    this.seed = this.logicState = this.visualState = seed >>> 0;
    this.frame = 0;
  }
  logicUint() {
    return (this.logicState = nextLogicRandom(this.logicState, this.frame));
  }
  visualUint() {
    return (this.visualState = nextVisualRandom(this.visualState));
  }
  logic() {
    return this.logicUint() / 0x100000000;
  }
  visual() {
    return this.visualUint() / 0x100000000;
  }
  finishFrame() {
    this.frame = (this.frame + 1) >>> 0;
  }
  snapshot() {
    return {
      seed: this.seed,
      frame: this.frame,
      logic: this.logicState,
      visual: this.visualState,
    };
  }
  restore(state) {
    for (const field of ["seed", "frame", "logic", "visual"]) {
      if (
        !Number.isInteger(state[field]) ||
        state[field] < 0 ||
        state[field] > 0xffffffff
      )
        throw new RangeError(`Invalid random state: ${field}`);
    }
    this.seed = state.seed;
    this.frame = state.frame;
    this.logicState = state.logic;
    this.visualState = state.visual;
  }
}
