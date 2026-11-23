import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { decodeImage } from "../../src/armageddon/image.js";
import {
  nativeCollisionMask,
  ORIGINAL_MASK_REGIONS,
  ORIGINAL_ARROW_SHAPE_REGION,
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
// 004A59CF..004A5A69: shapes 10..41 crop arrow00..31.img (Longbow headings).
const arrowHash = createHash("sha256");
for (let index = 0; index < 32; index++) {
  const name = `arrow${String(index).padStart(2, "0")}.img`;
  const bytes = readFileSync(
    new URL(`../../public/armageddon/media/gfx/gfx/${name}`, import.meta.url),
  );
  arrowHash.update(bytes);
  const mask = nativeCollisionMask(decodeImage(bytes), ORIGINAL_ARROW_SHAPE_REGION);
  shapes[10 + index] = { ...mask, planes: mask.planes.slice(0, 1) };
}
writeFileSync(
  new URL("../../src/armageddon/collision-shapes.json", import.meta.url),
  JSON.stringify({
    source_sha256: createHash("sha256").update(source).digest("hex"),
    arrow_sha256: arrowHash.digest("hex"),
    shapes,
  }) + "\n",
);
