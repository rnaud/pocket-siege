import { readFileSync, writeFileSync } from 'node:fs';
import { decodeImage } from '../../src/armageddon/image.js';
import { nativeTerrainToolMasks } from '../../src/armageddon/terrain-cut-mask.js';
const image = decodeImage(readFileSync(new URL('../../public/armageddon/media/gfx/gfx/masks.img', import.meta.url)));
writeFileSync(new URL('../../src/armageddon/tool-cuts.json', import.meta.url), JSON.stringify(nativeTerrainToolMasks(image)) + '\n');
