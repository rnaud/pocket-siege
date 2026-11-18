import terrainLoad from './fixtures/armageddon/terrain-load.json' with {type:'json'};
import imageDecompress from './fixtures/armageddon/image-decompress.json' with {type:'json'};
import {nativeDecodeImagePixels} from '../src/armageddon/image-decompress.js';
import terrainImage from './fixtures/armageddon/terrain-image.json' with {type:'json'};
import {nativeLoadTerrainImage} from '../src/armageddon/terrain-image.js';
import terrainFile from './fixtures/armageddon/terrain-file.json' with {type:'json'};
import {nativeLoadTerrainFile} from '../src/armageddon/terrain-file.js';
import sceneGraphics from './fixtures/armageddon/scene-graphics.json' with {type:'json'};
import {nativePrepareSceneGraphics} from '../src/armageddon/scene-graphics.js';
import {nativeCreateSceneContext} from '../src/armageddon/scene-context.js';
import missionSelection from './fixtures/armageddon/mission-selection.json' with {type:'json'};
import missionNames from '../src/armageddon/mission-names.json' with {type:'json'};
import {resolveMissionDefinition,missionFileServices} from '../src/armageddon/mission-files.js';
import {resolveOriginalMapId} from '../src/armageddon/maps.js';
import {nativeSelectMission,nativeSelectTraining} from '../src/armageddon/mission-selection.js';
import missionResources from './fixtures/armageddon/mission-resources.json' with {type:'json'};
import {nativeMissionThumbnail,nativeMissionTerrainPath,nativeMissionWinningCondition,nativeMissionSelection,nativeMissionTitle,nativeMissionBriefing} from '../src/armageddon/mission-resources.js';
import {nativeClearMatchTeamRecords,nativeInitializeMatchTeamRecords} from '../src/armageddon/match-team-records.js';
import filePalette from './fixtures/armageddon/file-palette.json' with {type:'json'};
import {nativeLoadFilePalette,nativeGetFilePaletteEntries,nativeDestroyFilePalette} from '../src/armageddon/file-palette.js';
import missionNativePalette from './fixtures/armageddon/mission-scene-context.json' with {type:'json'};
import setupBitmap from './fixtures/armageddon/setup-bitmap.json' with {type:'json'};
import {nativeLoadSetupBitmap} from '../src/armageddon/setup-bitmap.js';
import {nativeCountryFlag,nativeLoadSetupFlag} from '../src/armageddon/team-flags.js';
import missionNativeFlags from './fixtures/armageddon/mission-native-flags.json' with {type:'json'};
import missionNativeScheme from './fixtures/armageddon/mission-native-scheme.json' with {type:'json'};
import {nativeSelectSetupScheme,originalSchemeResource} from '../src/armageddon/scheme-selection.js';
import missionLoad from './fixtures/armageddon/mission-load.json' with {type:'json'};
import {nativeLoadMission,nativeLoadGlobalMission,nativePrepareGlobalMission} from '../src/armageddon/mission-load.js';
import missionTeams from './fixtures/armageddon/mission-teams.json' with {type:'json'};
import {nativeLoadMissionTeams} from '../src/armageddon/mission-teams.js';
import missionWorms from './fixtures/armageddon/mission-worms.json' with {type:'json'};
import {nativeLoadMissionWorms} from '../src/armageddon/mission-worms.js';
import stringResources from '../src/armageddon/string-resources.json' with {type:'json'};
import {originalResourceStringBytes} from '../src/armageddon/string-resources.js';
import missionOwner from './fixtures/armageddon/mission-owner.json' with {type:'json'};
import {nativeCreateMissionOwner} from '../src/armageddon/mission-owner.js';
import missionEvents from './fixtures/armageddon/mission-events.json' with {type:'json'};
import {nativeLoadMissionEvents} from '../src/armageddon/mission-events.js';
import missionInventory from './fixtures/armageddon/mission-inventory.json' with {type:'json'};
import missionInventoryFields from '../src/armageddon/mission-inventory-keys.json' with {type:'json'};
import {nativeLoadMissionInventory} from '../src/armageddon/mission-inventory.js';
import missionOptions from './fixtures/armageddon/mission-options.json' with {type:'json'};
import {nativeLoadMissionScheme,nativeLoadMissionOptions} from '../src/armageddon/mission-options.js';
import runtimeActorDestroy from './fixtures/armageddon/runtime-actor-destroy.json' with {type:'json'};
import eventBuffer from './fixtures/armageddon/event-buffer.json' with {type:'json'};
import {nativeAppendSceneEvent,nativeResetEventBuffer,nativeEventBufferCount,nativeEventBufferUsage,nativeConsumeEventRecord,nativeCopyEventBuffer,nativeContainsEventRecord,nativeReadSceneEvent} from '../src/armageddon/scene-buffers.js';
import fullSceneLifecycle from './fixtures/armageddon/full-scene-lifecycle.json' with {type:'json'};
import {nativeDestroyOfflineScene} from '../src/armageddon/scene-shutdown.js';
import fullOfflineScene from './fixtures/armageddon/full-offline-scene.json' with {type:'json'};
import {nativeInitializeOfflineScene} from '../src/armageddon/scene-startup.js';
import fullSceneRecords from './fixtures/armageddon/full-scene-records.json' with {type:'json'};
import fullSceneDisplay from './fixtures/armageddon/full-scene-display.json' with {type:'json'};
import {nativeInitializeSceneDisplay} from '../src/armageddon/scene-display.js';
import fullOfflinePanels from './fixtures/armageddon/full-offline-panels.json' with {type:'json'};
import {nativeCreateOfflineScenePanels,nativeDestroyOfflineScenePanels} from '../src/armageddon/scene-offline-panels.js';
import fullSceneLayout from './fixtures/armageddon/full-scene-layout.json' with {type:'json'};
import {nativeCreateInitialSceneLayout,nativeDestroyInitialScenePools} from '../src/armageddon/scene-layout.js';
import fullSceneBuffers from './fixtures/armageddon/full-scene-buffers.json' with {type:'json'};
import {nativeCreateInitialSceneBuffers,nativeDestroyInitialSceneBuffers} from '../src/armageddon/scene-buffers.js';
import fullSceneServices from './fixtures/armageddon/full-scene-services.json' with {type:'json'};
import {nativeCreateInitialSceneServices,nativeDestroyInitialSceneServices} from '../src/armageddon/scene-services.js';
import fullEnvironmentLifecycle from './fixtures/armageddon/full-environment-lifecycle.json' with {type:'json'};
import fullStartupTeardown from './fixtures/armageddon/full-startup-teardown.json' with {type:'json'};
import {nativeDestroyTeamPanelTree} from '../src/armageddon/team-panel-destroy.js';
import fullWorldDestroy from './fixtures/armageddon/full-world-destroy.json' with {type:'json'};
import {nativeDestroyWorldTaskMemory} from '../src/armageddon/world-destroy.js';
import fullControllerDestroy from './fixtures/armageddon/full-controller-destroy.json' with {type:'json'};
import {nativeDestroyTeamControllerMemory} from '../src/armageddon/worm-destroy.js';
import fullObjectDestroy from './fixtures/armageddon/full-object-destroy.json' with {type:'json'};
import {nativeDestroyMineMemory,nativeDestroyBarrelMemory} from '../src/armageddon/object-destroy.js';
import physicsDestroy from './fixtures/armageddon/physics-destroy.json' with {type:'json'};
import {nativeDestroyPhysicsMemory,nativeDestroyEnvironmentMemory} from '../src/armageddon/physics-destroy.js';
import taskDestroy from './fixtures/armageddon/task-destroy.json' with {type:'json'};
import {nativeDestroyTaskMemory} from '../src/armageddon/task-destroy.js';
import fullStartupCleanup from './fixtures/armageddon/full-startup-cleanup.json' with {type:'json'};
import taskCleanup from './fixtures/armageddon/task-cleanup.json' with {type:'json'};
import physicsCompact from './fixtures/armageddon/physics-compact.json' with {type:'json'};
import fullStartupDispatch from './fixtures/armageddon/full-startup-dispatch.json' with {type:'json'};
import fullStartupSettings from './fixtures/armageddon/full-startup-settings.json' with {type:'json'};
import fullStartupMemory from './fixtures/armageddon/full-startup-memory.json' with {type:'json'};
import fullMatchRootMemory from './fixtures/armageddon/full-match-root-memory.json' with {type:'json'};
import worldPresentationMemory from './fixtures/armageddon/world-presentation-memory.json' with {type:'json'};
import worldSceneryMemory from './fixtures/armageddon/world-scenery-memory.json' with {type:'json'};
import worldMineMemory from './fixtures/armageddon/world-mine-memory.json' with {type:'json'};
import worldBarrelMemory from './fixtures/armageddon/world-barrel-memory.json' with {type:'json'};
import worldObjectsMemory from './fixtures/armageddon/world-objects-memory.json' with {type:'json'};
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
import {nativeCreatePhysicsAt,nativeRegisterPhysicsMemory,nativeCompactPhysicsMemory,nativeCreateEnvironmentMemory} from '../src/armageddon/physics-memory.js';
import groupDispatch from './fixtures/armageddon/event-group-dispatch.json' with {type:'json'};
import {nativeDispatchEventGroupChildren} from '../src/armageddon/event-group.js';
import {nativeCreateTaskMemory,nativeRegisterTaskMemory,nativeSendTaskEventMemory,nativeCleanupTaskMemory} from '../src/armageddon/task-memory.js';
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
import {nativeInitializeGameplayRecords,nativeInitializeSceneGameplayRecords} from '../src/armageddon/gameplay-setup.js';
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
import {nativeInitializeMatchSetup} from '../src/armageddon/match-setup.js';
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
  for(const c of imageDecompress.cases) {
    const owner=0x2000000,bytes=Buffer.alloc(0x10000,c.pattern),palette=owner+0x100,source=owner+0x2000,destination=owner+0x8000;
    for(let i=0;i<256;i++)bytes[0x100+i]=(c.mapping===0?i:c.mapping===1?255-i:i*37)&255;
    const prefix=Buffer.from(Array.from({length:2048},(_,i)=>i%128));
    const encoded=c.length?c.distance-1:c.distance;
    const stream=Buffer.concat([prefix,Buffer.from([0x80|(c.length<<3)|(encoded>>>8),encoded&255]),Buffer.from(c.length?[]:[c.extra]),Buffer.from([0x80,0])]);
    stream.copy(bytes,source-owner);
    nativeDecodeImagePixels({byte:a=>bytes[a-owner],putByte:(a,v)=>{bytes[a-owner]=v;}},destination,source,palette);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(c.sha256);
  }
  for(const c of [...terrainImage.cases,...terrainLoad.cases]) {
    const owner=0x2000000,scratch=0x2100000,compressed=0x714be0;
    const bytes=Buffer.alloc(0x10000,c.pattern),temporary=Buffer.alloc(0x43c,c.pattern),packed=Buffer.alloc(0x1000,c.pattern),calls=[];
    const locate=a=>a>=scratch?[temporary,a-scratch]:a>=owner?[bytes,a-owner]:[packed,a-compressed];
    const memory={get:a=>{const [b,o]=locate(a);return b.readUInt32LE(o);},put:(a,v)=>{const [b,o]=locate(a);b.writeUInt32LE(v>>>0,o);},byte:a=>{const [b,o]=locate(a);return b[o];},putByte:(a,v)=>{const [b,o]=locate(a);b[o]=v;}};
    const snapshot=()=>createHash('sha256').update(bytes).update(packed).digest('hex');
    const mapping=a=>{const [b,o]=locate(a);return b.subarray(o,o+256).toString('hex');};
    const stream=Buffer.from(c.stream,'hex');let cursor=c.composed?0:5,colorIndex=0,bitmap=owner+0x1000;
    const host={
      openFile:(path,mode)=>{calls.push(['open',path,mode,snapshot()]);return 0x1234;},
      closeFile:file=>calls.push(['close',file,snapshot()]),
      tellFile:file=>{calls.push(['tell',file,snapshot()]);return cursor;},
      readFile:(dest,n,count,file)=>{
        calls.push(['read',dest>=scratch?'scratch':dest,n,count,file,snapshot()]);
        const chunk=stream.subarray(cursor,cursor+n*count);cursor+=chunk.length;
        const [b,o]=locate(dest);chunk.copy(b,o);return n?Math.floor(chunk.length/n):0;
      },
      addPaletteColor:(...args)=>{calls.push(['color',...args,snapshot()]);return ++colorIndex+10;},
      allocate:n=>{calls.push(['allocate',n,snapshot()]);if(c.composed){bitmap+=0x40;return bitmap;}return owner;},
      constructBitmap:(bitmap,width,height,bits)=>{calls.push(['construct',bitmap,width,height,bits,snapshot()]);memory.put(bitmap+4,width);memory.put(bitmap+8,height);memory.put(bitmap+12,bits);},
      bitmapStorage:bitmap=>{calls.push(['storage',bitmap,snapshot()]);return c.composed?{pixels:owner+0x2000+(bitmap-owner-0x1000)/0x40*0x400,bits:memory.get(bitmap+12),pitch:Math.floor((memory.get(bitmap+4)*memory.get(bitmap+12)+31)/32)*4}:{pixels:owner+0x1000,bits:c.bits,pitch:c.pitch};},
      remapBitmap:(bitmap,map)=>calls.push(['remap',bitmap,mapping(map),snapshot()]),
    };
    if(c.nativeBitmaps) {
      delete host.constructBitmap;delete host.bitmapStorage;delete host.remapBitmap;
      host.allocateArray=(size,pool)=>{calls.push(['array',size,pool,snapshot()]);return owner+0x2000+(bitmap-owner-0x1000)/0x40*0x400;};
    }
    const result=c.composed?nativeLoadTerrainFile(memory,owner+0x800,0x4567,{values:[owner,owner+4,owner+8],positions:owner+0x100,images:[owner+0x10,owner+0x14,owner+0x18],names:[owner+0x400,owner+0x600]},scratch,host):nativeLoadTerrainImage(memory,0x4567,0x1234,scratch,host);
    expect(result).toBe(c.result);
    expect(calls).toEqual(c.calls);expect(snapshot()).toBe(c.sha256);
  }
  for(const c of terrainFile.cases) {
    const owner=0x2000000,scratch=0x2100000,bytes=Buffer.alloc(0x10000,c.pattern),temporary=Buffer.alloc(20),calls=[];
    const locate=a=>a>=scratch?[temporary,a-scratch]:[bytes,a-owner];
    const memory={get:a=>{const [b,o]=locate(a);return b.readUInt32LE(o);},put:(a,v)=>{const [b,o]=locate(a);b.writeUInt32LE(v>>>0,o);},putByte:(a,v)=>{const [b,o]=locate(a);b[o]=v;}};
    memory.put(owner+8,0);
    const snapshot=()=>createHash('sha256').update(bytes).digest('hex');
    const stream=Buffer.from(c.stream,'hex');let cursor=0,imageIndex=0;
    const host={
      openFile:(path,mode)=>{calls.push(['open',path,mode,snapshot()]);return c.variant===4?0:0x1234;},
      readFile:(dest,n,count,file)=>{
        calls.push(['read',dest>=scratch?'scratch':dest,n,count,file,snapshot()]);
        const chunk=stream.subarray(cursor,cursor+n*count);cursor+=chunk.length;
        const [b,o]=locate(dest);chunk.copy(b,o);return n?Math.floor(chunk.length/n):0;
      },
      loadTerrainImage:(...args)=>{calls.push(['image',...args,snapshot()]);return c.images[imageIndex++];},
      closeFile:file=>calls.push(['close',file,snapshot()]),
    };
    expect(nativeLoadTerrainFile(memory,owner+0x800,0x4567,{values:[owner,owner+4,owner+8],positions:owner+0x100,images:[owner+0x10,owner+0x14,owner+0x18],names:[owner+0x400,owner+0x600]},scratch,host)).toBe(c.result);
    expect(calls).toEqual(c.calls);expect(snapshot()).toBe(c.sha256);
  }
  for(const c of sceneGraphics.cases) {
    const owner=0x2000000,scene=0x2300000,frontend=0x2500000,services=0x2600000;
    const ownerBytes=Buffer.alloc(0x10000,c.pattern),sceneBytes=Buffer.alloc(0x20000,c.pattern),frontendBytes=Buffer.alloc(0x10000,c.pattern),serviceBytes=Buffer.alloc(0x10000,c.pattern),calls=[];
    const locate=a=>a>=services?[serviceBytes,a-services]:a>=frontend?[frontendBytes,a-frontend]:a>=scene?[sceneBytes,a-scene]:[ownerBytes,a-owner];
    const memory={get:a=>{const [b,o]=locate(a);return b.readUInt32LE(o);},put:(a,v)=>{const [b,o]=locate(a);b.writeUInt32LE(v>>>0,o);},byte:a=>{const [b,o]=locate(a);return b[o];},putByte:(a,v)=>{const [b,o]=locate(a);b[o]=v;}};
    const source=c.offset===null?frontend:scene+0x47a8+c.offset;
    for(let i=0;i<0xdc64;i++)memory.putByte(source+i,(i*13+c.variant*37)&255);
    for(const address of [services,services+0x200])memory.put(address,services+0x800);
    for(const [offset,target] of [[4,0x2200100],[0x44,0x2200200],[0x60,0x2200300],[0x14,0x2200400]])memory.put(services+0x800+offset,target);
    const snapshot=()=>createHash('sha256').update(ownerBytes).update(sceneBytes).update(frontendBytes).update(serviceBytes).digest('hex');
    let allocations=0,colorIndex=10;
    const host={
      initializePalette:(...args)=>{calls.push(['palette',...args,snapshot()]);if(c.mutation)memory.put(source+0x100,0x12345678);},
      allocate:(...args)=>{calls.push(['allocate',...args,snapshot()]);allocations++;if(c.mutation&&allocations===1)memory.put(source+0x104,0x87654321);return allocations===1?scene:services+0x1000;},
      openGraphicsArchive:(...args)=>{calls.push(['archive',...args,snapshot()]);return 1;},
      initializePaletteBanks:(...args)=>{calls.push(['banks',...args,snapshot()]);if(c.mutation)memory.putByte(source+0xde,7);},
      loadStartupFonts:(...args)=>calls.push(['fonts',...args,snapshot()]),
      loadEffects:(...args)=>{calls.push(['effects',...args,snapshot()]);if(c.mutation)memory.put(scene+12,services+0x500);},
      loadSpeech:(...args)=>calls.push(['speech',...args,snapshot()]),
      addPaletteColor:(...args)=>{calls.push(['color',...args,snapshot()]);return ++colorIndex;},
      rendererDimensions:(...args)=>{calls.push(['dimensions',...args,snapshot()]);if(c.mutation)memory.put(scene+8,services+0x200);return [c.width,c.height];},
      clearRendererRect:(...args)=>calls.push(['clear',...args,snapshot()]),
      presentRenderer:(...args)=>calls.push(['present',...args,snapshot()]),
      getRendererPalette:(...args)=>{calls.push(['getPalette',...args,snapshot()]);return services+0x600;},
    };
    expect(nativeCreateSceneContext(memory,owner,c.bindings,source,host)).toBe(scene);
    nativePrepareSceneGraphics(memory,owner,source,c.bindings[1],host);
    expect({calls,sha256:snapshot()}).toEqual({calls:c.calls,sha256:c.sha256});
  }
  expect(Object.keys(missionNames)).toHaveLength(48);
  for(const [name,source] of Object.entries(missionNames)) {
    const record=resolveMissionDefinition(`D:\\DATA\\${name.toUpperCase().replaceAll('/','\\')}`);
    expect(record.source).toBe(source);
    expect(resolveMissionDefinition(`mission/${source}`)).toBe(record);
    const owner=0x2000000,bytes=Buffer.alloc(0x10000),strings=new Map(),messages=[];
    const memory={get:a=>bytes.readUInt32LE(a-owner),put:(a,v)=>bytes.writeUInt32LE(v>>>0,a-owner),byte:()=>68};
    nativeCreateMissionOwner(memory,owner,{initializeString:a=>memory.put(a,0),time:()=>0,seedRandom:()=>{}});
    const host={...missionFileServices({
      assignString:(address,value)=>{memory.put(address,owner+0x1000);strings.set(owner+0x1000,value);},
      readString:address=>strings.get(address),
    }),messageBox:(...args)=>messages.push(args)};
    const [,kind,number]=name.match(/^mission\/(mission|training)(\d+)\.wam$/);
    const result=kind==='mission'?nativeSelectMission(memory,owner,Number(number),123,host):nativeSelectTraining(memory,owner,Number(number),host);
    expect(result).toBe(0);expect(messages).toEqual([]);
    expect(resolveMissionDefinition(strings.get(memory.get(owner+0x880)))).toBe(record);
    host.profileInt=(section,key,fallback,filename)=>{
      const selected=resolveMissionDefinition(strings.get(filename));
      const value=selected.sections.find(s=>s.name.toLowerCase()===section.toLowerCase())?.entries.find(([k])=>k.toLowerCase()===key.toLowerCase())?.[1];
      return value===undefined?fallback:parseInt(value,10);
    };
    expect(resolveOriginalMapId(nativeMissionTerrainPath(memory,owner,host))).not.toBeNull();
    if(name==='mission/training16.wam') {
      //Original resource tables point this definition at blank placeholders.
      expect(nativeMissionTitle(memory,owner,host)).toBe('  ');
      expect(nativeMissionBriefing(memory,owner,host)).toBe(' ');
    } else {
      expect(nativeMissionTitle(memory,owner,host).trim().length).toBeGreaterThan(0);
      expect(nativeMissionBriefing(memory,owner,host).trim().length).toBeGreaterThan(0);
    }
    if(name==='mission/mission1.wam')expect(nativeMissionTitle(memory,owner,host)).toBe('Operation Market Garden. ');
    memory.put(owner+0x884,7);memory.put(owner+0x54,-1);
    expect(nativeSelectMission(memory,owner,999,0,host)).toBe(-1);
    expect(memory.get(owner+0x884)).toBe(7);
  }
  expect(resolveMissionDefinition('C:\\data\\mission\\mission999.wam')).toBeNull();
  expect(resolveMissionDefinition('other/mission1.wam')).toBeNull();
  for(const c of missionSelection.cases) {
    const owner=0x2000000, bytes=Buffer.alloc(0x10000,0xa5),calls=[];let drive=68;
    const memory={get:a=>bytes.readUInt32LE(a-owner),put:(a,v)=>bytes.writeUInt32LE(v>>>0,a-owner),byte:()=>drive};
    const snapshot=()=>createHash('sha256').update(bytes).update(Buffer.from([drive])).digest('hex');
    const change=base=>{for(const [offset,v] of [[0x884,base+1],[0x54,base+2],[0x87c,base+3]])memory.put(owner+offset,v);};
    const file={};
    const host={
      createFile:()=>{calls.push(['create',snapshot()]);if(c.mutation)drive=90;return file;},
      assignString:(address,path)=>{calls.push(['assign',address,path,snapshot()]);memory.put(address,owner+0x1000);bytes.write(path+'\0',0x1000,'latin1');},
      openFile:(handle,...args)=>{expect(handle).toBe(file);calls.push(['open',...args,snapshot()]);if(c.mutation)change(80);return c.success;},
      closeFile:handle=>{expect(handle).toBe(file);calls.push(['close',snapshot()]);if(c.mutation)change(90);},
      destroyFile:handle=>{expect(handle).toBe(file);calls.push(['destroy',snapshot()]);},
      messageBox:(...args)=>calls.push(['message',...args,snapshot()]),
    };
    const result=c.entry==='0043E710'?nativeSelectMission(memory,owner,c.selection,c.score,host):nativeSelectTraining(memory,owner,c.selection,host);
    expect({result,calls,sha256:snapshot()}).toEqual({result:c.result,calls:c.calls,sha256:c.sha256});
  }
  for(const c of missionResources.cases) {
    const owner=0x2000000, fields=new Map([[owner+0x884,c.mission],[owner+0x54,c.training],[owner+0x880,owner+0x1000],[0x6e1178,68]]),calls=[];
    if(['0043E620','0043E7F0'].includes(c.entry)) {
      for(let offset=0;offset<0x800;offset+=4)fields.set(owner+offset,0x4000+offset);
      fields.set(owner+0x54,c.training);
    }
    const memory={get:address=>fields.get(address)>>>0,byte:address=>fields.get(address)};
    const host={loadText:resource=>{calls.push(['string',resource]);return `resource:${resource}`;},profileInt:(...args)=>{
      calls.push(args);
      if(c.mutation){fields.set(owner+0x884,c.mission===-1?0:-1);fields.set(0x6e1178,90);fields.set(owner+0x880,owner+0x1100);}
      return c.value;
    }};
    const fn={'00441E50':nativeMissionThumbnail,'00441F10':nativeMissionTerrainPath,'00442000':nativeMissionWinningCondition,'00442020':nativeMissionSelection,'0043E620':nativeMissionTitle,'0043E7F0':nativeMissionBriefing}[c.entry];
    expect({result:fn(memory,owner,host),calls}).toEqual({result:c.result,calls:c.calls});
  }
  for(const c of missionNativePalette.teamClearCases) {
    const bytes=Buffer.alloc(0x10000,c.pattern),messages=[];
    const result=nativeClearMatchTeamRecords({put:(address,value)=>bytes.writeUInt32LE(value>>>0,address-0x2900000)},0x2908000,c.bank,{messageBox:(...args)=>messages.push(['message',...args])});
    expect({result,messages,sha256:createHash('sha256').update(bytes).digest('hex')}).toEqual({result:c.result,messages:c.messages,sha256:c.sha256});
  }
  for(const c of missionNativePalette.teamRecordCases) {
    const bytes=Buffer.alloc(0x30000,c.pattern),base=0x6da000;
    const memory={get:address=>bytes.readUInt32LE(address-base),put:(address,value)=>bytes.writeUInt32LE(value>>>0,address-base),byte:address=>bytes[address-base],putByte:(address,value)=>{bytes[address-base]=value;}};
    for(let team=0;team<7;team++) {
      const source=0x6e179f+team*0xd7b;
      bytes.set(Uint8Array.from({length:17},(_,i)=>(team*29+i*7+3)&255),source-base);
      memory.putByte(source+0x121,(c.mask&(1<<team))?1:0);memory.putByte(source+0x95,[0,1,8,127,128,255,2][team]);
    }
    memory.putByte(0x6e6880,c.count);nativeInitializeMatchTeamRecords(memory);
    expect(createHash('sha256').update(bytes).update(Buffer.alloc(0x10000)).digest('hex')).toBe(c.sha256);
  }
  for(const c of [...filePalette.cases,...filePalette.destroyCases.map(c=>({...c,destroyOnly:true}))]) {
    const heap=Buffer.alloc(0x10000,c.pattern),calls=[];
    const memory={get:address=>heap.readUInt32LE(address-0x2000000),put:(address,value)=>heap.writeUInt32LE(value>>>0,address-0x2000000),byte:address=>heap[address-0x2000000],putByte:(address,value)=>{heap[address-0x2000000]=value;}};
    const snapshot=()=>createHash('sha256').update(heap).digest('hex');
    let allocated=0,entries=Buffer.alloc(1024);
    const host={
      device:()=>c.destroyOnly&&!c.present?0:0x2300000,
      openFile(...args){calls.push(['openFile',...args,snapshot()]);return c.missing?0:0x5678;},
      allocate(...args){calls.push(['allocate',...args,snapshot()]);return 0x2001000+(allocated++)*0x2000;},
      free(...args){calls.push(['free',...args,snapshot()]);},
      seekFile(...args){calls.push(['seekFile',...args,snapshot()]);},
      readFile(...args){calls.push(['readFile',...args,snapshot()]);const bytes=Buffer.from(Uint8Array.from({length:1068},(_,i)=>(i*19+7)&255));bytes.writeUInt16LE(c.bits,14);heap.set(bytes.subarray(0,c.amount),args[0]-0x2000000);return c.amount;},
      closeFile(...args){calls.push(['closeFile',...args,snapshot()]);},
      createPalette(device,flags,bytes,dest,outer){entries=Buffer.from(bytes);calls.push(['createPalette',device,flags,entries.toString('hex'),dest,outer,snapshot()]);memory.put(dest,0x2300200);return c.createResult;},
      getPaletteEntries(handle,flags,first,count,dest){calls.push(['getPaletteEntries',handle,flags,first,count,dest,snapshot()]);heap.set(entries.subarray(first*4,(first+count)*4),dest-0x2000000);return -123;},
      releasePalette(...args){calls.push(['releasePalette',...args,snapshot()]);},
    };
    if(c.destroyOnly) {
      memory.put(0x2000000,c.empty?0:0x2003000);memory.put(0x2003404,0x2300200);memory.put(0x200340c,c.refs);
      expect(nativeDestroyFilePalette(memory,0x2000000,host)).toBe(c.result);
    } else {
      expect(nativeLoadFilePalette(memory,0x2000000,'fixture.bmp',host)).toBe(c.result);
      expect([snapshot(),calls.length]).toEqual([c.loaded,c.loadCalls]);
      expect(nativeGetFilePaletteEntries(memory,memory.get(0x2000000),0x2005000,0,256,host)).toBe(c.access);
      expect([snapshot(),calls.length]).toEqual([c.accessed,c.accessCalls]);
      expect(nativeDestroyFilePalette(memory,0x2000000,host)).toBe(c.destroyed);
    }
    expect({calls,sha256:snapshot()},JSON.stringify(c)).toEqual({calls:c.calls,sha256:c.sha256});
  }
  for(const bitmap of Object.values(missionNativePalette.bitmaps)) {
    const path=`../public/armageddon/media/${bitmap.source.slice(5).toLowerCase()}`;
    expect(createHash('sha256').update(fs.readFileSync(new URL(path,import.meta.url))).digest('hex')).toBe(bitmap.sha256);
  }
  for(const c of setupBitmap.cases) {
    const owner=Buffer.from(Uint8Array.from({length:0x10000},(_,i)=>(i*13+5)&255)),source=Buffer.from(Uint8Array.from({length:0x10000},(_,i)=>(i*7+11)&255)),calls=[];
    const locate=address=>address>=0x2300000?[source,address-0x2300000]:[owner,address-0x2000000];
    const memory={get:address=>{const [b,o]=locate(address);return b.readUInt32LE(o);},put:(address,value)=>{const [b,o]=locate(address);b.writeUInt32LE(value>>>0,o);},byte:address=>{const [b,o]=locate(address);return b[o];},putByte:(address,value)=>{const [b,o]=locate(address);b[o]=value;}};
    const snapshot=()=>createHash('sha256').update(owner).digest('hex');
    const result=nativeLoadSetupBitmap(memory,'fixture.bmp',0x2001004,0x2008000,c.width,c.height,{
      loadImage(...args){calls.push(['loadImage',...args,snapshot()]);return c.fail?0:0x1234;},
      getBitmap(...args){calls.push(['getBitmap',...args,snapshot()]);return {width:c.bitmapWidth,height:c.bitmapHeight,stride:c.stride,bits:c.overlap?0x2001000:0x2300000};},
      deleteImage(...args){calls.push(['deleteImage',...args,snapshot()]);},
      openPalette(...args){calls.push(['openPalette',...args,snapshot()]);return 0x5678;},
      readPalette(...args){calls.push(['readPalette',...args,snapshot()]);for(let i=0;i<1024;i++)memory.putByte(args[1]+i,(i*19+7)&255);},
      closePalette(...args){calls.push(['closePalette',...args,snapshot()]);},
    });
    expect({result,calls,sha256:snapshot()},JSON.stringify(c)).toEqual({result:c.result,calls:c.calls,sha256:c.sha256});
  }
  for(const c of missionNativeFlags.countryCases) {
    const buffer=new Uint8Array(65).fill(c.pattern);
    expect(nativeCountryFlag(buffer,c.country)).toBe(c.result);
    expect(Buffer.from(buffer).toString('hex')).toBe(c.bytes);
  }
  for(const c of missionNativeFlags.flagCases) {
    const globals=Buffer.alloc(0x30000),owner=Buffer.alloc(0x10000),calls=[];
    const locate=address=>address>=0x2000000?[owner,address-0x2000000]:[globals,address-0x6da000];
    const memory={get:address=>{const [b,o]=locate(address);return b.readUInt32LE(o);},byte:address=>{const [b,o]=locate(address);return b[o];}};
    globals.writeUInt32LE(c.country,0x6f47f4-0x6da000);globals[0x6e1178-0x6da000]=67+c.team;owner[0x620+c.team*0xd7b]=c.skill;
    const snapshot=()=>createHash('sha256').update(globals).update(owner).digest('hex');
    nativeLoadSetupFlag(memory,0x2000000,c.team,{loadFlagBitmap(...args){
      calls.push(['flagBitmap',...args,snapshot()]);owner.writeUInt32LE(0x12345678,args[2]-0x2000000);owner.writeUInt32LE(0x76543210,args[1]-0x2000000);
    }});
    expect(calls).toEqual(c.calls);expect(snapshot()).toBe(c.sha256);
  }
  for(const c of missionNativeScheme.schemeCases) {
    const globals=Buffer.alloc(0x20000,c.pattern),owner=Buffer.alloc(0x10000,c.pattern),calls=[];
    const memory={put:(address,value)=>globals.writeUInt32LE(value>>>0,address-0x6e0000),putByte:(address,value)=>{globals[address-0x6e0000]=value;}};
    const snapshot=()=>createHash('sha256').update(globals).update(owner).digest('hex');
    const result=nativeSelectSetupScheme(memory,0x6f454c,c.selection,c.bank,{
      setResourceString(address,id) {calls.push(['label',address,id,snapshot()]);memory.put(address,0x2500000+id*4);},
      findResource(module,id,type) {calls.push(['findResource',module,id,type,snapshot()]);return 0x2400000+id*256;},
      loadResource(module,handle) {calls.push(['loadResource',module,handle,snapshot()]);return originalSchemeResource((handle-0x2400000)/256);},
      messageBox(...args) {calls.push(['message',...args,snapshot()]);},
    });
    expect({result,calls,state:snapshot()},`scheme ${c.selection} ${c.bank} ${c.pattern}`).toEqual({result:c.result,calls:c.calls,state:c.sha256});
  }
  // The deepest capture supersedes the earlier all-profile callback captures.
  // Keep scheme rejection separately: native mission bank0 always exists.
  for(const c of [...missionLoad.cases.filter(c=>c.failure),...missionNativePalette.cases]) {
    const missionOwner=c.globalOwner?0x6e0484:0x2000000;
    const globalBase=c.nativeInitializer?0x6da000:0x6e0000;
    const globals=Buffer.alloc(c.nativeInitializer?0x30000:0x20000,c.pattern),owner=Buffer.alloc(0x10000,c.pattern),calls=[];
    const bitmapBytes=Buffer.alloc(0x10000),paletteHeap=Buffer.alloc(0x10000,c.pattern),paletteSlot=Buffer.alloc(4);
    const contextBytes=Buffer.alloc(0x20000,c.pattern),contextOwnerBytes=Buffer.alloc(0x10000,c.pattern);
    const locate=address=>address>=0x3100000?[contextOwnerBytes,address-0x3100000]:address>=0x3000000?[contextBytes,address-0x3000000]:address>=0x2900000?[paletteSlot,address-0x2900000]:address>=0x2700000?[paletteHeap,address-0x2700000]:address>=0x2600000?[bitmapBytes,address-0x2600000]:address>=0x2000000?[owner,address-0x2000000]:[globals,address-globalBase];
    const memory={get:address=>{const [b,o]=locate(address);return b.readUInt32LE(o);},put:(address,value)=>{const [b,o]=locate(address);b.writeUInt32LE(value>>>0,o);},byte:address=>{const [b,o]=locate(address);return b[o];},putByte:(address,value)=>{const [b,o]=locate(address);b[o]=value;}};
    memory.range=(address,length)=>{const [b,o]=locate(address);return b.subarray(o,o+length);};
    if(c.nativeInitializer) {
      memory.range(0x6de000,0x9000).fill(0);memory.range(0x6daf90,0x1d8).fill(0);
      memory.put(0x6daf94,-1);memory.range(0x6db060,264).fill(255);
      if(c.mutation)for(const [offset,value] of [[4,2],[8,-1],[12,3],[16,5],[20,-1]])memory.put(0x6daf90+offset,value);
      memory.putByte(0x6e11f8,1);memory.putByte(0x6e18c0,1);
      memory.range(0x6f4839,65).fill(0);memory.range(0x6f4839,7).set(Buffer.from('English'));
      memory.range(0x6f48bc,9).set(Buffer.from('C:\\WORMS\0'));
      memory.put(0x6f49cc,2);memory.put(0x6f49ec,0);memory.put(0x6f49c4,1);
    }
    nativeCreateMissionOwner(memory,missionOwner,{initializeString:address=>memory.put(address,0),time:()=>0,seedRandom:()=>{}});
    memory.put((missionOwner+0x880),(missionOwner+0x1000));memory.put(0x6f47f4,c.country);memory.putByte(0x6e6880,1);
    if(!c.unselected){memory.put((missionOwner+0x884),1);memory.put((missionOwner+0x54),c.mutation?1:-1);}
    if(c.nativeServices)memory.putByte(0x6e1178,67+c.mutation);
    const random=new NativeFrontendRandom(123+c.pattern);
    const snapshot=()=>createHash('sha256').update(globals).update(c.globalOwner?Buffer.alloc(0):owner).update(c.nativePalette?paletteHeap:Buffer.alloc(0)).update(c.sceneContext?contextBytes:Buffer.alloc(0)).update(c.sceneContext?contextOwnerBytes:Buffer.alloc(0)).digest('hex');
    const host={
      setResourceString(address,id) {calls.push(['label',address,id,snapshot()]);memory.put(address,0x2500000+id*4);},
      findResource(module,id,type) {calls.push(['findResource',module,id,type,snapshot()]);return 0x2400000+id*256;},
      loadResource(module,handle) {calls.push(['loadResource',module,handle,snapshot()]);return originalSchemeResource((handle-0x2400000)/256);},
      random:{random() {calls.push(['random',snapshot()]);return random.random();}},
      selectScheme(...args) {calls.push(['scheme',...args,snapshot()]);if(!c.failure)memory.put(0x6f4560,0x12345678);return c.failure?-1:0;},
      initializeSetup(receiver) {calls.push(['initialize',receiver,snapshot()]);memory.putByte(0x6e69c6,Math.max(1,Math.min(6,c.teams)));},
      initializeMode(receiver,mode) {calls.push(['mode',receiver,mode,snapshot()]);memory.putByte(0x6f3cdc,87);},
      finalizeSetup(receiver) {calls.push(['finalize',receiver,snapshot()]);memory.put(0x6f4500,0x12345678);},
      setupMusic(value) {calls.push(['music',value,snapshot()]);memory.put(0x6f3e97,0x12345678);},
      teamCount() {calls.push(['teams',snapshot()]);return memory.byte(0x6e69c6);},
      messageBox(...args) {calls.push(['message',...args,snapshot()]);},
      readLandFile(section,key,fallback,size,filename) {calls.push(['land',section,key,fallback,size,filename,snapshot()]);return Buffer.from(c.strings[section.toLowerCase()]?.[key.toLowerCase()]??fallback,'latin1').subarray(0,size-1);},
      profileInt(section,key,fallback,filename) {
        calls.push(['profile',section,key,fallback,filename,snapshot()]);
        if(c.mutation)memory.put((missionOwner+0x880),filename===(missionOwner+0x1000)?(missionOwner+0x1100):(missionOwner+0x1000));
        return c.values[section.toLowerCase()]?.[key.toLowerCase()]??fallback;
      },
      profileString(section,key,fallback,dest,size,filename) {
        const bytes=Buffer.from(fallback.subarray(0,fallback.indexOf(0)<0?fallback.length:fallback.indexOf(0)));
        calls.push(['profileString',section,key,bytes.toString('hex'),dest,size,filename,snapshot()]);
        const value=Buffer.from(c.strings[section.toLowerCase()]?.[key.toLowerCase()]??bytes.toString('latin1'),'latin1').subarray(0,size-1);
        for(let i=0;i<value.length;i++)memory.putByte(dest+i,value[i]);memory.putByte(dest+value.length,0);
      },
      loadString(resource) {calls.push(['string',resource,snapshot()]);return originalResourceStringBytes(resource);},
      loadTeamFlag(receiver,team) {calls.push(['flag',receiver,team,snapshot()]);memory.put(receiver+team*0xd7b+0x747,0x12345678);},
    };
    if(c.nativeServices)for(const key of ['initializeMode','finalizeSetup','setupMusic','teamCount'])delete host[key];
    if(c.nativeScheme)delete host.selectScheme;
    if(c.nativeFlags) {
      delete host.loadTeamFlag;
      host.loadFlagBitmap=(...args)=>{calls.push(['flagBitmap',...args,snapshot()]);memory.put(args[2],0x12345678);memory.put(args[1],0x76543210);};
    }
    if(c.nativeBitmaps) {
      delete host.loadFlagBitmap;
      let bitmap;
      host.loadImage=(...args)=>{
        calls.push(['loadImage',...args,snapshot()]);bitmap=missionNativePalette.bitmaps[args[1].split('\\').at(-1).toLowerCase()];
        bitmapBytes.set(Buffer.from(bitmap.pixels,'hex'));return c.mutation?0:0x1234;
      };
      host.getBitmap=(...args)=>{calls.push(['getBitmap',...args,snapshot()]);return {...bitmap,bits:0x2600000};};
      host.deleteImage=(...args)=>{calls.push(['deleteImage',...args,snapshot()]);};
      host.openPalette=(...args)=>{calls.push(['openPalette',...args,snapshot()]);return 0x5678;};
      host.readPalette=(...args)=>{calls.push(['readPalette',...args,snapshot()]);memory.range(args[1],1024).set(Buffer.from(bitmap.palette,'hex'));};
      host.closePalette=(...args)=>{calls.push(['closePalette',...args,snapshot()]);};
      if(c.nativePalette) {
        for(const key of ['openPalette','readPalette','closePalette'])delete host[key];
        let allocations=0,entries=Buffer.alloc(1024);host.paletteSlot=0x2900000;
        host.device=()=>0x2800000;
        host.openFile=(...args)=>{calls.push(['openFile',...args,snapshot()]);return 0x5678;};
        host.allocate=(...args)=>{calls.push(['allocate',...args,snapshot()]);return 0x2700000+(allocations++)*0x1000;};
        host.free=(...args)=>{calls.push(['free',...args,snapshot()]);};
        host.seekFile=(...args)=>{calls.push(['seekFile',...args,snapshot()]);};
        host.readFile=(...args)=>{calls.push(['readFile',...args,snapshot()]);const bytes=Buffer.from(bitmap.header,'hex');memory.range(args[0],bytes.length).set(bytes);return bytes.length;};
        host.closeFile=(...args)=>{calls.push(['closeFile',...args,snapshot()]);};
        host.createPalette=(device,flags,bytes,dest,outer)=>{entries=Buffer.from(bytes);calls.push(['createPalette',device,flags,entries.toString('hex'),dest,outer,snapshot()]);memory.put(dest,0x2800200);return 0;};
        host.getPaletteEntries=(handle,flags,first,count,dest)=>{calls.push(['getPaletteEntries',handle,flags,first,count,dest,snapshot()]);memory.range(dest,count*4).set(entries.subarray(first*4,(first+count)*4));return 0;};
        host.releasePalette=(...args)=>{calls.push(['releasePalette',...args,snapshot()]);};
      }
    }
    let storedSeed=null;
    if(c.nativeInitializer) {
      delete host.initializeSetup;
      const draw=random.random.bind(random);random.random=()=>{calls.push(['random',snapshot()]);return draw();};host.random=random;
      host.seedStorage={time:()=>{calls.push(['time',12345,snapshot()]);return 12345;},
        readSeed:fallback=>{calls.push(['readSeed',fallback,snapshot()]);return storedSeed??fallback;},
        writeSeed:value=>{storedSeed=value;calls.push(['writeSeed',value,snapshot()]);}};
      host.handicapEnabled=()=>{calls.push(['handicap',snapshot()]);return 0;};
      host.changeDirectory=bytes=>{const end=bytes.indexOf(0),value=Buffer.from(end<0?bytes:bytes.subarray(0,end));calls.push(['directory',value.toString('hex'),snapshot()]);return c.mutation&&value.toString()!=='C:\\WORMS'?1:0;};
      host.speechPath=cd=>{
        const bytes=Buffer.from(cd?`${String.fromCharCode(memory.byte(0x6e1178))}:\\data\\user\\speech\0`:'C:\\WORMS\\user\\speech\0');
        calls.push(['speech',cd,bytes.toString('hex'),snapshot()]);return bytes;
      };
      host.systemLocale=()=>{calls.push(['locale',snapshot()]);return 0x409;};
      host.languageResource=host.loadString;
      host.readOption=(key,fallback)=>{calls.push(['option',key,fallback,snapshot()]);return key==='DetailLevel'?5:0;};
    }
    if(c.selection) {
      const strings=new Map();
      const services=missionFileServices({
        assignString(address,value) {
          calls.push(['missionString',address,value,snapshot()]);
          const pointer=0x2300000+(address&0xfff)*8+16;
          memory.put(address,pointer);strings.set(pointer,value);
        },
        readString:pointer=>strings.get(pointer),
      });
      const selectionHost={...services,messageBox:host.messageBox,
        createFile:()=>{calls.push(['missionFileCreate',snapshot()]);return services.createFile();},
        openFile:(file,...args)=>{
          calls.push(['missionFileOpen',...args,snapshot()]);
          const result=services.openFile(file,...args);expect(file.record?.source).toBe(c.profile);return result;
        },
        closeFile:file=>{calls.push(['missionFileClose',snapshot()]);services.closeFile(file);},
        destroyFile:file=>{calls.push(['missionFileDestroy',snapshot()]);services.destroyFile(file);},
      };
      const selected=c.selection.training?nativeSelectTraining(memory,missionOwner,c.selection.number,selectionHost):nativeSelectMission(memory,missionOwner,c.selection.number,c.selection.score,selectionHost);
      expect(selected).toBe(0);
    }
    const result=c.prepareTeams?nativePrepareGlobalMission(memory,host):c.globalOwner?nativeLoadGlobalMission(memory,host):nativeLoadMission(memory,missionOwner,host);
    if(c.sceneContext)nativeCreateSceneContext(memory,0x3100000,c.bindings,0x6e68e8,{
      initializePalette:(...args)=>calls.push(['scenePalette',...args,snapshot()]),
      allocate:(...args)=>{calls.push(['sceneAllocate',...args,snapshot()]);return 0x3000000;},
    });
    if(c.nativeInitializer)expect([random.state,storedSeed]).toEqual([c.randomState,c.storedSeed]);
    expect({result,count:calls.length,calls:createHash('sha256').update(JSON.stringify(calls)).digest('hex'),state:snapshot()},`${c.profile} complete ${c.mutation}`).toEqual({result:c.result,count:c.callCount,calls:c.callsSha256,state:c.sha256});
  }
  for(const c of missionTeams.cases) {
    const globals=Buffer.alloc(0x20000,c.pattern),owner=Buffer.alloc(0x10000,c.pattern),calls=[];
    const locate=address=>address>=0x2000000?[owner,address-0x2000000]:[globals,address-0x6e0000];
    const memory={get:address=>{const [b,o]=locate(address);return b.readUInt32LE(o);},put:(address,value)=>{const [b,o]=locate(address);b.writeUInt32LE(value>>>0,o);},byte:address=>{const [b,o]=locate(address);return b[o];},putByte:(address,value)=>{const [b,o]=locate(address);b[o]=value;}};
    nativeCreateMissionOwner(memory,0x2000000,{initializeString:address=>memory.put(address,0),time:()=>0,seedRandom:()=>{}});
    memory.put(0x2000880,0x2001000);memory.put(0x6f47f4,c.country);
    const snapshot=()=>createHash('sha256').update(globals).update(owner).digest('hex');
    nativeLoadMissionTeams(memory,0x2000000,c.teams,{
      profileInt(section,key,fallback,filename) {
        calls.push(['profile',section,key,fallback,filename,snapshot()]);
        if(c.mutation)memory.put(0x2000880,filename===0x2001000?0x2001100:0x2001000);
        return c.values[section.toLowerCase()]?.[key.toLowerCase()]??fallback;
      },
      profileString(section,key,fallback,dest,size,filename) {
        const bytes=Buffer.from(fallback.subarray(0,fallback.indexOf(0)<0?fallback.length:fallback.indexOf(0)));
        calls.push(['profileString',section,key,bytes.toString('hex'),dest,size,filename,snapshot()]);
        const value=Buffer.from(c.strings[section.toLowerCase()]?.[key.toLowerCase()]??bytes.toString('latin1'),'latin1').subarray(0,size-1);
        for(let i=0;i<value.length;i++)memory.putByte(dest+i,value[i]);memory.putByte(dest+value.length,0);
      },
      loadString(resource) {calls.push(['string',resource,snapshot()]);return originalResourceStringBytes(resource);},
      loadTeamFlag(receiver,team) {calls.push(['flag',receiver,team,snapshot()]);memory.put(receiver+team*0xd7b+0x747,0x12345678);},
    });
    expect({count:calls.length,calls:createHash('sha256').update(JSON.stringify(calls)).digest('hex'),state:snapshot()},`${c.profile} teams ${c.mutation}`).toEqual({count:c.callCount,calls:c.callsSha256,state:c.sha256});
  }
  for(const c of missionWorms.cases) {
    const globals=Buffer.alloc(0x20000,c.pattern),owner=Buffer.alloc(0x10000,c.pattern),calls=[];
    const locate=address=>address>=0x2000000?[owner,address-0x2000000]:[globals,address-0x6e0000];
    const memory={get:address=>{const [b,o]=locate(address);return b.readUInt32LE(o);},put:(address,value)=>{const [b,o]=locate(address);b.writeUInt32LE(value>>>0,o);},byte:address=>{const [b,o]=locate(address);return b[o];},putByte:(address,value)=>{const [b,o]=locate(address);b[o]=value;}};
    nativeCreateMissionOwner(memory,0x2000000,{initializeString:address=>memory.put(address,0),time:()=>0,seedRandom:()=>{}});
    memory.put(0x2000880,0x2001000);memory.put(0x2000054,c.mutation?1:-1);
    memory.putByte(0x6e1834,c.counts[0]);memory.putByte(0x6e69c6,c.counts.length);
    for(let i=1;i<c.counts.length;i++) {memory.putByte(0x6e2518+(i-1)*0xd7b,c.groups[i-1]);memory.putByte(0x6e25af+(i-1)*0xd7b,c.counts[i]);}
    const snapshot=()=>createHash('sha256').update(globals).update(owner).digest('hex');
    nativeLoadMissionWorms(memory,0x2000000,{
      profileInt(section,key,fallback,filename) {
        calls.push(['profile',section,key,fallback,filename,snapshot()]);
        if(c.mutation)memory.put(0x2000880,filename===0x2001000?0x2001100:0x2001000);
        const values=c.values[section.toLowerCase()]??{};return values[key.toLowerCase()]??values['*']??fallback;
      },
    });
    expect({count:calls.length,calls:createHash('sha256').update(JSON.stringify(calls)).digest('hex'),state:snapshot()},`${c.profile} worms ${c.mutation}`).toEqual({count:c.callCount,calls:c.callsSha256,state:c.sha256});
  }
  for(const block of stringResources.blocks) {
    const parts=[];
    for(const text of block.strings) {const bytes=Buffer.from(text,'utf16le'),size=Buffer.alloc(2);size.writeUInt16LE(bytes.length/2);parts.push(size,bytes);}
    expect(createHash('sha256').update(Buffer.concat(parts)).digest('hex')).toBe(block.sha256);
  }
  const ansiDecoder=new TextDecoder('windows-1252'),encodingMismatches=[];
  for(const [language,blocks] of Object.entries(stringResources.languages))
    for(const [block,index] of Object.entries(blocks))
      for(let i=0;i<16;i++)
        if(ansiDecoder.decode(originalResourceStringBytes((Number(block)-1)*16+i,language))!==stringResources.blocks[index].strings[i])encodingMismatches.push([language,block,i]);
  expect(encodingMismatches).toEqual([]);
  for (const c of missionOwner.cases) {
    const owner=Buffer.alloc(0x10000,c.pattern),calls=[];
    const memory={put:(address,value)=>owner.writeUInt32LE(value>>>0,address-0x2000000)};
    const snapshot=()=>createHash('sha256').update(owner).digest('hex');
    const result=nativeCreateMissionOwner(memory,0x2000000,{
      initializeString(address) {calls.push(['string',address,snapshot()]);memory.put(address,0x2400000);},
      time(pointer) {calls.push(['time',pointer,snapshot()]);if(c.mutation)memory.put(0x2000054,123456);return c.timestamp;},
      seedRandom(seed) {calls.push(['seed',seed,snapshot()]);if(c.mutation){memory.put(0x2000884,789);memory.put(0x200087c,321);memory.put(0x2000880,0x2400100);}},
    });
    expect({result,calls,state:snapshot()},`mission owner ${c.pattern} ${c.timestamp} ${c.mutation}`).toEqual({result:c.result,calls:c.calls,state:c.sha256});
  }
  for (const c of missionEvents.cases) {
    const globals=Buffer.alloc(0x20000,c.pattern),owner=Buffer.alloc(0x10000,c.pattern),calls=[];
    const locate=address=>address>=0x2000000?[owner,address-0x2000000]:[globals,address-0x6e0000];
    const memory={get:address=>{const [b,o]=locate(address);return b.readUInt32LE(o);},put:(address,value)=>{const [b,o]=locate(address);b.writeUInt32LE(value>>>0,o);},putByte:(address,value)=>{const [b,o]=locate(address);b[o]=value;}};
    if(c.originalTables) nativeCreateMissionOwner(memory,0x2000000,{initializeString:address=>memory.put(address,0),time:()=>0,seedRandom:()=>{}});
    else for(let i=0;i<100;i++) {memory.put(0x2000004+i*4,i);memory.put(0x2000698+i*4,1000+i);memory.put(0x2000888+i*4,2000+i);}
    memory.put(0x2000880,0x2001000);memory.put(0x200087c,c.retries);
    const snapshot=()=>createHash('sha256').update(globals).update(owner).digest('hex');
    nativeLoadMissionEvents(memory,0x2000000,{
      profileInt(section,key,fallback,filename) {
        calls.push(['profile',section,key,fallback,filename,snapshot()]);
        if(c.mutation)memory.put(0x2000880,filename===0x2001000?0x2001100:0x2001000);
        return c.values[section.toLowerCase()]?.[key.toLowerCase()]??fallback;
      },
      loadString(resource) {calls.push(['string',resource,snapshot()]);return c.originalTables?originalResourceStringBytes(resource):c.text;},
    });
    expect({count:calls.length,calls:createHash('sha256').update(JSON.stringify(calls)).digest('hex'),state:snapshot()},`${c.profile} events ${c.mutation}`).toEqual({count:c.callCount,calls:c.callsSha256,state:c.sha256});
  }
  for(const c of missionInventory.cases) {
    const globals=Buffer.alloc(0x10000,c.pattern),owner=Buffer.alloc(0x10000,c.pattern),calls=[];
    const locate=address=>address>=0x2000000?[owner,address-0x2000000]:[globals,address-0x6f0000];
    const memory={get:address=>{const [b,o]=locate(address);return b.readUInt32LE(o);},put:(address,value)=>{const [b,o]=locate(address);b.writeUInt32LE(value>>>0,o);},byte:address=>{const [b,o]=locate(address);return b[o];},putByte:(address,value)=>{const [b,o]=locate(address);b[o]=value;}};
    const short=(address,value)=>{memory.putByte(address,value);memory.putByte(address+1,value>>>8);};
    memory.put(0x2000880,0x2001000);owner.write(c.section+'\0',0x2000,'ascii');
    for(let i=0;i<71;i++)for(const base of [0x6f3624,0x6f36b2])short(base+(c.team*143+i)*2,c.mutation?[-1,0,1,32767,-32768,123][i%6]:0);
    const snapshot=()=>createHash('sha256').update(globals).update(owner).digest('hex');
    nativeLoadMissionInventory(memory,0x2000000,c.section,c.team,{
      profileInt(section,key,fallback,filename) {
        calls.push([section,key,fallback,filename,snapshot()]);
        if(c.mutation) {
          if(calls.length%11===0) {
            const [kind,slot]=missionInventoryFields.entries[calls.length-1];
            short((kind==='ammo'?0x6f3624:0x6f36b2)+(c.team*143+slot)*2,32760);
          }
          memory.put(0x2000880,filename===0x2001000?0x2001100:0x2001000);
        }
        return c.values[key.toLowerCase()]??c.values['*']??fallback;
      },
    });
    expect({count:calls.length,calls:createHash('sha256').update(JSON.stringify(calls)).digest('hex'),state:snapshot()},`${c.profile} ${c.section} ${c.mutation}`).toEqual({count:c.callCount,calls:c.callsSha256,state:c.sha256});
  }

  for(const c of missionOptions.cases) {
    const globals=Buffer.alloc(0x10000,c.pattern),owner=Buffer.alloc(0x10000,c.pattern),calls=[];
    const locate=address=>address>=0x2000000?[owner,address-0x2000000]:[globals,address-0x6f0000];
    const memory={get:address=>{const [b,o]=locate(address);return b.readUInt32LE(o);},put:(address,value)=>{const [b,o]=locate(address);b.writeUInt32LE(value>>>0,o);},byte:address=>{const [b,o]=locate(address);return b[o];},putByte:(address,value)=>{const [b,o]=locate(address);b[o]=value;}};
    memory.put(0x2000880,0x2001000);
    const snapshot=()=>createHash('sha256').update(globals).update(owner).digest('hex');
    let countCalls=0;
    const host={
      profileInt(section,key,fallback,filename) {
        calls.push(['profile',section,key,fallback,filename,snapshot()]);
        const value=c.values[section.toLowerCase()]?.[key.toLowerCase()]??fallback;
        if(c.mutation)memory.put(0x2000880,filename!==0x2001000?0x2001000:0x2001100);
        return value;
      },
      selectScheme(...args) {calls.push(['scheme',...args,snapshot()]);if(!c.failure)memory.put(0x6f4560,0x12345678);return c.failure?-1:0;},
      setupMusic(value) {calls.push(['music',value,snapshot()]);memory.put(0x6f3e97,0x12345678);},
      teamCount() {calls.push(['teams',snapshot()]);return !c.mutation||countCalls++===0?c.teams:Math.max(0,c.teams-1);},
    };
    const result=c.operation==='scheme'?nativeLoadMissionScheme(memory,0x2000000,host):(nativeLoadMissionOptions(memory,0x2000000,host),null);
    expect({result,calls,sha256:snapshot()},`${c.profile} ${c.operation} ${c.mutation} ${c.failure}`).toEqual({result:c.result,calls:c.calls,sha256:c.sha256});
  }

  for(const c of [...wormMemory.cases,...wormMemoryAnimation.cases.map(c=>({...c,synchronized:true})),...wormMemorySpawn.cases.map(c=>({...c,synchronized:true,nativeSpawn:true})),...wormMemoryState.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true})),...wormMemoryPlacement.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true})),...controllerWormMemory.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true})),...worldWormMemory.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true})),...worldLandscapeMemory.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true})),...worldObjectsMemory.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true})),...worldBarrelMemory.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true})),...worldMineMemory.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true})),...worldSceneryMemory.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true})),...worldPresentationMemory.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true})),...fullMatchRootMemory.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true})),...fullStartupMemory.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true})),...fullStartupSettings.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true})),...fullStartupDispatch.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true})),...fullStartupCleanup.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true})),...fullObjectDestroy.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true,destroyObjects:true})),...fullControllerDestroy.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true,destroyObjects:true})),...fullWorldDestroy.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true,destroyObjects:true,destroyRoot:true})),...fullStartupTeardown.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true,destroyObjects:true,destroyRoot:true,teardown:true})),...fullEnvironmentLifecycle.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true,destroyObjects:true,destroyRoot:true,teardown:true,environmentConstructor:true})),...fullSceneServices.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true,destroyObjects:true,destroyRoot:true,teardown:true,environmentConstructor:true,sceneServices:true})),...fullSceneBuffers.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true,destroyObjects:true,destroyRoot:true,teardown:true,environmentConstructor:true,sceneServices:true,sceneBuffers:true})),...fullSceneLayout.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true,destroyObjects:true,destroyRoot:true,teardown:true,environmentConstructor:true,sceneServices:true,sceneBuffers:true,sceneLayout:true})),...fullOfflinePanels.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true,destroyObjects:true,destroyRoot:true,teardown:true,environmentConstructor:true,sceneServices:true,sceneBuffers:true,sceneLayout:true,offlinePanels:true})),...fullSceneDisplay.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true,destroyObjects:true,destroyRoot:true,teardown:true,environmentConstructor:true,sceneServices:true,sceneBuffers:true,sceneLayout:true,offlinePanels:true,sceneDisplay:true})),...fullSceneRecords.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true,destroyObjects:true,destroyRoot:true,teardown:true,environmentConstructor:true,sceneServices:true,sceneBuffers:true,sceneLayout:true,offlinePanels:true,sceneDisplay:true,sceneRecords:true})),...fullOfflineScene.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true,destroyObjects:true,destroyRoot:true,teardown:true,environmentConstructor:true,sceneServices:true,sceneBuffers:true,sceneLayout:true,offlinePanels:true,sceneDisplay:true,sceneRecords:true,completeScene:true})),...fullSceneLifecycle.cases.map(c=>({...c,synchronized:true,nativeSpawn:true,nativeState:true,nativePlacement:true,controller:true,world:true,landscape:true,objects:true,barrels:true,mines:true,scenery:true,presentation:true,fullRoot:true,finalized:true,settings:true,deepSettings:true,cleanup:true,destroyObjects:true,destroyRoot:true,teardown:true,environmentConstructor:true,sceneServices:true,sceneBuffers:true,sceneLayout:true,offlinePanels:true,sceneDisplay:true,sceneRecords:true,completeScene:true,completeLifecycle:true}))]) {
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
    host.resetScene=at=>calls.push(['reset',at]);host.send=c.settings?undefined:(...args)=>calls.push(['send',...args]);host.dispatchStartupSetting=c.deepSettings?undefined:(...args)=>calls.push(['dispatch',...args]);host.observeStartupSetting=(...args)=>calls.push(['dispatch',...args]);
    host.mineReplacementEffect=request=>calls.push(['effect',request]);host.deleteTask=(...args)=>calls.push(['delete',...args]);
    host.portraitLabel=at=>{calls.push(['label',at]);return 0x76543210+c.bits;};host.setPortraitLabel=value=>portraitLabel=value;
    if(c.nativePlacement){delete host.gravity;delete host.placeWorm;host.collisionOverlap=(...args)=>{calls.push(['overlap',...args]);return +(args[2]>=2+c.bits%4+(c.mines&&(c.bits&32)?(args[1]&7)>>1:0)&&(args[3]===0x2007300||args[1]>=800));};}
    if(c.nativeSpawn)for(const key of ['randomSpawnWord','randomSpawn','sideSpawn','reserveSpawn'])delete host[key];
    if(!c.presentation)host.initializeWorldPresentation=at=>{calls.push(['call',0x4eaf40,at,[]]);return at;};
    if(!c.scenery)host.populateScenery=(at,setup)=>{calls.push(['call',0x4ebe10,at,[setup]]);return at;};
    if(!c.objects)host.populateNaturalObjects=(at,setup)=>{calls.push(['call',0x4eba80,at,[setup]]);return at;};
    if(!c.mines)host.constructNaturalMine=(...args)=>{calls.push(['mine',...args]);return args[0];};if(!c.barrels)host.constructNaturalBarrel=(...args)=>{calls.push(['barrel',...args]);return args[0];};
    if(!c.landscape)host.constructLandscape=(at,parent)=>{calls.push(['call',0x4d1f80,at,[parent]]);return at;};
    host.surfaceDimensions=at=>{calls.push(['dimensions',at]);return at===0x2007600?[1,c.bits%24]:[34+c.bits%3,18+c.bits%5];};
    host.readSurfacePixel=(at,x,y)=>{calls.push(['pixel',at,x,y]);return c.bits&1?y:y%7;};
    host.drawSurface=(...args)=>calls.push(['surface',...args]);
    host.call=(entry,at,args)=>{calls.push(['call',entry,at,args]);return at;};
    host.virtual=(at,method,args)=>{calls.push(['virtual',at,method,args]);if(method===0x20)memory.put(at+0x3b8,args[0]);};
    if(!c.world){nativeCreateTaskMemory(memory,0x2008000,0,host);memory.put(0x2008038,0x2300000);}
    if(c.completeScene) {
      delete host.virtual;
      let viewportCount=0;host.rendererDimensions=at=>{calls.push(['viewport',at]);return viewportCount++===0?[640+c.bits,480+c.bits]:[320+c.bits,[599,600,767,768][c.bits%4]];};
      host.configureDisplay=(...args)=>calls.push(['display',...args]);host.configureMode=(...args)=>calls.push(['mode',...args]);
      host.localizedName=method=>{calls.push(['name',method]);return new TextEncoder().encode(`Weapon${String(method/4).padStart(3,'0')}\0`);};
      host.portraitLabel=()=>{calls.push(['name',0x40]);return 0x2502400;};
      const counter=new Uint8Array([239,190,173,222]);
      nativeInitializeOfflineScene(memory,0x2000000,0x2300000,host,counter);
      expect(new DataView(counter.buffer).getUint32(0,true)).toBe(c.sharedCounter);
    } else {
    if(c.environmentConstructor) {delete host.virtual;if(c.sceneServices)nativeCreateInitialSceneServices(memory,0x2000000,0x2300000,host);else nativeCreateEnvironmentMemory(memory,0x2400000,0x2003000,host);}
    if(c.sceneBuffers) {
      let viewportCount=0;host.rendererDimensions=at=>{calls.push(['viewport',at]);return viewportCount++===0?[640+c.bits,480+c.bits]:[320+c.bits,c.sceneLayout?[599,600,767,768][c.bits%4]:240+c.bits];};
      nativeCreateInitialSceneBuffers(memory,0x2000000,0x2300000,host);
    }
    if(c.sceneLayout)nativeCreateInitialSceneLayout(memory,0x2000000,0x2300000,host);
    if(c.offlinePanels)nativeCreateOfflineScenePanels(memory,0x2000000,0x2300000,host);
    if(c.sceneDisplay){host.configureDisplay=(...args)=>calls.push(['display',...args]);nativeInitializeSceneDisplay(memory,0x2300000,host);}
    if(c.sceneRecords){
      const counter=new Uint8Array([239,190,173,222]);
      nativeInitializeSceneGameplayRecords(scene,method=>{calls.push(['name',method]);return new TextEncoder().encode(`Weapon${String(method/4).padStart(3,'0')}\0`);},counter);
      expect(new DataView(counter.buffer).getUint32(0,true)).toBe(c.sharedCounter);
      host.portraitLabel=()=>{calls.push(['name',0x40]);return 0x2502400;};
    }
    if(c.finalized)nativeFinalizeGameplaySetup(memory,0x2000000,0x2300000,host);
    else if(c.fullRoot)nativeCreateMatchRootAt(memory,0x2000000,0x2300000,0x23047a8,host);
    else if(c.world)nativeInitializeWorld(memory,0x2000000,0x2300000,0x23047a8,host);
    else if(c.controller)nativeCreateTeamControllerAt(memory,0x2000000,0x2008000,c.team,0x2001000,host);
    else nativeCreateWormAt(memory,0x2000000,0x2008000,c.team,c.worm,0x2001000,host);
    }
    if(c.completeLifecycle) {
      for(const [at,value,size] of c.changes??[])for(let i=0;i<size;i++)memory.putByte(at+i,(value>>>(i*8))&255);
      host.release=(at,size)=>calls.push(['release',at,size]);
      const observed=[];host.observeTaskCleanup=at=>observed.push(at);
      host.observeTaskDepth=(...args)=>calls.push(['depth',...args]);host.flushSceneEvents=(...args)=>calls.push(['flush',...args]);
      nativeDestroyOfflineScene(memory,0x2000000,host);expect(observed).toEqual(c.cleanupCalls);
    } else {
    if(c.destroyObjects) {
      for(const [at,value,size] of c.changes??[])for(let i=0;i<size;i++)memory.putByte(at+i,(value>>>(i*8))&255);
      host.release=(at,size)=>calls.push(['release',at,size]);
      if(c.destroyRoot)nativeDestroyWorldTaskMemory(memory,memory.get(0x2000004),c.bits%4,host);
      else for(const [at,kind,flags] of c.destroyed)(kind===0x526988?nativeDestroyBarrelMemory:kind===0x5271b8?nativeDestroyTeamControllerMemory:nativeDestroyMineMemory)(memory,at,flags,host);
    }
    if(c.sceneBuffers)nativeDestroyInitialSceneBuffers(memory,0x2000000,c.bits%4,host);
    if(c.sceneLayout)nativeDestroyInitialScenePools(memory,0x2000000,c.bits%4,host);
    if(c.offlinePanels)nativeDestroyOfflineScenePanels(memory,0x2000000,c.bits%4,host);
    if(c.cleanup) {
      const observed=[];
      const cleanup=at=>{observed.push(at);nativeCleanupTaskMemory(memory,at,cleanup);};
      if(!c.destroyRoot)cleanup(memory.get(0x2000004));nativeCompactPhysicsMemory(memory,memory.get(0x23007d4));
      expect(observed).toEqual(c.cleanupCalls);
    }
    if(c.sceneServices)nativeDestroyInitialSceneServices(memory,0x2300000,c.bits%4,host);
    else if(c.teardown) {
      nativeDestroyEnvironmentMemory(memory,memory.get(0x23007d4),c.bits%4,host);
      nativeDestroyTeamPanelTree(memory,memory.get(0x23007dc),c.bits%4,host);
    }
    }
    if(c.controller)expect(portraitLabel).toBe(c.portraitLabel);
    const label=`constructor case ${c.bits}: world=${!!c.world}, objects=${!!c.objects}, barrels=${!!c.barrels}, mines=${!!c.mines}`;
    if(c.completeScene){expect(calls.length,label).toBe(c.callCount);expect(createHash('sha256').update(JSON.stringify(calls)).digest('hex'),label).toBe(c.callsSha256);}
    else expect(calls,label).toEqual(c.calls);
    expect(createHash('sha256').update(owner).update(heap).update(scene).digest('hex'),label).toBe(c.sha256);
  }
  for(const row of eventBuffer.cases) {
    const bytes=Uint8Array.from({length:0x8000},(_,i)=>(i*13+row.seed)&255),view=new DataView(bytes.buffer),base=0x2000000;
    const memory={get:at=>view.getUint32(at-base,true),put:(at,v)=>view.setInt32(at-base,v,true),byte:at=>bytes[at-base],putByte:(at,v)=>bytes[at-base]=v};
    for(let q=0;q<2;q++) {
      const buffer=base+0x100+q*0x40;memory.put(base+q*8,0x526544);memory.put(base+q*8+4,buffer);
      for(const [o,v] of [[0,0x5266a0],[4,base+0x1000+q*0x2000],[8,row.capacities[q]],[12,0],[16,0],[20,0],[24,0],[28,0]])memory.put(buffer+o,v);
    }
    const checks=[];
    for(const op of row.operations) {
      const wrapper=base+op.q*8,buffer=memory.get(wrapper+4);let result;
      if(op.kind==='append'){bytes.set(op.args[1],0x7000);result=nativeAppendSceneEvent(memory,wrapper,op.args[0],op.args[1]);}
      else if(op.kind==='peek'||op.kind==='read')result=nativeReadSceneEvent(memory,wrapper,base+0x6000,base+0x6004,base+0x6100,op.kind==='read');
      else if(op.kind==='consume')result=nativeConsumeEventRecord(memory,buffer);
      else if(op.kind==='copy')result=nativeCopyEventBuffer(memory,buffer,memory.get(base+op.args[0]*8+4));
      else if(op.kind==='contains')result=nativeContainsEventRecord(memory,buffer,op.args[0]);
      else if(op.kind==='reset'){nativeResetEventBuffer(memory,buffer);result=null;}
      else if(op.kind==='usage')result=nativeEventBufferUsage(memory,buffer);
      else result=nativeEventBufferCount(memory,buffer);
      checks.push([result===null?null:result>>>0,createHash('sha256').update(bytes).digest('hex')]);
    }
    expect(checks,`event buffer ${row.seed}`).toEqual(row.operations.map(op=>[op.result,op.sha256]));
  }
  for(const {count,flags,mode,calls:expected,sha256} of taskDestroy.cases) {
    const owner=Uint8Array.from({length:0x10000},(_,i)=>(i*11+5)&255),heap=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),calls=[];
    const locate=at=>at>=0x2400000?[heap,at-0x2400000]:[owner,at-0x2000000];
    const memory={get:at=>{const [a,o]=locate(at);return new DataView(a.buffer).getUint32(o,true);},put:(at,v)=>{const [a,o]=locate(at);new DataView(a.buffer).setUint32(o,v,true);},byte:at=>{const [a,o]=locate(at);return a[o];},putByte:(at,v)=>{const [a,o]=locate(at);a[o]=v;}};
    let cursor=0x2408000;
    const allocate=(kind,size,pool)=>{const at=cursor;cursor+=(size+15)&~15;calls.push([kind,size,at,...(kind==='array'?[pool]:[])]);return at;};
    const host={allocate:size=>allocate('allocate',size),allocateArray:(size,pool)=>allocate('array',size,pool),free:at=>calls.push(['free',at]),release:(at,size)=>calls.push(['release',at,size])};
    nativeCreateTaskMemory(memory,0x2000000,0,host);nativeRegisterTaskMemory(memory,0x2000000,20,0,host);
    for(let index=0;index<count;index++) {
      const child=0x2400100+index*0x300;nativeCreateTaskMemory(memory,child,0x2000000,host);nativeRegisterTaskMemory(memory,child,mode<2?20:-20,mode===1?0:index+2,host);
      for(let j=0;j<mode%3;j++) {const grandchild=child+(j+1)*0x100;nativeCreateTaskMemory(memory,grandchild,child,host);nativeRegisterTaskMemory(memory,grandchild,3,index*3+j,host);}
    }
    if(count&&(mode&1))nativeDestroyTaskMemory(memory,0x2400100,1,host);
    if(mode&2)nativeCleanupTaskMemory(memory,0x2000000);
    nativeDestroyTaskMemory(memory,0x2000000,flags,host);
    expect(calls,`destruction ${count}/${flags}/${mode}`).toEqual(expected);
    expect(createHash('sha256').update(owner).update(heap).digest('hex')).toBe(sha256);
  }
  for(const row of taskCleanup.cases) {
    const {count,mode,mask,dirty}=row,owner=0x2000000,children=owner+0x4000,alternate=owner+0x5000,scratch=owner+0x6000,table=owner+0x8000;
    const bytes=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),view=new DataView(bytes.buffer),calls=[];
    const memory={get:at=>view.getUint32(at-owner,true),put:(at,value)=>view.setUint32(at-owner,value,true)};
    memory.put(table+0x18,0x2200100);
    for(let i=0;i<8;i++)memory.put(owner+0x1000+i*0x100,table);
    for(let i=0;i<count;i++) {
      memory.put(children+i*4,mask===1||mask===2&&i%2===0||mask===3&&i%2?0:owner+0x1000+i*0x100);
      memory.put(alternate+i*4,owner+0x1000+(7-i)*0x100);
    }
    for(const [offset,value] of [[16,dirty],[20,count],[24,children],[28,scratch],[32,0xdeadbeef]])memory.put(owner+offset,value);
    nativeCleanupTaskMemory(memory,owner,child=>{
      calls.push(child);if(calls.length!==1)return;
      if(mode===1)memory.put(owner+20,0);
      else if(mode===2){memory.put(children+4,0);memory.put(owner+16,1);}
      else if(mode===3)memory.put(owner+24,alternate);
      else if(mode===4){memory.put(children+count*4,owner+0x1700);memory.put(owner+20,count+1);}
      else if(mode===5)memory.put(owner+20,1);
      else if(mode===6){memory.put(children,0);memory.put(owner+16,1);}
      else if(mode===7)memory.put(owner+16,0);
    });
    expect(calls).toEqual(row.calls);
    expect(createHash('sha256').update(bytes).digest('hex'),`task cleanup ${count}/${mode}/${mask}/${dirty}`).toBe(row.sha256);
  }
  for(const {seed,sha256} of physicsCompact.cases) {
    const bytes=Uint8Array.from({length:0x10000},(_,i)=>(i*13+seed)&255),view=new DataView(bytes.buffer);
    const memory={get:at=>view.getUint32(at-0x2000000,true),put:(at,value)=>view.setUint32(at-0x2000000,value,true)};
    for(let index=0;index<33;index++) {
      const at=0x2000000+(index===0?0x18:0x34+(index-1)*0x1c),storage=0x2001000+index*0x200,count=(seed+index)%17;
      for(const [offset,value] of [[4,32],[8,(seed+index)%3],[12,count],[16,storage],[20,storage+0x100],[24,0xabcdef01]])memory.put(at+offset,value);
      for(let slot=0;slot<count;slot++)memory.put(storage+slot*4,(seed+slot+index)%4===0?0:0x80000000+index*32+slot);
    }
    nativeCompactPhysicsMemory(memory,0x2000000);
    expect(createHash('sha256').update(bytes).digest('hex'),`registry compaction ${seed}`).toBe(sha256);
  }
  for(const row of runtimeActorDestroy.cases) {
    const bytes=inflateSync(Buffer.from(row.inputMemory,'base64')),calls=[];
    const offset=at=>at>=0x2400000?0x10000+at-0x2400000:at>=0x2300000?0x20000+at-0x2300000:at-0x2000000;
    const memory={get:at=>bytes.readUInt32LE(offset(at)),put:(at,value)=>bytes.writeUInt32LE(value>>>0,offset(at))};
    nativeDestroyWorldTaskMemory(memory,0x2400100,row.flags,{
      dispatchTask:(target,sender,event,size,payload)=>{
        calls.push(['event',target,sender,event,size,new DataView(payload.buffer,payload.byteOffset).getUint32(0,true)]);
        if(event===0x438)memory.put(0x2400100+0x3d8,0x5678);
      },
      free:at=>calls.push(['free',at]),release:(at,size)=>calls.push(['release',at,size]),stopSound:(...args)=>calls.push(['stopSound',...args]),
    });
    expect(calls,`actor teardown ${row.tag}/${row.flags}/${row.variant}`).toEqual(row.calls);
    expect(createHash('sha256').update(bytes).digest('hex'),`actor teardown memory ${row.tag}/${row.flags}/${row.variant}`).toBe(row.sha256);
  }
  for(const row of [...physicsMemory.cases,...physicsDestroy.cases.map(row=>({...row,destroy:true}))]) {
    const heap=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),owner=Uint8Array.from({length:row.destroy?0x10000:0x3c},(_,i)=>(i*11+5)&255),scene=new Uint8Array(0x20000),calls=[];
    const locate=at=>at>=0x2400000?[heap,at-0x2400000]:at>=0x2300000?[scene,at-0x2300000]:[owner,at-0x2000000];
    const memory={get:at=>{const [a,o]=locate(at);return new DataView(a.buffer).getUint32(o,true);},put:(at,v)=>{const [a,o]=locate(at);new DataView(a.buffer).setInt32(o,v,true);},byte:at=>{const [a,o]=locate(at);return a[o];},putByte:(at,v)=>{const [a,o]=locate(at);a[o]=v;},range:(at,len)=>{const [a,o]=locate(at);return a.subarray(o,o+len);}};
    let cursor=0x2408000;
    const allocate=(kind,size,pool)=>{const value=cursor;cursor+=(size+15)&~15;calls.push([kind,size,value,...(kind==='array'?[pool]:[])]);return value;};
    const host={allocate:size=>allocate('allocate',size),allocateArray:(size,pool)=>allocate('array',size,pool),free:at=>calls.push(['free',at]),release:(at,size)=>calls.push(['release',at,size]),stopSound:(...args)=>calls.push(['stopSound',...args])};
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
    if(row.destroy) {
      memory.put(0x2005034,0x4c8f80);
      nativeRegisterTaskMemory(memory,0x2400100,3,row.shape,host);
      memory.put(0x24001c8,row.all_index<0?1:0);memory.put(0x24001f8,0x2407000);memory.put(0x24001f4,row.category%2?0x12340000+row.shape:0);
      memory.put(0x2005038,0x4c9460);memory.put(0x230000c,row.count%2?0x2006000:0);memory.put(0x2006000,0x2006100);memory.put(0x2006128,0x2200100);
      nativeDestroyPhysicsMemory(memory,0x2400100,(row.category+row.shape)%4,host);
    }
    const label=`physics ${row.category}/${row.shape}/${row.capacity}/${row.count}/${row.all_index}/${row.category_index} destroy=${!!row.destroy}`;
    expect(calls,label).toEqual(row.calls);
    expect(createHash('sha256').update(owner).update(heap).digest('hex'),label).toBe(row.sha256);
  }
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
      initializeWorldPresentation:at=>{calls.push(['call',0x4eaf40,at,[]]);return at;},
      populateScenery:(at,setup)=>{calls.push(['call',0x4ebe10,at,[setup]]);return at;},
      populateNaturalObjects:(at,setup)=>{calls.push(['call',0x4eba80,at,[setup]]);return at;},
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
      initializeWorldPresentation:at=>{calls.push(['call',0x4eaf40,at,[]]);return at;},
      populateScenery:(at,setup)=>{calls.push(['call',0x4ebe10,at,[setup]]);return at;},
      populateNaturalObjects:(at,setup)=>{calls.push(['call',0x4eba80,at,[setup]]);return at;},
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
    const result=nativeInitializeMatchSetup(memory,scheme,teamData,{
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
    expect(createHash('sha256').update(memory).digest('hex')).toBe(row.initializer_sha256);
    nativeInitializeInventory(inventory,memory.subarray(0x3c));
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
