import worldLandscapeMemory from './fixtures/armageddon/world-landscape-memory.json' with {type:'json'};
import worldWormMemory from './fixtures/armageddon/world-worm-memory.json' with {type:'json'};
import controllerWormMemory from './fixtures/armageddon/controller-worm-memory.json' with {type:'json'};
import {nativeCreateTeamControllerAt} from '../src/armageddon/controller-create.js';
import wormMemoryPlacement from './fixtures/armageddon/worm-memory-placement.json' with {type:'json'};
import wormMemoryState from './fixtures/armageddon/worm-memory-state.json' with {type:'json'};
import wormMemorySpawn from './fixtures/armageddon/worm-memory-spawn.json' with {type:'json'};
import wormMemoryAnimation from './fixtures/armageddon/worm-memory-animation.json' with {type:'json'};
import wormMemory from './fixtures/armageddon/worm-memory.json' with {type:'json'};
import {nativeCreateWormAt} from '../src/armageddon/worm-create.js';
import physicsMemory from './fixtures/armageddon/physics-memory.json' with {type:'json'};
import {nativeCreatePhysicsAt,nativeRegisterPhysicsMemory} from '../src/armageddon/physics-memory.js';
import groupDispatch from './fixtures/armageddon/event-group-dispatch.json' with {type:'json'};
import {nativeDispatchEventGroupChildren} from '../src/armageddon/event-group.js';
import {nativeCreateTaskMemory,nativeRegisterTaskMemory,nativeSendTaskEventMemory} from '../src/armageddon/task-memory.js';
import {nativeSetGroupSubscription,nativeDispatchEventGroup} from '../src/armageddon/event-group.js';
import worldCreate from './fixtures/armageddon/world-create.json' with {type:'json'};
import {nativeInitializeWorld} from '../src/armageddon/world-create.js';
import matchCreate from './fixtures/armageddon/match-create.json' with {type:'json'};
import {nativeCreateMatchRootAt} from '../src/armageddon/match-create.js';
import matchResources from './fixtures/armageddon/match-resources.json' with {type:'json'};
import {nativeInitializeMatchResources} from '../src/armageddon/match-resources.js';
import finalizeSetup from './fixtures/armageddon/gameplay-finalize.json' with {type:'json'};
import {nativeFinalizeGameplaySetup} from '../src/armageddon/gameplay-finalize.js';
import {nativeCreatePanelImage,nativeCreatePanelText} from '../src/armageddon/panel-resources.js';
import panelSetup from './fixtures/armageddon/team-panel-setup.json' with {type:'json'};
import {nativeCreateTeamPanelTree} from '../src/armageddon/team-panel-setup.js';
import matchState from './fixtures/armageddon/match-state.json' with {type:'json'};
import {nativeInitializeMatchState} from '../src/armageddon/match-state.js';
import teamAccess from './fixtures/armageddon/team-access.json' with {type:'json'};
import {nativeInitializeTeamAccess} from '../src/armageddon/team-access.js';
import {nativeInitializeGameplayRecords} from '../src/armageddon/gameplay-setup.js';
import schemeWeapons from '../src/armageddon/scheme-weapons.js';
import capturedSchemeWeapons from '../src/armageddon/scheme-weapon-data.json' with {type:'json'};
import weaponInitialization from './fixtures/armageddon/weapon-initialization.json' with {type:'json'};
import {nativeInitializeWeaponRecords} from '../src/armageddon/weapon-initialization.js';
import {inflateSync} from 'node:zlib';
import weaponOverrides from './fixtures/armageddon/weapon-overrides.json' with {type:'json'};
import {nativeApplyWeaponOverrides} from '../src/armageddon/weapon-overrides.js';
import runtimeSchemes from '../src/armageddon/scheme-runtime.js';
import capturedRuntimeSchemes from '../src/armageddon/scheme-runtime-data.json' with {type:'json'};
import {nativeSetupLanguage} from '../src/armageddon/setup-language.js';
import {nativeSetupMusic} from '../src/armageddon/setup-metadata.js';
import weaponSettings from './fixtures/armageddon/weapon-settings.json' with {type:'json'};
import {nativeExpandWeaponSettings} from '../src/armageddon/weapon-settings.js';
import schemeEnvironment from './fixtures/armageddon/scheme-environment.json' with {type:'json'};
import {nativeExpandSchemeEnvironment} from '../src/armageddon/scheme-environment.js';
import speechSetup from './fixtures/armageddon/speech-setup.json' with {type:'json'};
import {nativeResolveSetupSpeech,nativeCountrySpeech} from '../src/armageddon/speech-setup.js';
import matchSetup from './fixtures/armageddon/match-setup.json' with {type:'json'};
import {nativeBuildInitialMatchSetup} from '../src/armageddon/match-setup.js';
import frontendRandom from './fixtures/armageddon/frontend-random.json' with {type:'json'};
import {NativeFrontendRandom} from '../src/armageddon/frontend-random.js';
import turnOrder from './fixtures/armageddon/setup-turn-order.json' with {type:'json'};
import {nativeInitializeSetupTurnOrder,nativeAdvanceSetupTurnOrder} from '../src/armageddon/setup-turn-order.js';
import teamSetup from './fixtures/armageddon/team-setup.json' with {type:'json'};
import {nativeBuildTeamSetup} from '../src/armageddon/team-setup.js';
import setupFixture from './fixtures/armageddon/inventory-setup.json' with {type:'json'};
import { nativeBuildInventorySetup, nativeSetupWeaponValue, nativeFindSetupTeam, nativePrepareInventoryScheme } from '../src/armageddon/inventory-setup.js';
import initialization from './fixtures/armageddon/inventory-initialization.json' with {type:'json'};
import { nativeInitializeInventory } from '../src/armageddon/inventory-initialization.js';
import { createHash } from 'node:crypto';
import bankFixture from './fixtures/armageddon/inventory-banks.json' with { type:'json' };
import { nativeInventorySet, nativeInventoryAdd, nativeInventorySpend, nativeInventoryAvailable } from '../src/armageddon/inventory.js';
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import {
  addNativeAmmo,
  spendNativeAmmo,
  availableNativeAmmo,
  addAmmo,
  spendAmmo,
} from "../src/armageddon/inventory.js";
import { ammoFor } from "../src/weapons.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/inventory.json", import.meta.url),
  ),
);

