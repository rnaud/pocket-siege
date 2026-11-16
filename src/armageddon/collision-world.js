import shapes from "./collision-shapes.json" with { type: "json" };
import { nativeCollisionOverlap } from "./collision-mask.js";

export function nativeShapeTerrainOverlap(shape, terrain, x, y) {
  const mask = shapes.shapes[shape];
  const left = Math.floor(x) - mask.anchorX,
    top = Math.ceil(y) - 1 + mask.anchorY;
  return mask.planes[0].points.some(([px, py]) =>
    terrain.solid(left + px, top - py),
  );
}

export function nativeWorldShapeOverlap(
  shape,
  x,
  y,
  otherShape,
  otherX,
  otherY,
) {
  // The common world height cancels from both downward-positive positions.
  return nativeCollisionOverlap(
    shapes.shapes[shape],
    Math.floor(x),
    Math.floor(-y),
    shapes.shapes[otherShape],
    Math.floor(otherX),
    Math.floor(-otherY),
  );
}
