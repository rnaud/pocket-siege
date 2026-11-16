import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { decodeImage } from "../../src/armageddon/image.js";
import {
  nativeCollisionMask,
  ORIGINAL_MASK_REGIONS,
} from "../../src/armageddon/collision-mask.js";

const source = readFileSync(
  new URL("../../public/armageddon/media/gfx/gfx/masks.img", import.meta.url),
);
const image = decodeImage(source);
const shapes = Object.fromEntries(
  Object.entries(ORIGINAL_MASK_REGIONS).map(([id, region]) => {
    const mask = nativeCollisionMask(image, region);
    // The pixel-query implementation needs only the unshifted plane.
    return [id, { ...mask, planes: mask.planes.slice(0, 1) }];
  }),
);
writeFileSync(
  new URL("../../src/armageddon/collision-shapes.json", import.meta.url),
  JSON.stringify({
    source_sha256: createHash("sha256").update(source).digest("hex"),
    shapes,
  }) + "\n",
);
