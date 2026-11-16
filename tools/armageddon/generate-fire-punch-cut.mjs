import {readFileSync,writeFileSync} from 'node:fs';
import {decodeImage} from '../../src/armageddon/image.js';
import {nativeTerrainCutMask,FIRE_PUNCH_CUT_REGION} from '../../src/armageddon/terrain-cut-mask.js';
const image=decodeImage(readFileSync(new URL('../../public/armageddon/media/gfx/gfx/masks.img',import.meta.url)));
writeFileSync(new URL('../../src/armageddon/fire-punch-cut.json',import.meta.url),JSON.stringify(nativeTerrainCutMask(image,FIRE_PUNCH_CUT_REGION))+'\n');
