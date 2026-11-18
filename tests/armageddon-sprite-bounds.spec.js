import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import fixture from "./fixtures/armageddon/sprite-bounds.json" with { type: "json" };
import { decodeSprite, nativeSpritePaletteMap, spriteFrameRGBA } from "../src/armageddon/sprite.js";
import { NativeGamePalette } from "../src/armageddon/game-palette.js";
import spritePalettes from "./fixtures/armageddon/sprite-palette.json" with { type: "json" };
import startupPalette from "./fixtures/armageddon/startup-palette.json" with { type: "json" };
import { decodeNativeFont } from "../src/armageddon/font.js";
import { nativeStartupPalette } from "../src/armageddon/startup-palette.js";
import spritePaletteData from "../src/armageddon/sprite-palette-data.json" with { type: "json" };
import { nativeSpriteBounds } from "../src/armageddon/animation.js";

import fontMemory from './fixtures/armageddon/font-memory.json' with {type:'json'};
import {nativeReadFont} from '../src/armageddon/font-memory.js';
import spriteMemory from './fixtures/armageddon/sprite-memory.json' with {type:'json'};
import {nativeReadSprite} from '../src/armageddon/sprite-memory.js';
import {nativeCreateGamePalette} from '../src/armageddon/game-palette-memory.js';

import archiveArt from './fixtures/armageddon/archive-art.json' with {type:'json'};
import {nativeCreateSprite,nativeCreateFont,nativeLoadArchiveSprite,nativeLoadArchiveFont} from '../src/armageddon/archive-art.js';

import rendererFonts from './fixtures/armageddon/renderer-font.json' with {type:'json'};
import {nativeLoadRendererFont,nativeDestroyFont} from '../src/armageddon/renderer-font.js';

import rendererSprites from './fixtures/armageddon/renderer-sprite.json' with {type:'json'};
import {nativeLoadRendererSprite,nativeDestroySprite} from '../src/armageddon/renderer-sprite.js';