test("inventory and match setup match original x86 sequences", { tag: "@logic" }, () => {
  const wormActual=[],wormExpected=[];
  for(const c of [...wormMemory.cases,...wormMemoryAnimation.cases.map(c=>({...c,synchronized:true})),...wormMemorySpawn.cases.map(c=>({...c,synchronized:true,nativeSpawn:true})),...wormMemoryState.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true})),...wormMemoryPlacement.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true})),...controllerWormMemory.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true})),...worldWormMemory.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true})),...worldLandscapeMemory.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true}))]) {
    const owner=new Uint8Array(0x10000),heap=new Uint8Array(c.world?0x100000:c.controller?0x40000:0x10000),scene=new Uint8Array(0x20000),calls=[];
    const locate=at=>at>=0x2400000?[heap,at-0x2400000]:at>=0x2300000?[scene,at-0x2300000]:[owner,at-0x2000000];
    const memory={get:at=>{const [a,o]=locate(at);return new DataView(a.buffer).getUint32(o,true);},put:(at,v)=>{const [a,o]=locate(at);new DataView(a.buffer).setInt32(o,v,true);},byte:at=>{const [a,o]=locate(at);return a[o];},putByte:(at,v)=>{const [a,o]=locate(at);a[o]=v;},range:(at,len)=>{const [a,o]=locate(at);return a.subarray(o,o+len);}};
    if(c.world){const input=inflateSync(Buffer.from(c.input,'base64'));for(let i=0;i<input.length;i+=8)memory.put(input.readUInt32LE(i),input.readUInt32LE(i+4));}
    else for(const [at,value] of c.initialWords)memory.put(at,value);
    let cursor=0x2408000,attempts=0,portraitLabel=0xdeadbeef;
    const allocate=(kind,size,pool)=>{const value=kind==='allocate'&&size===0x164&&(c.bits&64)&&!c.synchronized?0:cursor;if(value)cursor+=(size+15)&~15;calls.push([kind,size,value,...(kind==='array'?[pool]:[])]);return value;};
    const host={allocate:size=>allocate('allocate',size),allocateArray:(size,pool)=>allocate('array',size,pool),free:at=>calls.push(['free',at]),
      randomSpawnWord:()=>{calls.push(['random']);return 0x12345678;},randomSpawn:r=>{calls.push(['randomSpawn',r]);return c.packed;},sideSpawn:side=>{calls.push(['sideSpawn',side]);return c.packed;},reserveSpawn:p=>calls.push(['reserve',p]),
      gravity:()=>{calls.push(['gravity']);return c.gravity;},fontHeight:(...args)=>{calls.push(['font',...args]);return 8;},
      placeWorm:(x,y)=>{calls.push(['place',x,y,memory.get(0x2000040)|0,memory.get(0x2000048)|0]);return ++attempts>=c.successAt;},
      changeState:c.nativeState?undefined:state=>calls.push(['state',state]),settlePhysics:c.synchronized?undefined:()=>calls.push(['settle']),animationMetadata:(renderer,id)=>{calls.push(['metadata',renderer,id]);return {rate:id%3?25<<16:0,loop:id%2,span:5+id%7};},
    };
    host.portraitLabel=at=>{calls.push(['label',at]);return 0x76543210+c.bits;};host.setPortraitLabel=value=>portraitLabel=value;
    if(c.nativePlacement){delete host.gravity;delete host.placeWorm;host.collisionOverlap=(...args)=>{calls.push(['overlap',...args]);return +(args[2]>=2+c.bits%4&&(args[3]===0x2007300||args[1]>=800));};}
    if(c.nativeSpawn)for(const key of ['randomSpawnWord','randomSpawn','sideSpawn','reserveSpawn'])delete host[key];
    if(!c.landscape)host.constructLandscape=(at,parent)=>{calls.push(['call',0x4d1f80,at,[parent]]);return at;};
    host.surfaceDimensions=at=>{calls.push(['dimensions',at]);return at===0x2007600?[1,c.bits%24]:[34+c.bits%3,18+c.bits%5];};
    host.readSurfacePixel=(at,x,y)=>{calls.push(['pixel',at,x,y]);return c.bits&1?y:y%7;};
    host.drawSurface=(...args)=>calls.push(['surface',...args]);
    host.call=(entry,at,args)=>{calls.push(['call',entry,at,args]);return at;};
    host.virtual=(at,method,args)=>{calls.push(['virtual',at,method,args]);if(method===0x20)memory.put(at+0x3b8,args[0]);};
    if(!c.world){nativeCreateTaskMemory(memory,0x2008000,0,host);memory.put(0x2008038,0x2300000);}
    if(c.world)nativeInitializeWorld(memory,0x2000000,0x2300000,0x23047a8,host);
    else if(c.controller)nativeCreateTeamControllerAt(memory,0x2000000,0x2008000,c.team,0x2001000,host);
    else nativeCreateWormAt(memory,0x2000000,0x2008000,c.team,c.worm,0x2001000,host);
    if(c.controller)expect(portraitLabel).toBe(c.portraitLabel);
    wormActual.push([createHash('sha256').update(owner).update(heap).update(scene).digest('hex'),calls]);wormExpected.push([c.sha256,c.calls]);
  }
  expect(wormActual).toEqual(wormExpected);
  const physicsActual=[],physicsExpected=[];
  for(const row of physicsMemory.cases) {
    const heap=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),owner=Uint8Array.from({length:0x3c},(_,i)=>(i*11+5)&255),scene=new Uint8Array(0x20000),calls=[];
    const locate=at=>at>=0x2400000?[heap,at-0x2400000]:at>=0x2300000?[scene,at-0x2300000]:[owner,at-0x2000000];
    const memory={get:at=>{const [a,o]=locate(at);return new DataView(a.buffer).getUint32(o,true);},put:(at,v)=>{const [a,o]=locate(at);new DataView(a.buffer).setInt32(o,v,true);},byte:at=>{const [a,o]=locate(at);return a[o];},putByte:(at,v)=>{const [a,o]=locate(at);a[o]=v;},range:(at,len)=>{const [a,o]=locate(at);return a.subarray(o,o+len);}};
    let cursor=0x2408000;
    const allocate=(kind,size,pool)=>{const value=cursor;cursor+=(size+15)&~15;calls.push([kind,size,value,...(kind==='array'?[pool]:[])]);return value;};
    const host={allocate:size=>allocate('allocate',size),allocateArray:(size,pool)=>allocate('array',size,pool),free:at=>calls.push(['free',at])};
    nativeCreateTaskMemory(memory,0x2000000,0,host);memory.put(0x2000038,0x2300000);
    memory.put(0x23007d4,0x2402000);scene[0x11ba0]=[0,1,100,255][row.shape];memory.put(0x2402000,0x2005000);memory.put(0x24023c0,0x2406000);
    for(let i=0;i<4;i++)memory.put(0x24063a4+i*4,0x12340000+i);
    for(const [base,storage] of [[0x2402018,0x2404000],[0x2402034+row.category*0x1c,0x2405000]]) {
      for(const [offset,value] of [[4,row.capacity],[12,row.count],[16,storage],[20,storage+256]])memory.put(base+offset,value);
      for(let i=0;i<row.count;i++)memory.put(storage+i*4,i%2?0x98760000+i:0);
    }
    nativeCreatePhysicsAt(memory,0x2400100,0x2000000,row.category,row.shape,host);
    memory.put(0x24001e8,row.all_index);memory.put(0x24001e4,row.category_index);
    nativeRegisterPhysicsMemory(memory,0x2402000,0x2400100,host);
    physicsActual.push([createHash('sha256').update(owner).update(heap).digest('hex'),calls]);physicsExpected.push([row.sha256,row.calls]);
  }
  expect(physicsActual).toEqual(physicsExpected);
  const accessPattern=Uint8Array.from({length:0x20000},(_,i)=>(i*17+5)&255);
  for(const row of groupDispatch.send_cases) {
    const bytes=new Uint8Array(0x8000),view=new DataView(bytes.buffer),calls=[];
    const memory={get:at=>at===0x2000030?0x2306000:view.getUint32(at-0x2300000,true),put:(at,v)=>view.setInt32(at-0x2300000,v,true)};
    groupDispatch.send_keys.forEach(([type,index],i)=>{
      const node=0x2301000+i*20,head=0x2306004+(((Math.imul(index,17)+type)|0)%256)*4;
      memory.put(node+4,memory.get(head));memory.put(node+8,type);memory.put(node+12,index);memory.put(node+16,0x2300000+i*256);memory.put(head,node);
    });
    const result=nativeSendTaskEventMemory(memory,0x2000000,0x12345678,...row.key,0x3e8,4,0xdeadbeef,(...args)=>{calls.push(args);return 0;});
    expect([result,calls]).toEqual([row.result,row.calls]);
  }
  const dispatchActual=[],dispatchExpected=[];
  for(const row of groupDispatch.cases) {
    const owner=Uint8Array.from({length:0xa0},(_,i)=>(i*7+3)&255),arena=new Uint8Array(0x8000),calls=[];
    const locate=at=>at>=0x2300000?[arena,at-0x2300000]:[owner,at-0x2000000];
    const memory={get:at=>{const [a,o]=locate(at);return new DataView(a.buffer).getUint32(o,true);},put:(at,v)=>{const [a,o]=locate(at);new DataView(a.buffer).setInt32(o,v,true);},byte:at=>{const [a,o]=locate(at);return a[o];}};
    for(let i=0;i<8;i++)memory.put(0x2300000+i*256,0x2308000);
    for(let i=0;i<row.count;i++) {
      memory.put(0x2304000+i*4,row.mask===1||row.mask===2&&i%2===0||row.mask===3&&i%2?0:0x2300000+i*256);
      memory.put(0x2305000+i*4,0x2300000+(7-i)*256);
    }
    memory.put(0x2000014,row.count);memory.put(0x2000018,0x2304000);owner[0x3c]=row.enabled;
    nativeDispatchEventGroupChildren(memory,0x2000000,0x12345678,0x3e8,4,0xdeadbeef,(...args)=>{
      calls.push(args);if(calls.length!==1)return;
      if(row.mode===1)memory.put(0x2000014,0);
      else if(row.mode===2)memory.put(0x2304004,0);
      else if(row.mode===3)memory.put(0x2000018,0x2305000);
      else if(row.mode===4){memory.put(0x2304000+row.count*4,0x2300700);memory.put(0x2000014,row.count+1);}
      else if(row.mode===5)memory.put(0x2000014,1);
    });
    dispatchActual.push([createHash('sha256').update(owner).update(arena).digest('hex'),calls]);dispatchExpected.push([row.sha256,row.calls]);
  }
  expect(dispatchActual).toEqual(dispatchExpected);
  const taskActual=[],taskExpected=[];
  for(const row of worldCreate.task_cases) {
    const heap=Uint8Array.from({length:0x40000},(_,i)=>(i*7+3)&255),view=new DataView(heap.buffer),calls=[];
    const memory={get:at=>view.getUint32(at-0x2400000,true),put:(at,v)=>view.setInt32(at-0x2400000,v,true),byte:at=>heap[at-0x2400000],putByte:(at,v)=>heap[at-0x2400000]=v};
    let cursor=0x2404000;
    const allocate=(kind,size,pool)=>{const value=cursor;cursor+=(size+15)&~15;calls.push([kind,size,value,...(kind==='array'?[pool]:[])]);return value;};
    const host={allocate:size=>allocate('allocate',size),allocateArray:(size,pool)=>allocate('array',size,pool),free:at=>calls.push(['free',at])};
    nativeCreateTaskMemory(memory,0x2400000,0,host);nativeRegisterTaskMemory(memory,0x2400000,20,0,host);
    for(let i=0;i<row.children;i++) {
      const at=0x2400400+i*64;nativeCreateTaskMemory(memory,at,0x2400000,host);nativeRegisterTaskMemory(memory,at,i%2?20:3,i%2?0:1,host);
    }
    taskActual.push([createHash('sha256').update(heap).digest('hex'),calls]);taskExpected.push([row.sha256,row.calls]);
  }
  expect(taskActual).toEqual(taskExpected);
  const groupActual=[],groupExpected=[];
  for(const row of worldCreate.event_cases) {
    const bytes=Uint8Array.from({length:0xa0},(_,i)=>(i*7+3)&255),calls=[];
    const memory={byte:at=>bytes[at-0x2400000],putByte:(at,v)=>bytes[at-0x2400000]=v};
    memory.putByte(0x2400000-0x3ac+row.event,row.initial);
    if(row.action>=0)nativeSetGroupSubscription(memory,0x2400000,row.event,row.action);
    nativeDispatchEventGroup(memory,0x2400000,0x12345678,row.event,4,0xdeadbeef,(...args)=>calls.push(args));
    groupActual.push([createHash('sha256').update(bytes).digest('hex'),calls]);groupExpected.push([row.sha256,row.calls]);
  }
  expect(groupActual).toEqual(groupExpected);
  const worldActual=[],worldExpected=[];
  for(const row of worldCreate.cases) {
    const scene=Uint8Array.from({length:0x20000},(_,i)=>(i*17+5)&255),heap=Uint8Array.from({length:0x40000},(_,i)=>(i*7+3)&255),calls=[];
    const locate=at=>at>=0x2400000?[heap,at-0x2400000]:[scene,at-0x2300000];
    const memory={get:at=>{const [a,o]=locate(at);return new DataView(a.buffer).getUint32(o,true);},put:(at,v)=>{const [a,o]=locate(at);new DataView(a.buffer).setInt32(o,v,true);},byte:at=>{const [a,o]=locate(at);return a[o];}};
    memory.putByte=(at,v)=>{const [a,o]=locate(at);a[o]=v;};
    memory.range=(at,length)=>{const [a,o]=locate(at);return a.subarray(o,o+length);};
    for(let team=0;team<6;team++)scene[0x543c+team*3000]=row.worms;
    scene[0x4886]=row.count;for(const [offset,value] of row.words)memory.put(0x2300000+offset,value);
    let cursor=0x2401000,allocation=0,portraitLabel=0xdeadbeef;
    nativeInitializeWorld(memory,0x2400000,0x2300000,0x23047a8,{
      allocate:size=>{const value=allocation++===row.failure?0:cursor;if(value)cursor+=(size+15)&~15;calls.push(['allocate',size,value]);return value;},
      allocateArray:(size,pool)=>{const value=cursor;cursor+=(size+15)&~15;calls.push(['array',size,value,pool]);return value;},
      free:at=>calls.push(['free',at]),
      portraitLabel:at=>{calls.push(['label',at]);return 0x76543210+row.count;},setPortraitLabel:value=>portraitLabel=value,
      fontHeight:(...args)=>{calls.push(['height',...args]);return 8+row.count;},
      virtual:(...args)=>calls.push(['virtual',...args]),
      constructLandscape:(at,parent)=>{calls.push(['call',0x4d1f80,at,[parent]]);return at;},
      constructWorm:(at,...args)=>{calls.push(['call',0x4d5a40,at,args]);return at;},
      call:(entry,at,args)=>{
        calls.push(['call',entry,at,args]);
        if(entry===0x4ed910)memory.put(at+0x38,args[0]);
        else if(entry===0x4b1ae0)memory.put(at+4,args[0]);
        else if(entry===0x4b2670){memory.put(at+0x28,args[0]);memory.put(at+0x24,args[1]);}
        return at;
      },
    });
    expect(portraitLabel).toBe(row.portrait_label);
    worldActual.push([createHash('sha256').update(heap).digest('hex'),createHash('sha256').update(scene).digest('hex'),calls]);worldExpected.push([row.sha256,row.scene_sha256,row.calls]);
  }
  expect(worldActual).toEqual(worldExpected);
  const resourceActual=[],resourceExpected=[];
  for(const row of [...matchResources.cases,...matchCreate.cases.map(row=>({...row,root:true}))]) {
    const scene=Uint8Array.from({length:0x20000},(_,i)=>(i*17+5)&255),heap=Uint8Array.from({length:row.root?0x40000:0x10000},(_,i)=>(i*7+3)&255),view=new DataView(heap.buffer),sv=new DataView(scene.buffer),calls=[];
    sv.setUint32(8,0x2000800,true);view.setUint32(0x38,0x2300000,true);
    if(row.root) {
      sv.setUint32(20,row.variant&1?0x2003000:0,true);
      for(const [offset,value] of row.words)sv.setInt32(offset,value,true);
      for(const [offset,value] of row.bytes)scene[offset]=value;
      for(let i=0x38;i<0x3c;i++)heap[i]=(i*7+3)&255;
    }
    for(const [offset,value] of row.shorts)sv.setInt16(offset,value,true);
    let cursor=0x2401000,allocation=0,portraitLabel=0xdeadbeef;
    const memory={put:(at,v)=>at>=0x2400000?view.setInt32(at-0x2400000,v,true):sv.setInt32(at-0x2300000,v,true),putByte:(at,v)=>heap[at-0x2400000]=v,
      get:at=>at>=0x2400000?view.getUint32(at-0x2400000,true):sv.getUint32(at-0x2300000,true),byte:at=>at>=0x2400000?heap[at-0x2400000]:scene[at-0x2300000]};
    const allocate=(kind,size,pool)=>{
      const value=kind==='allocate'&&allocation===row.failure?0:cursor;
      if(value)cursor+=(size+15)&~15;if(kind==='allocate')allocation++;
      calls.push([kind,size,value,...(kind==='array'?[pool]:[])]);return value;
    };
    const host={portraitLabel:at=>{calls.push(['label',at]);return 0x76543210+row.count;},setPortraitLabel:value=>portraitLabel=value,allocate:size=>allocate('allocate',size),allocateArray:(size,pool)=>allocate('array',size,pool),fontHeight:(...args)=>{calls.push(['height',...args]);return 8+row.count;}};
    const resourceHost={
      allocateResource:host.allocate,renderer:0x2000800,
      constructSurface:(at,...args)=>{nativeCreatePanelImage(memory,at,...args,host);memory.put(at,0x5249b0);},
      constructText:(at,...args)=>nativeCreatePanelText(memory,at,...args,host),
    };
    memory.range=(at,length)=>at>=0x2400000?heap.subarray(at-0x2400000,at-0x2400000+length):scene.subarray(at-0x2300000,at-0x2300000+length);
    if(row.root)nativeCreateMatchRootAt(memory,0x2400000,0x2300000,0x23047a8,{
      ...host,virtual:(...args)=>calls.push(['virtual',...args]),
      constructLandscape:(at,parent)=>{calls.push(['call',0x4d1f80,at,[parent]]);return at;},
      constructWorm:(at,...args)=>{calls.push(['call',0x4d5a40,at,args]);return at;},
      call:(entry,at,args)=>{calls.push(['call',entry,at,args]);if(entry===0x4ed910)memory.put(at+0x38,args[0]);else if(entry===0x4b1ae0)memory.put(at+4,args[0]);else if(entry===0x4b2670){memory.put(at+0x28,args[0]);memory.put(at+0x24,args[1]);}return at;},
      startMusic:(...args)=>calls.push(['music',...args]),
    });
    else nativeInitializeMatchResources(heap.subarray(0,0x28c),scene,resourceHost);
    if(row.root)expect(portraitLabel).toBe(row.portrait_label);
    resourceActual.push([createHash('sha256').update(heap).digest('hex'),createHash('sha256').update(scene).digest('hex'),calls]);
    resourceExpected.push([row.sha256,row.scene_sha256,row.calls]);
  }
  expect(resourceActual).toEqual(resourceExpected);
  const finalActual=[],finalExpected=[];
  for(const row of finalizeSetup.cases) {
    const scene=Uint8Array.from({length:0x20000},(_,i)=>(i*17+5)&255),heap=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),owner=new Uint8Array(0x10000),calls=[];
    const locate=at=>at>=0x2400000?[heap,at-0x2400000]:at>=0x2300000?[scene,at-0x2300000]:[owner,at-0x2000000];
    const memory={get:at=>{const [a,o]=locate(at);return new DataView(a.buffer).getUint32(o,true);},put:(at,v)=>{const [a,o]=locate(at);new DataView(a.buffer).setInt32(o,v,true);},byte:at=>{const [a,o]=locate(at);return a[o];},putByte:(at,v)=>{const [a,o]=locate(at);a[o]=v;}};
    scene[0x4886]=row.count;memory.put(0x2300008,0x2000800);memory.put(0x230000c,row.variant%2?0x2003100:0);
    memory.range=(at,length)=>{const [a,o]=locate(at);return a.subarray(o,o+length);};
    for(const [offset,value] of row.words)memory.put(0x2300000+offset,value);
    for(const [offset,value] of row.bytes)scene[offset]=value;
    const sceneView=new DataView(scene.buffer);
    for(const [offset,value] of row.shorts)sceneView.setInt16(offset,value,true);
    row.groups.forEach((g,i)=>scene[0x488b+i*3000]=g);
    for(let setting=1;setting<5;setting++)scene[0x11d70+setting]=row.variant&(1<<(setting-1))?255:0;
    for(const offset of [4,0x4c,0x294])memory.put(0x2000000+offset,0xdeadbeef);
    let cursor=0x2401000,allocation=0;
    const allocate=(kind,size,pool)=>{
      const value=kind==='allocate'&&allocation===row.failure?0:cursor;
      if(value)cursor+=(size+15)&~15;if(kind==='allocate')allocation++;
      calls.push([kind,size,value,...(kind==='array'?[pool]:[])]);return value;
    };
    nativeFinalizeGameplaySetup(memory,0x2000000,0x2300000,{
      allocate:size=>allocate('allocate',size),allocateArray:(size,pool)=>allocate('array',size,pool),
      fontHeight:(...args)=>{calls.push(['height',...args]);return 8+row.count;},
      resetScene:at=>calls.push(['reset',at]),
      initializeWorld:(at,...args)=>{calls.push(['world',at,...args]);memory.put(at+0x38,args[0]);},
      startMusic:(...args)=>calls.push(['music',...args]),
      send:(...args)=>calls.push(['send',...args]),
    });
    finalActual.push([createHash('sha256').update(heap).digest('hex'),createHash('sha256').update(scene).digest('hex'),[4,0x4c,0x294].map(o=>memory.get(0x2000000+o)),calls]);
    finalExpected.push([row.sha256,row.scene_sha256,row.owner,row.calls]);
  }
  expect(finalActual).toEqual(finalExpected);
  const imageActual=[],imageExpected=[];
  for(const row of panelSetup.image_cases) {
    const heap=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),view=new DataView(heap.buffer),calls=[];
    const memory={put:(at,v)=>view.setInt32(at-0x2400000,v,true),putByte:(at,v)=>heap[at-0x2400000]=v};
    nativeCreatePanelImage(memory,0x2400000,row.width,row.height,row.bits,{allocateArray:(size,pool)=>{calls.push(['array',size,0x2401000,pool]);return 0x2401000;}});
    imageActual.push([createHash('sha256').update(heap).digest('hex'),calls]);imageExpected.push([row.sha256,row.calls]);
  }
  expect(imageActual).toEqual(imageExpected);
  const panelActual=[],panelExpected=[];
  for(const row of panelSetup.cases) {
    const scene=new Uint8Array(0x20000),heap=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),view=new DataView(heap.buffer),calls=[];
    scene[0x4886]=row.count;const sceneView=new DataView(scene.buffer);sceneView.setUint32(8,0x2000800,true);
    row.groups.forEach((group,team)=>scene[0x488b+team*3000]=group);
    let cursor=0x2401000,allocation=0;
    const memory={byte:at=>scene[at-0x2300000],get:at=>at<0x2400000?sceneView.getUint32(at-0x2300000,true):view.getUint32(at-0x2400000,true),put:(at,value)=>at<0x2400000?sceneView.setInt32(at-0x2300000,value,true):view.setInt32(at-0x2400000,value,true)};
    memory.putByte=(at,value)=>heap[at-0x2400000]=value;
    const allocate=(kind,size,pool)=>{
      const value=kind==='allocate'&&allocation===row.failure?0:cursor;
      if(value)cursor+=(size+15)&~15;
      if(kind==='allocate')allocation++;
      calls.push([kind,size,value,...(kind==='array'?[pool]:[])]);return value;
    };
    nativeCreateTeamPanelTree(memory,0x2400000,0x2300000,{
      allocate:size=>allocate('allocate',size),allocateArray:(size,pool)=>allocate('array',size,pool),
      fontHeight:(...args)=>{calls.push(['height',...args]);return 8+row.count;},
    });
    panelActual.push([createHash('sha256').update(heap).digest('hex'),calls,createHash('sha256').update(scene).digest('hex')]);panelExpected.push([row.sha256,row.calls,row.scene_sha256]);
  }
  expect(panelActual).toEqual(panelExpected);
  const stateActual=[],stateExpected=[];
  for(const row of matchState.cases) {
    const scene=new Uint8Array(accessPattern),view=new DataView(scene.buffer),calls=[];
    for(const [offset,value] of row.words)view.setInt32(offset,value,true);
    for(const [offset,value] of row.bytes)scene[offset]=value;
    nativeInitializeMatchState(scene,mode=>calls.push(mode));
    stateActual.push([createHash('sha256').update(scene).digest('hex'),calls]);
    stateExpected.push([row.sha256,row.calls]);
  }
  expect(stateActual).toEqual(stateExpected);
  const accessActual=[],accessExpected=[];
  for(const row of teamAccess.cases) {
    const scene=new Uint8Array(accessPattern),counter=new Uint8Array([239,190,173,222]);
    for(const [offset,value] of row.writes)scene[offset]=value;
    nativeInitializeTeamAccess(scene,counter);
    accessActual.push([createHash('sha256').update(scene).digest('hex'),new DataView(counter.buffer).getUint32(0,true)]);
    accessExpected.push([row.sha256,row.counter]);
  }
  expect(accessActual).toEqual(accessExpected);
  expect(schemeWeapons.schemes).toEqual(capturedSchemeWeapons.schemes);
  for(const row of weaponInitialization.cases) {
    const memory=inflateSync(Buffer.from(row.input,'base64')),calls=[];
    nativeInitializeWeaponRecords(memory,method=>{
      calls.push(method);const index=method/4;
      let name=(row.variant%2?'Weapon':'Alternate')+String(index).padStart(3,'0');
      if(index%7===0)name='';if(index%11===0)name='X'.repeat(32);
      return new TextEncoder().encode(name+'\0');
    });
    expect(calls).toEqual(row.calls);
    expect(createHash('sha256').update(memory).digest('hex'),`initializer ${row.resource_id}/${row.variant}`).toBe(row.sha256);
  }
  for(const row of weaponOverrides.cases) {
    const memory=inflateSync(Buffer.from(row.input,'base64'));
    nativeApplyWeaponOverrides(memory);
    expect(createHash('sha256').update(memory).digest('hex'),`scheme ${row.resource_id} variant ${row.variant}`).toBe(row.sha256);
  }
  expect(runtimeSchemes.schemes.map(s=>({...s,bytes:[...s.bytes]}))).toEqual(capturedRuntimeSchemes.schemes);
  const localeActual=[],localeExpected=[];
  for(const [lcid,german,first,country,language,calls] of matchSetup.locale_cases) {
    const memory=new Uint8Array(8),view=new DataView(memory.buffer),seen=[];
    view.setUint32(0,0x11223344,true);view.setUint32(4,0xdeadbeef,true);
    const resource=german?Buffer.from(matchSetup.german_resource,'hex'):new TextEncoder().encode('Connection not initialized');
    const result=nativeSetupLanguage(memory,()=>{seen.push(['locale']);return lcid;},id=>{seen.push(['resource',id]);return resource;});
    localeActual.push([result,view.getUint32(0,true),view.getUint32(4,true),seen]);localeExpected.push([language,first,country,calls]);
  }
  expect(localeActual).toEqual(localeExpected);
  for(const row of matchSetup.music_cases) {
    const memory=Uint8Array.from({length:0xc6},(_,i)=>(i*11+5)&255),random=new NativeFrontendRandom(row.seed);
    nativeSetupMusic(memory,row.selection,90,row.enabled,random);
    expect(Buffer.from(memory).toString('hex')).toBe(row.memory);expect(random.state).toBe(row.state);
  }
  for(const row of weaponSettings.cases) {
    const memory=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),scheme=Uint8Array.from(Buffer.from(row.initial,'hex'));
    nativePrepareInventoryScheme(memory,scheme);memory[0xd42a]=0;
    nativeExpandWeaponSettings(memory,scheme.subarray(0x14,0xec));
    expect(Buffer.from(scheme).toString('hex')).toBe(row.prepared);
    expect(createHash('sha256').update(memory).digest('hex')).toBe(row.sha256);
  }
  for(const row of schemeEnvironment.cases) {
    const memory=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),descriptors=new Uint8Array(0xd0),view=new DataView(descriptors.buffer);
    view.setInt32(0xc8,row.handicap,true);view.setInt32(0xc0,-row.handicap,true);
    nativeExpandSchemeEnvironment(memory,row.scheme,descriptors);
    expect(createHash('sha256').update(memory).digest('hex')).toBe(row.sha256);
  }
  for(const row of matchSetup.cases) {
    const memory=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),inventory=new Uint8Array(0x2c14);
    const teamData=new Uint8Array(0x9000),frontend=teamData.subarray(0x2000),view=new DataView(frontend.buffer,frontend.byteOffset,frontend.byteLength);
    frontend.set(Uint8Array.from({length:0x7000},(_,i)=>(i*13+7)&255));
    for(const [offset,size,value] of row.writes) {
      if(size===1)view.setUint8(offset,value);else view.setInt32(offset,value,true);
    }
    frontend[0x1178]=68;
    const scheme=Uint8Array.from(Buffer.from(row.initial_scheme,'hex')),random=new NativeFrontendRandom();
    const descriptors=new Uint8Array(0x1d8);descriptors.fill(255,0xd0);
    const calls=[];let path=0,profile=row.initial_profile;
    const defaultSpeech=new Uint8Array(65);defaultSpeech.set(new TextEncoder().encode('English'));
    const music=Uint8Array.from({length:0xc6},(_,i)=>(i*11+5)&255);
    const localeState=new Uint8Array(8);
    const result=nativeBuildInitialMatchSetup(memory,inventory,scheme,teamData,{
      descriptors,random,music,drive:68,musicEnabled:row.music_enabled,
      displayFlags:row.display_flags,resolution:row.resolution,
      localeState,systemLocale:()=>{calls.push(['locale']);return row.lcid;},
      languageResource:id=>{calls.push(['resource',id]);return Buffer.from(row.resource,'hex');},
      readOption:(key,fallback)=>{calls.push(['option',key,fallback]);return row.options[key];},
      seedStorage:{time:()=>{calls.push(['time',row.clock]);return row.clock;},
        readSeed:fallback=>{calls.push(['read',fallback]);return profile??fallback;},
        writeSeed:value=>{calls.push(['write',value]);profile=value;}},
      handicapEnabled:()=>{calls.push(['handicap']);return row.handicap;},
      speechPath:cd=>{calls.push(['speech',cd]);return Buffer.from(row.paths[path++],'hex');},
      defaultSpeech,workingDirectory:new TextEncoder().encode('C:\\WORMS\0'),
      changeDirectory:bytes=>{
        const end=bytes.indexOf(0),value=Buffer.from(end===-1?bytes:bytes.subarray(0,end));
        calls.push(['directory',value.toString('hex')]);return row.directory_available||value.toString()==='C:\\WORMS'?0:1;
      },
    });
    expect(new DataView(localeState.buffer).getUint32(4,true)).toBe(row.country);
    expect(result>>>0).toBe(row.result);expect(Buffer.from(music).toString('hex')).toBe(row.music);
    expect(calls).toEqual(row.calls);expect(profile).toBe(row.profile);expect(random.state).toBe(row.random_state);
    expect(Buffer.from(scheme).toString('hex')).toBe(row.scheme);
    expect(createHash('sha256').update(memory).digest('hex')).toBe(row.sha256);
    expect(createHash('sha256').update(inventory).digest('hex')).toBe(row.inventory_sha256);
    const scene=Uint8Array.from({length:0x20000},(_,i)=>(i*17+5)&255),sceneView=new DataView(scene.buffer);
    sceneView.setUint32(0x1c,0x2600800,true);sceneView.setInt32(0x20,row.gameplay_mode,true);sceneView.setInt32(0x1b8ac,row.gameplay_tall,true);
    const counter=new Uint8Array([239,190,173,222]);
    nativeInitializeGameplayRecords(scene,memory,()=>new Uint8Array(1),counter);
    expect(new DataView(counter.buffer).getUint32(0,true)).toBe(row.team_counter);
    expect(createHash('sha256').update(scene).digest('hex')).toBe(row.gameplay_sha256);
    for(const [offset,value] of row.state_inputs)sceneView.setInt32(offset,value,true);
    const stateCalls=[];nativeInitializeMatchState(scene,mode=>stateCalls.push(mode));
    expect(stateCalls).toEqual(row.state_calls);
    expect(createHash('sha256').update(scene).digest('hex')).toBe(row.state_sha256);
    expect(createHash('sha256').update(memory).digest('hex')).toBe(row.sha256);

  }
  for(const row of frontendRandom.cases) {
    const memory=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255);
    for(const [offset,value] of row.writes)memory[offset]=value;
    const random=new NativeFrontendRandom();let profile=row.initial,calls=[];
    const host={time:()=>{calls.push(['time',row.clock]);return row.clock;},
      readSeed:fallback=>{calls.push(['read',fallback]);return profile??fallback;},
      writeSeed:value=>{calls.push(['write',value]);profile=value;}};
    for(const step of row.steps) {
      calls=[];
      const result=step.entry==='004190C0'?random.nextSeed(host):nativeInitializeSetupTurnOrder(memory,()=>random.nextSeed(host));
      expect(result).toBe(step.result);expect(calls).toEqual(step.calls);
      expect(profile).toBe(step.profile);expect(random.state).toBe(step.random_state);
      expect(createHash('sha256').update(memory).digest('hex')).toBe(step.sha256);
    }
  }
  for(const row of turnOrder.cases) {
    const memory=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255);
    for(const [offset,value] of row.writes)memory[offset]=value;
    let used=0;
    for(const step of row.steps) {
      if(step.entry==='00419840')nativeInitializeSetupTurnOrder(memory,()=>row.seeds[used++%row.seeds.length]);
      else nativeAdvanceSetupTurnOrder(memory);
      expect(used).toBe(step.seed_calls);
      expect(createHash('sha256').update(memory).digest('hex')).toBe(step.sha256);
    }
  }
  for(const row of speechSetup.countries) {
    const memory=new Uint8Array(80).fill(165);
    expect(nativeCountrySpeech(memory,4,row.country)).toBe(row.result);
    expect(Buffer.from(memory).toString('hex')).toBe(row.bytes);
  }
  for(const row of [...teamSetup.cases,...speechSetup.cases]) {
    const memory=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255);
    const frontend=Uint8Array.from({length:0x7000},(_,i)=>(i*13+7)&255),view=new DataView(frontend.buffer);
    for(const [offset,size,value] of row.writes) {
      if(size===1)view.setUint8(offset,value);else view.setInt32(offset,value,true);
    }
    const calls=[];let path=0;
    nativeBuildTeamSetup(memory,frontend,row.scheme,{
      handicapEnabled:()=>{calls.push(['handicap']);return row.handicap;},
      speechPath:cd=>{calls.push(['speech',cd]);return Buffer.from(row.paths[path++],'hex');},
    });
    if(row.speech_fallback) {
      const teamData=new Uint8Array(0x9000);teamData.set(frontend,0x2000);
      const defaultSpeech=new Uint8Array(65);defaultSpeech.set(new TextEncoder().encode('English'));
      nativeResolveSetupSpeech(memory,teamData,{
        defaultSpeech,speechPath:cd=>{calls.push(['speech',cd]);return Buffer.from(row.paths[path++],'hex');},
        workingDirectory:new TextEncoder().encode('C:\\WORMS\0'),
        changeDirectory:path=>{
          const end=path.indexOf(0),value=Buffer.from(end===-1?path:path.subarray(0,end));
          calls.push(['directory',value.toString('hex')]);return row.directory_available||value.toString()==='C:\\WORMS'?0:1;
        },
      });
    }
    if(memory[0xcd74])nativeInitializeSetupTurnOrder(memory,()=>{calls.push(['seed']);return 0xfedcba98;});
    nativeAdvanceSetupTurnOrder(memory);
    expect(calls).toEqual(row.calls);
    expect(createHash('sha256').update(memory).digest('hex')).toBe(row.sha256);
    const inventory=new Uint8Array(0x2c14);nativeInitializeInventory(inventory,memory.subarray(0x3c));
    expect(createHash('sha256').update(inventory).digest('hex')).toBe(row.inventory_sha256);
  }
  for(const row of setupFixture.preparations) {
    const template=setupFixture.cases[0],memory=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),view=new DataView(memory.buffer);
    for(const [offset,size,value] of template.writes) {
      if(size===1)view.setUint8(offset,value);else if(size===2)view.setUint16(offset,value,true);else view.setInt32(offset,value,true);
    }
    for(const [offset,name] of template.names)memory.set(new TextEncoder().encode(name+'\0'),offset);
    const state=Uint8Array.from(Buffer.from(row.initial,'hex'));
    nativePrepareInventoryScheme(memory,state);
    expect(Buffer.from(state).toString('hex')).toBe(row.prepared);
    const descriptors=new Uint8Array(0x1d8);descriptors.fill(255,0xd0);
    nativeBuildInventorySetup(memory,state.subarray(0x14,0xec),0,[],{descriptors,teamData:new Uint8Array(0x9000)});
    expect(createHash('sha256').update(memory).digest('hex')).toBe(row.setup_sha256);
    const inventory=new Uint8Array(0x2c14);nativeInitializeInventory(inventory,memory.subarray(0x3c));
    expect(createHash('sha256').update(inventory).digest('hex')).toBe(row.inventory_sha256);
  }
  for(const row of setupFixture.lookups) {
    const data=new Uint8Array(0x9000);
    for(const [offset,hex] of row.writes)data.set(Buffer.from(hex,'hex'),offset);
    const name=Buffer.from(row.name,'hex');
    expect(nativeFindSetupTeam(data,name)).toBe(row.results[0]);
    expect(nativeFindSetupTeam(data,name,true)).toBe(row.results[1]);
  }
  for(const row of setupFixture.cases) {
    const memory=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),view=new DataView(memory.buffer);
    for(const [offset,size,value] of row.writes) {
      if(size===1)view.setUint8(offset,value);else if(size===2)view.setUint16(offset,value,true);else view.setInt32(offset,value,true);
    }
    for(const [offset,name] of row.names)memory.set(new TextEncoder().encode(name+'\0'),offset);
    const descriptors=new Uint8Array(0x1d8),descriptorView=new DataView(descriptors.buffer);
    row.descriptors.forEach((record,i)=>record.forEach((value,j)=>descriptorView.setInt32(0xd0+i*12+j*4,value,true)));
    row.getter_results.forEach(([count,delay],slot)=>{
      expect(nativeSetupWeaponValue(descriptors,slot)).toBe(count);
      expect(nativeSetupWeaponValue(descriptors,slot,true)).toBe(delay);
    });
    const teamData=new Uint8Array(0x9000),teamView=new DataView(teamData.buffer);
    for(const [team,statsIndex,specialIndex] of row.team_records) {
      const name=new TextEncoder().encode('Team'+team+'\0');
      teamData.set(name,0xc30+statsIndex*0x39c);teamData[0xc41+statsIndex*0x39c]=1;
      teamData.set(name,0x379f+specialIndex*0xd7b);teamData[0x38c0+specialIndex*0xd7b]=1;
      row.saved[team].forEach((value,slot)=>teamView.setInt16(0x508+statsIndex*0x8e+slot*2,value,true));
      teamData[0x38c1+specialIndex*0xd7b]=row.specials[team];
    }
    nativeBuildInventorySetup(memory,row.scheme,row.preset,row.extras,{
      descriptors,
      teamData,
    });
    expect(createHash('sha256').update(memory).digest('hex')).toBe(row.sha256);
    const inventory=new Uint8Array(0x2c14);nativeInitializeInventory(inventory,memory.subarray(0x3c));
    expect(createHash('sha256').update(inventory).digest('hex')).toBe(row.inventory_sha256);
  }
  for(const row of initialization.cases) {
    const setup=new Uint8Array(0x10000),source=new DataView(setup.buffer);
    for(const [offset,size,value] of row.writes) {
      if(size===1)source.setUint8(offset,value);else source.setInt16(offset,value,true);
    }
    for(const [offset,name] of row.names)setup.set(new TextEncoder().encode(name+'\0'),offset);
    const memory=Uint8Array.from({length:0x2c14},(_,i)=>(row.fill+i%7)&255);
    nativeInitializeInventory(memory,setup);
    expect(createHash('sha256').update(memory).digest('hex')).toBe(row.sha256);
    for(const [team,slot,count] of row.availability)expect(nativeInventoryAvailable(memory,team,slot)).toBe(count);
  }
  const operations={set:nativeInventorySet,add:nativeInventoryAdd,spend:nativeInventorySpend,available:nativeInventoryAvailable};
  for(const row of bankFixture.cases) {
    const memory=new Uint8Array(0x2c14),view=new DataView(memory.buffer);
    for(const [offset,value] of row.writes)view.setInt32(offset,value,true);
    for(const step of row.steps) {
      const [name,...args]=step.operation,result=operations[name](memory,...args);
      if(name==='available')expect(result).toBe(step.result);
      expect(createHash('sha256').update(memory).digest('hex')).toBe(step.sha256);
    }
  }
  for (const v of fixture.vectors) {
    const result =
      v.operation === "add"
        ? addNativeAmmo(v.count, v.amount)
        : v.operation === "spend"
          ? spendNativeAmmo(v.count)
          : availableNativeAmmo(v.count, v.delay, v.bypass);
    expect(result, JSON.stringify(v)).toBe(v.result);
  }
  expect(fixture.vectors).toHaveLength(120);
  expect(addAmmo(Infinity, 1)).toBe(Infinity);
  expect(spendAmmo(Infinity)).toBe(Infinity);
  expect(ammoFor({ shotgun: -1 }, "shotgun")).toBe(Infinity);
  expect(ammoFor({ rocket: 0 }, "rocket")).toBe(0);
});

test("unlimited shotgun survives both shots and remains selectable", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.evaluate(() => window.siege.debug.setAmmo(0, "shotgun", -1));
  await page.locator("#inventory-toggle").click();
  // Special weapons share the expanded arsenal panel.
  const shotgun = page.locator('[data-weapon="shotgun"]');
  await expect(shotgun).toBeEnabled();
  await expect(shotgun.locator("small")).toHaveText("∞");
  await shotgun.click();
  // Fire into clear sky: a nearby terrain hit can injure the shooter and
  // correctly cancel the second shot, independently of unlimited ammunition.
  await page.locator("#angle").fill("90");
  await page.locator("#fire").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().shotgunRemaining))
    .toBe(1);
  expect(
    await page.evaluate(() => window.siege.getState().ammo[0].shotgun),
  ).toBe(-1);
  await page.locator("#fire").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().shotgunRemaining))
    .toBe(0);
  expect(
    await page.evaluate(() => window.siege.getState().ammo[0].shotgun),
  ).toBe(-1);
});
