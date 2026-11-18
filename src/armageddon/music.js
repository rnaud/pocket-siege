import catalog from "./music-catalog.json";
import { NativeFrontendRandom } from "./frontend-random.js";
import { nativeSetupMusic } from "./setup-metadata.js";

// Browser transport for original streams. Playlist selection shares the
// recovered setup routine; scene transitions use the current host match model.
export class OriginalMusic {
  constructor() {
    this.audio = document.createElement("audio");
    this.audio.id = "game-music";
    this.audio.preload = "none";
    this.audio.volume = 0.75;
    this.audio.hidden = true;
    document.body.append(this.audio);
    this.audio.addEventListener("ended", () => {
      this.attempted = false;
      if (this.scene === "battle")
        this.index = (this.index + 1) % this.playlist.length;
      if (this.scene === "result") this.resultTrack = "stats";
      this.refresh();
    });
    this.resultTrack = "stats";
    this.attempted = false;
  }
  result(winner, mode) {
    this.resultTrack =
      winner === null
        ? "stats"
        : mode === "ai" && winner !== 0
          ? "lose"
          : `win-${((this.seed >>> 0) % 4) + 1}`;
  }
  unlock() {
    this.attempted = false;
    this.refresh();
  }
  update({ enabled, hidden, scene, seed }) {
    const key = `${enabled}|${hidden}|${scene}|${seed}|${this.resultTrack}`;
    if (key === this.updateKey) return;
    this.updateKey = key;
    if (this.seed !== seed) {
      this.seed = seed;
      const data = new Uint8Array(0xc6);
      nativeSetupMusic(data, -1, 67, true, new NativeFrontendRandom(seed));
      const view = new DataView(data.buffer);
      this.playlist = Array.from(
        { length: 16 },
        (_, i) => `ingame-${view.getInt32(0x84 + i * 4, true)}`,
      );
      this.index = 0;
    }
    const active = enabled && !hidden;
    if (active !== this.active) this.attempted = false;
    this.active = active;
    this.scene = scene;
    this.refresh();
  }
  refresh() {
    if (!this.active || !this.playlist) {
      this.audio.pause();
      return;
    }
    const track =
      this.scene === "title"
        ? "title"
        : this.scene === "result"
          ? this.resultTrack
          : this.scene === "sudden"
            ? `sudden-${((this.seed >>> 0) % 2) + 1}`
            : this.playlist[this.index];
    if (track !== this.track) {
      this.track = track;
      this.audio.src = `${import.meta.env.BASE_URL}armageddon/music/${catalog.tracks[track].file}`;
      this.audio.dataset.track = track;
      this.audio.loop =
        this.scene === "title" || this.scene === "sudden" || track === "stats";
      this.attempted = false;
    }
    if (this.audio.paused && !this.attempted) {
      this.attempted = true;
      // Browsers can reject autoplay until a gesture; retry on the next gesture.
      this.audio.play().catch(() => {});
    }
  }
}