test("worm frame bounds retain the native canvas-center anchor across animation", { tag: "@logic" }, () => {
  for(const c of [...spriteMemory.cases,...fontMemory.cases.map(c=>({...c,font:true}))]) {
    const raw=c.path?readFileSync(new URL(`../${c.path}`,import.meta.url)):Buffer.from(c.raw,'hex');
    expect(createHash('sha256').update(raw).digest('hex')).toBe(c.sha256);
    const owner=0x2000000,source=0x2400000;
    const arena=Buffer.alloc(0x10000,c.pattern),data=Buffer.from(raw),counters=Buffer.alloc(16);
    const mapping=Buffer.alloc(256);
    const region=p=>p>=0x2500000?[mapping,p-0x2500000]:p>=source?[data,p-source]:p>=owner?[arena,p-owner]:[counters,p-0x5602e4];
    const memory={get(p){const [b,o]=region(p);return b.readUInt32LE(o);},put(p,v){const [b,o]=region(p);b.writeUInt32LE(v>>>0,o);},byte(p){const [b,o]=region(p);return b[o];},putByte(p,v){const [b,o]=region(p);b[o]=v;}};
    [0xfffffff0,17,0xfffffff0,23].forEach((v,i)=>counters.writeUInt32LE(v,i*4));
    nativeCreateGamePalette(memory,owner,1,c.last);
    const snapshot=()=>createHash('sha256').update(arena).update(data).update(counters).digest('hex');
    const events=[];
    const result=c.font?nativeReadFont(memory,owner+0x3000,owner,source,0x2500000):nativeReadSprite(memory,owner+0x3000,owner,source,{allocate(size){events.push({size,state:snapshot()});return c.allocated?owner+0x4000:0;}});
    expect({events,result,state:snapshot()},`${c.path??'raw'} / ${c.pattern} / ${c.allocated} / ${c.last}`).toEqual({events:c.events??[],result:c.result,state:c.state});
  }
  for(const c of [...archiveArt.cases,...rendererFonts.cases,...rendererSprites.cases]) {
    const raw=readFileSync(new URL(`../${c.path}`,import.meta.url));
    expect(createHash('sha256').update(raw).digest('hex')).toBe(c.sha256);
    const owner=0x2000000,source=0x2400000,stop=0x2200000,archive=owner+0x5000,vtable=owner+0x5800,name=owner+0x7000,table=owner+0x8000,entry=owner+0x9000,obj=owner+0x3000;
    const arena=Buffer.alloc(0x10000,c.pattern),data=c.mode==='mapped'?Buffer.from(raw):Buffer.alloc(raw.length,c.pattern),counters=Buffer.alloc(16),normalized=Buffer.alloc(256,c.pattern),mapping=Buffer.alloc(256);
    const region=p=>p>=0x2500000?[mapping,p-0x2500000]:p>=source?[data,p-source]:p>=owner?[arena,p-owner]:p>=0x7d6058?[normalized,p-0x7d6058]:[counters,p-0x5602e4];
    const memory={get(p){const [b,o]=region(p);return b.readUInt32LE(o);},put(p,v){const [b,o]=region(p);b.writeUInt32LE(v>>>0,o);},byte(p){const [b,o]=region(p);return b[o];},putByte(p,v){const [b,o]=region(p);b[o]=v;}};
    const write=(p,v)=>memory.put(p,v),copy=(p,bytes)=>bytes.forEach((v,i)=>memory.putByte(p+i,v));
    [0xfffffff0,17,0xfffffff0,23].forEach((v,i)=>counters.writeUInt32LE(v,i*4));
    write(archive,vtable);write(vtable+4,stop+0x100);write(vtable+8,stop+0x300);write(vtable+12,stop+0x200);write(vtable+20,0x4ad780);
    write(archive+4,table);copy(table,Buffer.alloc(4096));write(archive+0x18c,16);write(archive+0x190,0);
    for(let i=0;i<16;i++){write(archive+0x10c+i*4,i);write(archive+12+i*16,0);}
    const filename=Buffer.from(c.path.split('/').at(-1)+'\0');copy(name,filename);write(entry,0);write(entry+4,1234);write(entry+8,raw.length);copy(entry+12,filename);
    let hash=0;for(const byte of filename.subarray(0,-1))hash=(byte+((hash>>>9)|((hash*2)&1023)))&1023;
    if(c.mode!=='missing')write(table+hash*4,entry);
    nativeCreateGamePalette(memory,owner,1,c.last);
    const renderer=owner+0xa000;
    if(c.register) {
      write(renderer+0x4ae8,c.profile==='no_palette'?0:owner);
      if(c.spriteRegistration){write(renderer+0x2864+c.id*4,c.profile==='duplicate'?obj:0);write(renderer+0x38e4+c.id*4,c.profile==='stream_duplicate'?obj:0);}
      else write(renderer+0x49e4+c.id*4,c.profile==='duplicate'?obj:0);
      write(renderer+0x4b08,0xffffffff);
    } else if(c.font)nativeCreateFont(memory,obj);else nativeCreateSprite(memory,obj,0x497b20,0x497ba0);
    const snapshot=()=>createHash('sha256').update(arena).update(data).update(counters).update(normalized).digest('hex');
    expect(snapshot()).toBe(c.initial);
    const events=[],host={
      lookupArchiveResource(at,name){events.push(['view',at,name,snapshot()]);return c.mode==='mapped'?source:0;},
      allocate(size){events.push(['allocate',size,snapshot()]);return c.register&&size===(c.spriteRegistration?72:28)?obj:size===12?owner+0x6000:c.allocated?owner+0x6100:0;},
      allocateArray(size,pool){events.push(['array',size,pool,snapshot()]);return source;},
      seekArchive(at,position){events.push(['seek',at,position,snapshot()]);return 1;},
      readArchive(at,destination,size){events.push(['read',at,destination,size,snapshot()]);copy(destination,raw.subarray(0,size));return size;},
      freeSized(pointer,size){events.push(['free',pointer,size,snapshot()]);},
      freeArray(pointer){events.push(['freeArray',pointer,snapshot()]);},
      releaseSpriteBlock(callback,pointer){events.push(['block',callback,pointer,snapshot()]);},
    };
    const result=c.spriteRegistration?nativeLoadRendererSprite(memory,renderer,c.bank,c.priority,c.id,archive,name,0,host):c.register?nativeLoadRendererFont(memory,renderer,c.bank,c.priority,c.id,archive,name,0x2500000,host):c.font?nativeLoadArchiveFont(memory,obj,owner,archive,name,0x2500000,host):nativeLoadArchiveSprite(memory,obj,owner,archive,name,host);
    if(c.register){
      expect(snapshot()).toBe(c.registered);
      if(result){
        if(c.spriteRegistration){const blocks=memory.byte(obj+28)|(memory.byte(obj+29)<<8);for(let i=0;i<blocks;i++)write(memory.get(obj+24)+i*12+4,i%2===0?owner+0x6200+i*16:0);}
        (c.spriteRegistration?nativeDestroySprite:nativeDestroyFont)(memory,obj,1,host);
      }
    }
    expect({events,result,state:snapshot()},`${c.path} / ${c.mode} / ${c.pattern} / ${c.allocated} / ${c.last}`).toEqual({events:c.events,result:c.result,state:c.state});
  }
  const startup = new NativeGamePalette(0, 104);
  startup.add([0, 0, 0]);
  const loaded = new Map();
  for (const row of startupPalette.steps.filter(row => row.path)) {
    const bytes = readFileSync(new URL(`../${row.path}`, import.meta.url));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(row.sha256);
    loaded.set(row.path, (row.kind === "font" ? decodeNativeFont : decodeSprite)(bytes));
  }
  const startupSteps = [];
  const entries = palette => palette.used.map(index => [index, [...palette.colors[index]]]);
  const result = nativeStartupPalette(startup,
    name => loaded.get(`public/armageddon/sprites/${name}.spr`),
    name => loaded.get(`public/armageddon/fonts/${name}.fnt`),
    (kind, id, name, palette) => startupSteps.push({ kind, id, entries: entries(palette) }));
  expect(startupSteps).toEqual(startupPalette.steps.map(({ kind, id = null, entries }) => ({ kind, id, entries })));
  expect(entries(startup)).toEqual(startupPalette.entries);
  expect(result.teamIndices).toEqual(startupPalette.teamIndices);
  for (const sequence of spritePalettes.cases) {
    const palette = new NativeGamePalette(sequence.first, sequence.last);
    if (sequence.black) palette.add([0, 0, 0]);
    for (const row of sequence.sprites) {
      const bytes = readFileSync(new URL(`../${row.path}`, import.meta.url));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(row.sha256);
      const sprite = decodeSprite(bytes);
      const mapping = nativeSpritePaletteMap(sprite, palette);
      expect(Array.from(mapping), row.name).toEqual(row.mapping);
      // Indexed rendering must preserve transparent pixels and original RGB
      // while allowing the shared bank colors to change independently.
      expect(Buffer.from(spriteFrameRGBA(sprite, 0, { mapping, colors: palette.colors })))
        .toEqual(Buffer.from(spriteFrameRGBA(sprite, 0)));
      if (sequence.black) {
        expect(spritePaletteData.sprites[row.name].map(index => spritePaletteData.colors[index]))
          .toEqual(Array.from({ length: sprite.palette.length / 4 - 1 }, (_, index) => Array.from(sprite.palette.slice(index * 4 + 4, index * 4 + 7))));
        const startupMapping = nativeSpritePaletteMap(sprite, startup);
        expect(startupMapping.includes(255), row.name).toBe(false);
        expect(Buffer.from(spriteFrameRGBA(sprite, 0, { mapping: startupMapping, colors: startup.colors })))
          .toEqual(Buffer.from(spriteFrameRGBA(sprite, 0)));
      }
    }
    expect(palette.used.map(index => [index, palette.colors[index]])).toEqual(sequence.entries);
  }
  expect(startup.used).toHaveLength(105);
  for (const c of fixture.cases) {
    const bytes = readFileSync(
      new URL(`../public/armageddon/sprites/${c.name}.spr`, import.meta.url),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);
    const sprite = decodeSprite(bytes);
    for (const { progress, ...bounds } of c.samples)
      expect(
        nativeSpriteBounds(sprite, progress),
        `${c.name}: ${progress}`,
      ).toEqual(bounds);
  }
});
