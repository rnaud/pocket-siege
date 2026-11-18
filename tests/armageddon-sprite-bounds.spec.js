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

import streamedLifecycle from './fixtures/armageddon/streamed-sprite-lifecycle.json' with {type:'json'};
import {nativeCreateStreamedSprite,nativeDestroyStreamedSprite} from '../src/armageddon/streamed-sprite.js';

import spriteBitmap from './fixtures/armageddon/sprite-bitmap.json' with {type:'json'};
import {nativeSelectSpriteFrame,nativePrepareSpriteBitmap} from '../src/armageddon/sprite-bitmap.js';

import indexedBlits from './fixtures/armageddon/indexed-bitmap-blit.json' with {type:'json'};
import {nativeBlitIndexedBitmap} from '../src/armageddon/indexed-bitmap-blit.js';

import streamedDraws from './fixtures/armageddon/streamed-sprite-draw.json' with {type:'json'};
import {nativeSelectStreamedSpriteFrame,nativeBlitRendererSurface} from '../src/armageddon/streamed-sprite-draw.js';

import rendererStreamedDraws from './fixtures/armageddon/renderer-streamed-draw.json' with {type:'json'};

import rendererBlend from './fixtures/armageddon/renderer-blend.json' with {type:'json'};
import {nativeBuildRendererBlendTable} from '../src/armageddon/renderer-blend.js';
import {nativeAddGamePaletteColor} from '../src/armageddon/game-palette-memory.js';

import rendererBitmapDraw from './fixtures/armageddon/renderer-bitmap-draw.json' with {type:'json'};
import {nativeDrawRendererBlendedBitmap} from '../src/armageddon/renderer-bitmap-draw.js';

import rendererSpriteDraw from './fixtures/armageddon/renderer-sprite-draw.json' with {type:'json'};
import {nativeDrawRendererSprite} from '../src/armageddon/renderer-sprite-draw.js';

import rendererSpriteCache from './fixtures/armageddon/renderer-sprite-cache.json' with {type:'json'};

