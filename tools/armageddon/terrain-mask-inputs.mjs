import fs from "node:fs";
import { decodeImage } from "../../src/armageddon/image.js";
const root = new URL("../../", import.meta.url);
const themes = JSON.parse(
  fs.readFileSync(new URL("src/armageddon/terrain-objects.json", root)),
);
const cases = [];
for (const [theme, { objects }] of Object.entries(themes))
  for (const object of objects) {
    const asset = `media/level/${theme}/level/${object.name}.img`;
    const image = decodeImage(
      fs.readFileSync(new URL(`public/armageddon/${asset}`, root)),
    );
    cases.push({
      asset,
      direction: object.fields[5],
      width: image.width,
      height: image.height,
      pixels: Buffer.from(image.pixels).toString("base64"),
    });
  }
for (const width of [1, 7, 8, 9, 24, 64])
  for (const height of [1, 8, 17, 40])
    for (let direction = 0; direction < 4; direction++) {
      const pixels = Uint8Array.from({ length: width * height }, (_, i) =>
        i % 11 < 6 ? 1 : 0,
      );
      cases.push({
        asset: null,
        width,
        height,
        direction,
        pixels: Buffer.from(pixels).toString("base64"),
      });
    }
process.stdout.write(JSON.stringify(cases));
