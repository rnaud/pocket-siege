import { nativeGraveLifecycle } from "./grave-lifecycle.js";
import { H, bodyBlocked } from "../physics.js";
import { nativeGraveBody, stepNativeGraveBody } from "./grave-body.js";
import { createOriginalVisual, originalVisual } from "./art.js";
import { nativeSpriteFrame } from "./animation.js";

// 004D55E0: team grave style 1..6 selects style+0x2ED; progress += 0x51E.
// Constructor 004D5170 gives the body native vy=-2/tick (host +100/sec).
// Native forces/sweep/bounce drive movement; terrain collision still uses the
// host body mask and the scheme friction byte remains the default 96.
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
    bubblePhase: 0,
    bubbleRequests: 0,
    wet: false,
    ticks: 0,
    body: nativeGraveBody(
      Math.round(worm.x * 65536),
      Math.round((H - worm.y) * 65536),
    ),
    mesh,
  };
}
export function stepOriginalGrave(
  grave,
  terrain,
  dt,
  waterLevel,
  gravityScale = 1,
  earthquake = 0,
  kick,
) {
  grave.body.x = Math.round(grave.x * 65536);
  grave.body.y = Math.round((H - grave.y) * 65536);
  grave.body = stepNativeGraveBody(
    grave.body,
    {
      frame: grave.ticks++,
      index: 0,
      waterY: Math.floor(H - waterLevel),
      gravity: Math.round(0x3d70 * gravityScale),
      wind: 0,
      earthquake,
    },
    (x, y) => Number(bodyBlocked(terrain, x / 65536, H - y / 65536)),
    kick,
  );
  grave.x = grave.body.x / 65536;
  grave.y = H - grave.body.y / 65536;
  grave.vx = (grave.body.vx / 65536) * 50;
  grave.vy = (-grave.body.vy / 65536) * 50;
  grave.wet ||= !!grave.body.submerged;
  const lifecycle = nativeGraveLifecycle(
    grave.progress,
    grave.bubblePhase,
    grave.wet,
    Math.round((H - grave.y) * 65536),
    H,
  );
  grave.progress = lifecycle.progress;
  grave.bubblePhase = lifecycle.phase;
  grave.bubbleRequests = lifecycle.bubbles;
  if (!lifecycle.alive) return false;
  const name = `${grave.wet ? "water/" : ""}grave${grave.style}`;
  const art = originalVisual(name);
  const index = nativeSpriteFrame(art.count, art.flags, grave.progress);
  grave.mesh.material.map = originalVisual(name, index).map;
  grave.mesh.position.set(Math.round(grave.x), Math.round(grave.y), 14);
  grave.mesh.scale.x = grave.facing > 0 ? -1 : 1;
  grave.mesh.userData.originalSprite = name;
  grave.mesh.userData.originalFrame = index;
  return true;
}
