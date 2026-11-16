import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { decodeImage } from '../src/armageddon/image.js';
import { nativeTerrainCutMask, carveNativeToolMask } from '../src/armageddon/terrain-cut-mask.js';
import fixture from './fixtures/armageddon/terrain-cut-mask.json' with {type:'json'};

test('tool cutout and shaded rim match original mask constructor', () => {
  const image = decodeImage(readFileSync('public/armageddon/media/gfx/gfx/masks.img'));
  expect(fixture.cases).toHaveLength(4);
  for (const {region,...expected} of fixture.cases)
    expect(nativeTerrainCutMask(image,region)).toEqual(expected);
});

test('tool mask preserves its native anchor, clips at edges and respects locked terrain', () => {
  const mask = fixture.cases[0], width=64, height=64;
  for (const [x,y] of [[32,32],[0,0],[63,63],[-100,32]]) {
    const terrain = new Uint8Array(width*height).fill(1), rim = new Uint8Array(width*height);
    const expectedHole = new Set(mask.hole.map(([px,py]) => `${x-mask.anchorX+px},${height-(y-mask.anchorY+py)}`));
    const expectedRim = new Set(mask.rim.map(([px,py]) => `${x-mask.anchorX+px},${height-(y-mask.anchorY+py)}`));
    carveNativeToolMask(terrain,width,height,mask,x,y,rim);
    for (let py=0;py<height;py++) for (let px=0;px<width;px++) {
      const key=`${px},${py}`, i=py*width+px;
      expect(terrain[i]).toBe(Number(!expectedHole.has(key)));
      expect(rim[i]).toBe(Number(!expectedHole.has(key) && expectedRim.has(key)));
    }
    const before=terrain.slice(), beforeRim=rim.slice();
    expect(carveNativeToolMask(terrain,width,height,mask,20,20,rim,true)).toBe(0);
    expect(terrain).toEqual(before);
    expect(rim).toEqual(beforeRim);
  }
});