test("worm frame bounds retain the native canvas-center anchor across animation", { tag: "@logic" }, () => {
  for(const c of rendererSpriteDraw.cases) {
    const owner=0x2000000,arena=Buffer.alloc(0x20000,c.pattern),scratch=Buffer.alloc(24);
    const memory={get:p=>p>=0x2100000?scratch.readUInt32LE(p-0x2100000):arena.readUInt32LE(p-owner),put:(p,v)=>p>=0x2100000?scratch.writeUInt32LE(v>>>0,p-0x2100000):arena.writeUInt32LE(v>>>0,p-owner),byte:p=>arena[p-owner],putByte:(p,v)=>{arena[p-owner]=v;}};
    for(const [offset,value] of [[0,owner+0x4000],[20,-2],[24,1],[28,19],[32,30],[36,12],[40,6],[0x30,3],[0x460,owner+0x1200],[0x2864+7*4,owner+0x16000],[0x48,owner+0x4100],[0x454,c.locked],[0x458,owner+0x1000],[0x14b2c,0]])memory.put(owner+offset,value);
    memory.put(owner+0x406c,0x2200100);
    for(const target of [owner+0x4100,owner+0x4200])memory.put(target,owner+0x4300);
    memory.put(owner+0x4358,0x2200200);memory.put(owner+0x4364,0x2200300);
    for(const [bitmap,pixels,width,height,pitch,clip] of [[owner+0x1000,owner+0x2000,20,14,24,[1,1,19,13]],[owner+0x18000,owner+0x19000,16,12,16,[2,1,14,10]],[owner+0x1200,owner+0x3800,32,16,32,[0,0,32,16]]])
      for(const [offset,value] of [[0,0x5249b0],[4,1],[8,pixels],[12,8],[16,pitch],[20,width],[24,height],[28,clip[0]],[32,clip[1]],[36,clip[2]],[40,clip[3]]])memory.put(bitmap+offset,value);
    for(let i=0;i<1024;i++) {
      memory.putByte(owner+0x2000+i,i%5===0?0:(i*13+7)&255);
      memory.putByte(owner+0x19000+i,i%3===0?0:(i*17+3)&255);
    }
    for(let d=0;d<256;d++)for(let s=0;s<256;s++)memory.putByte(owner+0x4b2c+d*256+s,(s*3+d*5)&255);
    const sprite=owner+0x16000;
    for(const [offset,value] of [[8,32],[10,16],[12,c.pattern&3],[14,3],[16,0]])arena.writeUInt16LE(value,sprite-owner+offset);
    for(const [offset,value] of [[20,owner+0x17000],[32,owner+0x18000],[40,owner+0x19000]])memory.put(sprite+offset,value);
    [[-4,-3,8,5],[2,1,13,8],[1,-2,14,8]].forEach((rect,i)=>{memory.put(owner+0x17000+i*12,i*160);rect.forEach((v,j)=>arena.writeInt16LE(v,0x17000+i*12+4+j*2));});
    const snapshot=()=>createHash('sha256').update(arena).digest('hex'),events=[];let waits=0;
    const host={
      waitRenderer(renderer){events.push(['wait',renderer,snapshot()]);waits++;if(c.mutate&&waits===3)memory.put(owner+0x48,owner+0x4100);return waits%2;},
      describeSurface(target){events.push(['describe',target,108,snapshot()]);if(c.mutate)memory.put(owner+0x48,owner+0x4200);return {width:20,height:14,pitch:24};},
      lockSurface(target,rect,flags,event){events.push(['lock',target,rect,108,flags,event,snapshot()]);return {status:0,pixels:owner+0x2000};},
    };
    nativeDrawRendererSprite(memory,owner,4<<16,3<<16,c.encoded,c.progress,0x2100000,host);
    expect(events).toEqual(c.events);expect(snapshot()).toBe(c.state);
  }
  for(const c of rendererBitmapDraw.cases) {
    const owner=0x2000000,arena=Buffer.alloc(0x20000,c.pattern);
    const memory={get:p=>arena.readUInt32LE(p-owner),put:(p,v)=>arena.writeUInt32LE(v>>>0,p-owner),byte:p=>arena[p-owner],putByte:(p,v)=>{arena[p-owner]=v;}};
    for(const [offset,value] of [[0,owner+0x4000],[20,-2],[24,1],[28,19],[32,30],[0x48,owner+0x4100],[0x454,c.locked],[0x458,owner+0x1000],[0x14b2c,0]])memory.put(owner+offset,value);
    memory.put(owner+0x406c,0x2200100);
    for(const target of [owner+0x4100,owner+0x4200])memory.put(target,owner+0x4300);
    memory.put(owner+0x4358,0x2200200);memory.put(owner+0x4364,0x2200300);
    for(const [bitmap,pixels,width,height,clip] of [[owner+0x1000,owner+0x2000,20,14,[1,1,19,13]],[owner+0x1100,owner+0x3000,16,12,[2,1,14,10]]])
      for(const [offset,value] of [[0,0x5249b0],[4,1],[8,pixels],[12,8],[16,24],[20,width],[24,height],[28,clip[0]],[32,clip[1]],[36,clip[2]],[40,clip[3]]])memory.put(bitmap+offset,value);
    for(let i=0;i<1024;i++) {
      memory.putByte(owner+0x2000+i,i%5===0?0:(i*13+7)&255);
      memory.putByte(owner+0x3000+i,i%3===0?0:(i*17+3)&255);
    }
    for(let d=0;d<256;d++)for(let s=0;s<256;s++)memory.putByte(owner+0x4b2c+d*256+s,(s*3+d*5)&255);
    const snapshot=()=>createHash('sha256').update(arena).digest('hex'),events=[];let waits=0;
    const host={
      waitRenderer(renderer){events.push(['wait',renderer,snapshot()]);waits++;if(c.mutate&&waits===3)memory.put(owner+0x48,owner+0x4100);return waits%2;},
      describeSurface(target){events.push(['describe',target,108,snapshot()]);if(c.mutate)memory.put(owner+0x48,owner+0x4200);return {width:20,height:14,pitch:24};},
      lockSurface(target,rect,flags,event){events.push(['lock',target,rect,108,flags,event,snapshot()]);return {status:c.failed,pixels:owner+0x2000};},
    };
    nativeDrawRendererBlendedBitmap(memory,owner,...c.rect,owner+0x1100,4,3,c.flags,host);
    expect(events).toEqual(c.events);expect(snapshot()).toBe(c.state);
  }
  for(const c of rendererBlend.cases) {
    const owner=0x2000000,arena=Buffer.alloc(0x20000,c.pattern);
    const memory={get:p=>arena.readUInt32LE(p-owner),put:(p,v)=>arena.writeUInt32LE(v>>>0,p-owner),byte:p=>arena[p-owner],putByte:(p,v)=>{arena[p-owner]=v;}};
    for(let bank=0;bank<8;bank++)memory.put(owner+0x4ae4+bank*4,0);
    for(const {bank,first,colors} of c.palettes) {
      const palette=owner+0x16000+bank*0x1000;
      nativeCreateGamePalette(memory,palette,first,first+colors.length-1);
      for(const color of colors)nativeAddGamePaletteColor(memory,palette,color);
      memory.put(owner+0x4ae4+bank*4,palette);memory.put(palette+0xb14,123);
    }
    memory.put(owner+0x14b2c,c.dirty);
    const snapshot=()=>createHash('sha256').update(arena).digest('hex');
    expect(snapshot()).toBe(c.initial);
    nativeBuildRendererBlendTable(memory,owner);
    expect(snapshot()).toBe(c.state);
    if(c.draws.length) {
      const destination=owner+0x1000,source=owner+0x1100;
      for(const [bitmap,pixels,width,height,clip] of [[destination,owner+0x2000,20,14,[1,1,19,13]],[source,owner+0x3000,16,12,[2,1,14,10]]])
        for(const [offset,value] of [[0,0x5249b0],[4,1],[8,pixels],[12,8],[16,24],[20,width],[24,height],[28,clip[0]],[32,clip[1]],[36,clip[2]],[40,clip[3]]])memory.put(bitmap+offset,value);
      for(let i=0;i<1024;i++) {
        memory.putByte(owner+0x2000+i,i%5===0?0:(i*13+7)&255);
        memory.putByte(owner+0x3000+i,i%3===0?0:(i*17+3)&255);
      }
      for(const draw of c.draws) {
        expect(nativeBlitIndexedBitmap(memory,destination,-3,-2,11,7,source,4,3,owner+0x4b2c,1|draw.reflection)).toBe(draw.result);
        expect(snapshot()).toBe(draw.state);
      }
    }
  }
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
  for(const c of streamedLifecycle.cases) {
    const owner=0x2000000,sprite=owner+0x1000,renderer=owner+0x2000,table=owner+0x3000,alternate=owner+0x4000,bytes=Buffer.alloc(0x10000,c.pattern);
    const memory={get:p=>bytes.readUInt32LE(p-owner),put:(p,v)=>bytes.writeUInt32LE(v>>>0,p-owner),byte:p=>bytes[p-owner],putByte:(p,v)=>{bytes[p-owner]=v;}};
    const snapshot=()=>createHash('sha256').update(bytes).digest('hex');
    nativeCreateStreamedSprite(memory,sprite,renderer);expect(snapshot()).toBe(c.initial);
    memory.put(sprite+112,table);bytes.writeInt16LE(c.count,sprite-owner+106);
    for(const at of [table,alternate])for(let i=0;i<3;i++)memory.put(at+i*12+8,i!==1?owner+0x5000+i*32:0);
    const events=[],result=nativeDestroyStreamedSprite(memory,sprite,c.flags,{
      releaseSpriteSurface(renderer,slot){events.push(['surface',renderer,slot,snapshot()]);memory.put(slot,0);if(c.mutate)memory.put(sprite+112,alternate);},
      freeArray(pointer){events.push(['array',pointer,snapshot()]);},
      freeSized(pointer,size){events.push(['free',pointer,size,snapshot()]);},
    });
    expect({events,result,state:snapshot()}).toEqual({events:c.events,result:c.result,state:c.state});
  }
  for(const c of [...spriteBitmap.cases,...rendererSpriteCache.cases]) {
    const owner=0x2000000,source=0x2400000,sprite=owner+0x3000,bitmap=owner+0x4000,buffer=owner+0x8000;
    const scratch=Buffer.alloc(24),bytes=Buffer.alloc(c.dispatch?0x60000:0x40000,c.pattern),raw=c.path?readFileSync(new URL(`../${c.path}`,import.meta.url)):Buffer.from(c.raw,'hex'),data=Buffer.from(raw),counters=Buffer.alloc(16),cacheCounters=Buffer.alloc(8),pointer=Buffer.alloc(4);
    expect(createHash('sha256').update(raw).digest('hex')).toBe(c.sha256);
    const region=p=>p>=source?[data,p-source]:p>=0x2100000?[scratch,p-0x2100000]:p>=owner?[bytes,p-owner]:p>=0x7d54e8?[cacheCounters,p-0x7d54e8]:p>=0x5602e4?[counters,p-0x5602e4]:[pointer,p-0x55e3c4];
    const memory={get(p){const [b,o]=region(p);return b.readUInt32LE(o);},put(p,v){const [b,o]=region(p);b.writeUInt32LE(v>>>0,o);},byte(p){const [b,o]=region(p);return b[o];},putByte(p,v){const [b,o]=region(p);b[o]=v;}};
    [0xfffffff0,17,0xfffffff0,23].forEach((v,i)=>counters.writeUInt32LE(v,i*4));cacheCounters.writeUInt32LE(0xfffffff0,0);cacheCounters.writeUInt32LE(123,4);
    memory.put(0x55e3c4,buffer);memory.put(buffer,0x5266a0);memory.put(buffer+4,owner+0x10000);memory.put(buffer+8,c.capacity);
    for(const offset of [12,16,20,24,28])memory.put(buffer+offset,0);
    for(const [offset,value] of [[0,0x5249b0],[4,1],[8,owner+0x20000],[12,8],[16,192],[20,192],[24,192],[28,5],[32,3],[36,187],[40,189]])memory.put(owner+0x6000+offset,value);
    const renderer=owner+0x40000;
    if(c.dispatch) {
      memory.put(owner+0x6000+36,123);
      for(const [offset,value] of [[20,5],[24,3],[28,123],[32,189],[36,96],[40,96],[0x30,3],[0x454,1],[0x458,owner+0x6000],[0x460,owner+0x7000],[0x14b2c,0],[0x2864+7*4,sprite]])memory.put(renderer+offset,value);
      for(const [offset,value] of [[0,0x5249b0],[4,1],[8,owner+0x30000],[12,8],[16,192],[20,192],[24,192],[28,0],[32,0],[36,192],[40,192]])memory.put(owner+0x7000+offset,value);
      for(let d=0;d<256;d++)for(let s=0;s<256;s++)memory.putByte(renderer+0x4b2c+d*256+s,(s*3+d*5)&255);
    }
    nativeCreateGamePalette(memory,owner,1,c.last);nativeCreateSprite(memory,sprite,0x497b20,0x497ba0);nativeReadSprite(memory,sprite,owner,source,{allocate:()=>bitmap});
    const snapshot=()=>createHash('sha256').update(bytes).update(data).update(counters).update(cacheCounters).digest('hex');
    expect(snapshot()).toBe(c.initial);
    for(const step of c.steps) {
      if(c.dispatch) {
        nativeDrawRendererSprite(memory,renderer,4<<16,3<<16,step.encoded,step.progress,0x2100000,{});
        expect(snapshot(),`${c.path}, cache ${c.capacity}, progress ${step.progress}, flags ${step.encoded}`).toBe(step.state);
        continue;
      }
      expect(nativeSelectSpriteFrame(memory,sprite,step.progress,Array.from({length:6},(_,i)=>owner+0x5000+i*4))).toBe(step.selected);
      expect(snapshot()).toBe(step.selected_state);
      expect(nativePrepareSpriteBitmap(memory,sprite)).toBe(step.result);
      expect(snapshot(),`${c.path}, cache ${c.capacity}, progress ${step.progress}`).toBe(step.state);
      const drawn=(memory.get(sprite+56)|0)>0&&(memory.get(sprite+60)|0)>0?nativeBlitIndexedBitmap(memory,owner+0x6000,step.x,24,memory.get(sprite+56),memory.get(sprite+60),bitmap,0,0,0,step.flags):0;
      expect(drawn).toBe(step.drawn);
      expect(snapshot()).toBe(step.drawn_state);
    }
  }
  const blend=Buffer.from(Array.from({length:65536},(_,i)=>((i&255)*3+(i>>>8)*5)&255));
  for(const c of indexedBlits.cases) {
    const owner=0x2000000,destination=owner+0x1000,source=owner+0x1100,bytes=Buffer.alloc(0x10000,165);
    const region=p=>p>=0x2500000?[blend,p-0x2500000]:[bytes,p-owner];
    const memory={get(p){const [b,o]=region(p);return b.readUInt32LE(o);},put(p,v){const [b,o]=region(p);b.writeUInt32LE(v>>>0,o);},byte(p){const [b,o]=region(p);return b[o];},putByte(p,v){const [b,o]=region(p);b[o]=v;}};
    for(const [bitmap,pixels,width,height,clip] of [[destination,owner+0x2000,20,14,[1,1,19,13]],[source,c.alias?owner+0x2020:owner+0x3000,16,12,[2,1,14,10]]])
      for(const [offset,value] of [[0,0x5249b0],[4,1],[8,pixels],[12,8],[16,24],[20,width],[24,height],[28,clip[0]],[32,clip[1]],[36,clip[2]],[40,clip[3]]])memory.put(bitmap+offset,value);
    for(let i=0;i<1024;i++){bytes[0x2000+i]=i%5===0?0:(i*13+7)&255;bytes[0x3000+i]=i%3===0?0:(i*17+3)&255;}
    const result=nativeBlitIndexedBitmap(memory,destination,...c.rect,source,4,3,c.table?0x2500000:0,c.mode|c.reflection);
    expect({result,state:createHash('sha256').update(bytes).digest('hex')},JSON.stringify(c)).toEqual({result:c.result,state:c.state});
  }
  for(const c of [...streamedDraws.cases,...rendererStreamedDraws.cases]) {
    const owner=0x2000000,sprite=owner+0x1000,renderer=owner+0x2000,table=owner+0x3000,target=owner+0x4000,alternate=owner+0x4100,vtable=owner+0x5000;
    const outputs=Array.from({length:6},(_,i)=>owner+0x6000+i*4),bytes=Buffer.alloc(0x10000,c.pattern);
    const scratch=Buffer.alloc(24),region=p=>p>=0x2100000?[scratch,p-0x2100000]:[bytes,p-owner];
    const memory={get(p){const [b,o]=region(p);return b.readUInt32LE(o);},put(p,v){const [b,o]=region(p);b.writeUInt32LE(v>>>0,o);},byte(p){const [b,o]=region(p);return b[o];},putByte(p,v){const [b,o]=region(p);b[o]=v;}};
    const snapshot=()=>createHash('sha256').update(bytes).digest('hex');
    for(const [offset,value] of [[104,c.flags],[106,3],[108,c.pattern?-161:160],[110,c.pattern?-81:80]])bytes.writeInt16LE(value,sprite-owner+offset);
    memory.put(sprite+112,table);
    [[-4,-3,12,9],[2,1,14,8],[1,-2,13,10]].forEach((rect,i)=>{rect.forEach((v,j)=>bytes.writeInt16LE(v,table-owner+i*12+j*2));memory.put(table+i*12+8,owner+0x7000+i*64);});
    for(const [offset,value] of [[20,0],[24,0],[28,20],[32,16],[0x48,target],[0x454,c.locked]])memory.put(renderer+offset,value);
    memory.put(target,vtable);memory.put(alternate,vtable);memory.put(vtable+0x80,0x2200100);memory.put(vtable+0x1c,0x2200200);
    if(c.dispatch){memory.put(renderer+36,c.pattern?-80:80);memory.put(renderer+40,c.pattern?-40:40);memory.put(renderer+0x2864+7*4,0);memory.put(renderer+0x38e4+7*4,sprite);}
    let selected;
    if(!c.dispatch){selected=nativeSelectStreamedSpriteFrame(memory,sprite,c.progress,outputs);expect(selected).toBe(c.selected);expect(snapshot()).toBe(c.selection);}
    const events=[];
    const host={
      unlockSurface(surface,flags){events.push(['unlock',surface,flags,snapshot()]);if(c.mutate){memory.put(renderer+0x48,alternate);memory.put(renderer+0x454,99);}},
      blitSurface(surface,x,y,source,rect,flags){events.push(['blit',surface,x,y,source,rect,flags,snapshot()]);},
    };
    if(c.dispatch)nativeDrawRendererSprite(memory,renderer,4<<16,3<<16,c.encoded,c.progress,0x2100000,host);
    else nativeBlitRendererSurface(memory,renderer,[-3,5,30,19][c.flags],c.locked?-2:3,memory.get(outputs[0]),memory.get(outputs[1]),selected,memory.get(outputs[4]),memory.get(outputs[5]),c.flags,host);
    expect({events,state:snapshot()}).toEqual({events:c.events,state:c.state});
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
