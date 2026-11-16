import { stepWorm } from "../physics.js";
import { createOriginalVisual, originalVisual } from "./art.js";
import { nativeSpriteFrame } from "./animation.js";

// 004D55E0: team grave style 1..6 selects style+0x2ED; progress += 0x51E.
// Constructor 004D5170 gives the body native vy=-2/tick (host +100/sec).
// Host body collision/gravity and sinking remain adapters, not native grave physics.
export function createOriginalGrave(worm, style = worm.team + 1) {
  const name = `grave${style}`;
  const mesh = createOriginalVisual(name);
  if (!mesh) return null;
  return {
    x: worm.x,
    y: worm.y,
    vx: 0,
    vy: 100,
    ground: false,
    facing: worm.facing,
    style,
    progress: 0,
    wet: false,
    mesh,
  };
}
export function stepOriginalGrave(
  grave,
  terrain,
  dt,
  waterLevel,
  gravityScale = 1,
) {
  grave.progress = (grave.progress + 0x51e) | 0;
  if (grave.wet || grave.y < waterLevel) {
    grave.wet = true;
    grave.y -= 24 * dt;
  } else stepWorm(grave, terrain, dt, gravityScale);
  const name = `${grave.wet ? "water/" : ""}grave${grave.style}`;
  const art = originalVisual(name);
  const index = nativeSpriteFrame(art.count, art.flags, grave.progress);
  grave.mesh.material.map = originalVisual(name, index).map;
  grave.mesh.position.set(Math.round(grave.x), Math.round(grave.y), 14);
  grave.mesh.scale.x = grave.facing > 0 ? -1 : 1;
  grave.mesh.userData.originalSprite = name;
  grave.mesh.userData.originalFrame = index;
  return grave.y > 0;
}
