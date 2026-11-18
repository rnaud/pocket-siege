//MSVCRT rand/srand and004190C0/00419130 persistent frontend seed service.
//Time and profile storage remain host interfaces. Keep this stream separate
//from the match's simulation RNG: starting selection persists its next seed.
export class NativeFrontendRandom {
  constructor(state=1) {this.state=state>>>0;}
  seed(value) {this.state=value>>>0;}
  random() {
    this.state=(Math.imul(this.state,214013)+2531011)>>>0;
    return (this.state>>>16)&32767;
  }
  nextSeed(host) {
    this.seed(host.time());
    const fallback=(Math.imul(this.random(),0x3cbf)+0x3c6ef35f)>>>0;
    const seed=host.readSeed(fallback)>>>0;
    this.seed(seed);
    const next=((this.random()<<16)+this.random())>>>0;
    host.writeSeed(next);
    return seed;
  }
}
