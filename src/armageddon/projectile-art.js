import { nativeDirectionTurn } from "./direction.js";
const abs = v => ((v ^ (v >> 31)) - (v >> 31)) | 0;

// Render-mode switch004E2A95..004E2B92. Modes4..6 keep tick-driven
// progress; special projectile mode4 and water remapping follow separately.
export function nativeProjectileArt(input) {
  let sprite = input.override ? input.overrideSprite : input.sprite;
  let progress = input.progress, facing = input.facing;
  switch (input.mode) {
    case 0:
      if (!input.total) throw new RangeError("Native fuse animation requires a nonzero duration");
      progress = Math.max(0, Math.min(65535, (65536 - Math.trunc((input.remaining << 16) / input.total)) | 0));
      break;
    case 1:
      progress = input.angle;
      break;
    case 2:
      if (input.vx || input.vy) progress = nativeDirectionTurn(input.vx, -input.vy | 0) & 65535;
      break;
    case 3: {
      facing = input.vx < 0 ? -1 : 1;
      const speed = abs(input.vx);
      progress = (progress + Math.trunc(speed / 100) + 0xccc) & 65535;
      sprite = (sprite + Math.min(3, Math.trunc(speed / 2) >> 16)) | 0;
      break;
    }
  }
  return { sprite, progress, facing };
}
