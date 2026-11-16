import fs from "node:fs";
import { createHash } from "node:crypto";
import themes from "../../src/armageddon/terrain-themes.js";
import { decodeImage } from "../../src/armageddon/image.js";
const inputs = [];
for (const theme of themes) {
  const images = {};
  for (const name of ["text", "soil", "grass", "bridge-l", "bridge", "bridge-r"]) {
    const bytes = fs.readFileSync(`public/armageddon/media/level/${theme}/level/${name}.img`);
    const image = decodeImage(bytes);
    images[name] = { width: image.width, height: image.height,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      palette: [...image.palette], pixels: Buffer.from(image.pixels).toString("base64") };
  }
  inputs.push({ theme, images });
}
fs.writeFileSync(process.argv[2], JSON.stringify(inputs));
