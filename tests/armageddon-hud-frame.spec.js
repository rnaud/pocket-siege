import controllerPresentation from "./fixtures/armageddon/controller-presentation.json" with { type: "json" };
import { nativeUpdateControllerPresentation } from "../src/armageddon/controller-presentation.js";
import controllerFrameInput from "./fixtures/armageddon/controller-frame-input.json" with { type: "json" };
import { nativeCollectCameraInput, nativeCollectPauseInput } from "../src/armageddon/controller-frame-input.js";
import controllerFrame from "./fixtures/armageddon/controller-frame.json" with { type: "json" };
import weaponDelays from "./fixtures/armageddon/weapon-delays.json" with { type: "json" };
import { nativeAdvanceWeaponDelays } from "../src/armageddon/weapon-delays.js";
import controllerShot from "./fixtures/armageddon/controller-shot.json" with { type: "json" };
import controllerPostShot from "./fixtures/armageddon/controller-post-shot.json" with { type: "json" };
import { nativeControllerPendingWeapon } from "../src/armageddon/controller-post-shot.js";
import controllerControl from "./fixtures/armageddon/controller-control.json" with { type: "json" };
import controllerActivation from "./fixtures/armageddon/controller-activation.json" with { type: "json" };
import controllerDeactivation from "./fixtures/armageddon/controller-deactivation.json" with { type: "json" };
import defaultWeapon from "./fixtures/armageddon/default-weapon.json" with { type: "json" };
import { nativeFindDefaultWeapon, nativeSelectDefaultWeapon } from "../src/armageddon/default-weapon.js";
import wormSelection from "./fixtures/armageddon/worm-selection.json" with { type: "json" };
import { nativeSelectControllerWorm } from "../src/armageddon/worm-selection.js";
import controllerCommand from "./fixtures/armageddon/controller-command.json" with { type: "json" };
import { nativeControllerCommand } from "../src/armageddon/controller-command.js";
import weaponSelection from "./fixtures/armageddon/weapon-selection.json" with { type: "json" };
import weaponInputFlags from "./fixtures/armageddon/weapon-input-flags.json" with { type: "json" };
import { nativeWeaponInputFlags, nativeApplyWeaponInputFlags, nativeWeaponInputOffsets } from "../src/armageddon/weapon-input-flags.js";
import targetEntry from "./fixtures/armageddon/target-entry.json" with { type: "json" };
import targetTeardown from "./fixtures/armageddon/target-teardown.json" with { type: "json" };
import targetInput from "./fixtures/armageddon/controller-target-input.json" with { type: "json" };
import { nativeCollectTargetInput, nativeEndTargeting, nativeBeginTargeting } from "../src/armageddon/target-input.js";
import targetActivation from "./fixtures/armageddon/controller-target-activation.json" with { type: "json" };
import { nativeCollectTargetActivation } from "../src/armageddon/controller-input.js";
import { NativeCollisionScene } from "../src/armageddon/collision-scene.js";
import girderBitmap from "./fixtures/armageddon/girder-bitmap.json" with { type: "json" };
import { nativeGirderPlacement } from "../src/armageddon/girder-placement.js";
import placementBitmap from "./fixtures/armageddon/placement-bitmap.json" with { type: "json" };
import { nativePlacementBitmapBlit } from "../src/armageddon/placement-bitmap.js";
import collisionDraw from "./fixtures/armageddon/collision-draw.json" with { type: "json" };
import { nativeDrawCollisionRegistry } from "../src/armageddon/collision-registry.js";
import girderPlacement from "./fixtures/armageddon/girder-placement.json" with { type: "json" };
import teleportPlacement from "./fixtures/armageddon/teleport-placement.json" with { type: "json" };
import { nativeTeleportPlacement } from "../src/armageddon/teleport-placement.js";
import wormQuery from "./fixtures/armageddon/worm-query.json" with { type: "json" };
import { nativeWormQuery } from "../src/armageddon/worm-query.js";
import targetPlacement from "./fixtures/armageddon/target-placement.json" with { type: "json" };
import { nativeClampPlacementTarget, nativeFindTeleportTarget, nativeValidateGirderTarget } from "../src/armageddon/target-placement.js";
import controllerPointerInput from "./fixtures/armageddon/controller-pointer-input.json" with { type: "json" };
import controllerWeaponInput from "./fixtures/armageddon/controller-weapon-input.json" with { type: "json" };
import controllerMovementInput from "./fixtures/armageddon/controller-movement-input.json" with { type: "json" };
import controllerMenuInput from "./fixtures/armageddon/controller-menu-input.json" with { type: "json" };
import controllerInput from "./fixtures/armageddon/controller-input.json" with { type: "json" };
import { nativeCollectControllerInput, nativeCollectMenuInput, nativeCollectMovementInput, nativeCollectWeaponInput, nativeCollectPointerInput } from "../src/armageddon/controller-input.js";
import replayWormRoundtrip from "./fixtures/armageddon/replay-worm-roundtrip.json" with { type: "json" };
import replayPipelineRestore from "./fixtures/armageddon/replay-pipeline-restore.json" with { type: "json" };
import replayPipelineCapture from "./fixtures/armageddon/replay-pipeline-capture.json" with { type: "json" };
import replayPipeline from "./fixtures/armageddon/replay-pipeline.json" with { type: "json" };
import { createNativeReplayPipeline } from "../src/armageddon/replay-pipeline.js";
import replayInput from "./fixtures/armageddon/replay-input.json" with { type: "json" };
import { nativeCollectReplayInput } from "../src/armageddon/replay-input.js";
import replayFrameState from "./fixtures/armageddon/replay-frame-state.json" with { type: "json" };
import { nativeAdvanceReplayFrameState, nativeAdvanceInputFrameState, nativeReplayFrameAudio } from "../src/armageddon/replay-frame-state.js";
import replayFrame from "./fixtures/armageddon/replay-frame.json" with { type: "json" };
import { nativeReplayFrame } from "../src/armageddon/replay-frame.js";
import replayEntry from "./fixtures/armageddon/replay-entry.json" with { type: "json" };
import { nativeReplayEntry } from "../src/armageddon/replay-entry.js";
import replayDispatch from "./fixtures/armageddon/replay-dispatch.json" with { type: "json" };
import { nativeDispatchReplayEvents } from "../src/armageddon/replay-dispatch.js";
import { createHash } from "node:crypto";
import replaySession from "./fixtures/armageddon/replay-session.json" with { type: "json" };
import { nativeReplaySessionTick } from "../src/armageddon/replay-session.js";
import replaySnapshotRestore from "./fixtures/armageddon/replay-snapshot-restore.json" with { type: "json" };
import { nativeRestoreReplaySnapshot } from "../src/armageddon/replay-restore.js";
import replayTreeRestore from "./fixtures/armageddon/replay-tree-restore.json" with { type: "json" };
import { nativeReadReplayTree } from "../src/armageddon/replay-restore.js";
import replayRootRestore from "./fixtures/armageddon/replay-root-restore.json" with { type: "json" };
import { nativeReadReplayRoot } from "../src/armageddon/replay-restore.js";
import replayPresentationRestore from "./fixtures/armageddon/replay-presentation-restore.json" with { type: "json" };
import replayTerrainRestore from "./fixtures/armageddon/replay-terrain-restore.json" with { type: "json" };
import replayActorRestore from "./fixtures/armageddon/replay-actor-restore.json" with { type: "json" };
import { nativeReadReplayActor } from "../src/armageddon/replay-restore.js";
import replayWormRestore from "./fixtures/armageddon/replay-worm-restore.json" with { type: "json" };
import { nativeReadWormTask } from "../src/armageddon/replay-restore.js";
import replayEnvironmentRestore from "./fixtures/armageddon/replay-environment-restore.json" with { type: "json" };
import { nativeReadPhysicsEnvironment } from "../src/armageddon/replay-restore.js";
import replayBodyRestore from "./fixtures/armageddon/replay-body-restore.json" with { type: "json" };
import replayFactory from "./fixtures/armageddon/replay-factory.json" with { type: "json" };
import replayRestore from "./fixtures/armageddon/replay-restore.json" with { type: "json" };
import { nativeReadTaskBase, nativeReadTaskChildren, nativeReadPhysicsTask } from "../src/armageddon/replay-restore.js";
import replayPhysics from "./fixtures/armageddon/replay-physics.json" with { type: "json" };
import { nativeRestorePhysicsMembership } from "../src/armageddon/replay-physics.js";
import replayChildren from "./fixtures/armageddon/replay-children.json" with { type: "json" };
import { nativeWriteReplayTask, nativeReplayTaskTypes } from "../src/armageddon/replay-task.js";
import replayTask from "./fixtures/armageddon/replay-task.json" with { type: "json" };
import { nativeWriteTaskHeader, nativeWriteMatchController, nativeWritePhysicsEnvironment } from "../src/armageddon/replay-task.js";
import replayStream from "./fixtures/armageddon/replay-stream.json" with { type: "json" };
import { NativeReplayStream } from "../src/armageddon/replay-stream.js";
import replayBuffer from "./fixtures/armageddon/replay-buffer.json" with { type: "json" };
import { NativeReplayBuffer } from "../src/armageddon/replay-buffer.js";
import replayControl from "./fixtures/armageddon/replay-control.json" with { type: "json" };
import { nativeReplayCaptureRequest, nativeReplayInput, nativeReplayPlaybackRequest } from "../src/armageddon/replay-control.js";
import windMeter from "./fixtures/armageddon/wind-meter.json" with { type: "json" };
import { nativeWindMeter, nativeWindMeterTick, nativeWindMeterPhase, nativeWindMeterVisibility } from "../src/armageddon/wind-meter.js";
import windSelection from "./fixtures/armageddon/wind-selection.json" with { type: "json" };
import { nativeWindSelection } from "../src/armageddon/wind-selection.js";
import wormRotation from "./fixtures/armageddon/worm-rotation.json" with { type: "json" };
import { nativeWormRotation } from "../src/armageddon/worm-rotation.js";
import teamRotation from "./fixtures/armageddon/team-rotation.json" with { type: "json" };
import { nativeTeamRotationReset, nativeSelectNextTeam } from "../src/armageddon/team-rotation.js";
import turnStart from "./fixtures/armageddon/turn-start.json" with { type: "json" };
import { nativeTurnStart } from "../src/armageddon/turn-start.js";
import retreatRequest from "./fixtures/armageddon/retreat-request.json" with { type: "json" };
import { nativeRetreatRequest } from "../src/armageddon/retreat-request.js";
import actionBusy from "./fixtures/armageddon/action-busy.json" with { type: "json" };
import { nativeActionBusyWrite, nativeActionBusyClear, nativeActionGate } from "../src/armageddon/action-busy.js";
import retreat from "./fixtures/armageddon/retreat.json" with { type: "json" };
import { nativeRetreatTick } from "../src/armageddon/retreat.js";
import settlementEntry from "./fixtures/armageddon/settlement-entry.json" with { type: "json" };
import { nativeSettlementEntry } from "../src/armageddon/settlement-entry.js";
import busyCounter from "./fixtures/armageddon/busy-counter.json" with { type: "json" };
import { NativeBusyCounter } from "../src/armageddon/busy-counter.js";
import settlement from "./fixtures/armageddon/settlement-presentation.json" with { type: "json" };
import { nativeSettlementPresentation } from "../src/armageddon/settlement-presentation.js";
import paletteBanks from "./fixtures/armageddon/palette-banks.json" with { type: "json" };
import { NativePaletteBanks, createNativeGamePaletteBanks } from "../src/armageddon/palette-banks.js";
import gamePalette from "./fixtures/armageddon/game-palette.json" with { type: "json" };
import { NativeGamePalette } from "../src/armageddon/game-palette.js";
import environmentPalette from "./fixtures/armageddon/environment-palette.json" with { type: "json" };
import { nativeEnvironmentPalette } from "../src/armageddon/environment-palette.js";
import { nextLogicRandom } from "../src/armageddon/numeric.js";
import { nativePoisonAnnouncement, nativeKillAnnouncement, nativeCrateDropAnnouncement, nativeWormDeathAnnouncement, nativeVictorySpeech, nativeSuddenDeathAnnouncement, nativeMatchResultAnnouncement, nativeTeamEliminationAnnouncement, nativeAnnouncementAudioTick, nativeAnnouncementsPending, nativeAnnouncementDraw, nativeAnnouncementFrame, nativeAnnouncementMask, createNativeAnnouncements, queueNativeAnnouncement, nativeAnnouncementTick } from "../src/armageddon/announcements.js";
import { nativeTurnClockTick, nativeClockPresentationTick, nativeTimerFont, nativeClockFrame, nativeClockSlide } from "../src/armageddon/number-hud.js";
import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/hud-frame.json" with { type: "json" };
import { nativeTeamPanelSounds, nativeTeamListTick, nativeTeamListRows, sortNativeTeamList, removeNativeTeamListRow, nativeHUDFrame, nativeTeamHighlight, nativeTeamHealthTick, nativeTeamPanelTick, nativeTeamPanelVisibilityTick } from "../src/armageddon/hud-frame.js";
test("HUD frame drawing matches original executable requests", { tag: "@logic" }, () => {
  const initialPlacementPixels=new Uint8Array(1920*696);
  for(let i=0;i<initialPlacementPixels.length;i++)initialPlacementPixels[i]=(0xa5>>(i&7))&1;
  const packPlacement=(pixels,packed)=>{
    packed.fill(0);
    for(let i=0;i<pixels.length;i++)if(pixels[i])packed[i>>3]|=1<<(i&7);
  };
  for(const c of girderBitmap.cases) {
    const memory=new Uint8Array(0x50),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x12000),scene=new DataView(sceneMemory.buffer);
    body.setInt32(0x3c,2,true);body.setInt32(0x4c,3,true);scene.setUint16(0x11d6c,c.distance,true);
    const mask=(width,height,anchorX,anchorY,pixels)=>({width,height,anchorX,anchorY,bitmap:{width,height,pixels}});
    const registry=Array.from({length:32},()=>[]);
    registry[1]=[null,{enabled:1,x:100*65536,y:100*65536,mask:mask(32,16,0,0,girderBitmap.terrain)}];
    registry[2]=[null,{enabled:c.enabled,x:140*65536,y:120*65536,mask:mask(8,8,4,4,girderBitmap.actor)}];
    const sprite={width:8,height:4,pixels:Uint8Array.from({length:32},(_,i)=>!c.pattern || ((i%8)+Math.floor(i/8))%3===0?173:0)};
    const surface={width:1920,height:696,pixels:initialPlacementPixels.slice()};
    const result=nativeGirderPlacement(memory,sceneMemory,c.x,c.y,sprite,registry,()=>({x:90*65536,y:90*65536}),surface);
    const packed=new Uint8Array(surface.pixels.length/8);packPlacement(surface.pixels,packed);
    expect({result,surfaceHash:createHash("sha256").update(packed).digest("hex")}).toEqual({result:c.result,surfaceHash:c.surfaceHash});
    // Exercise the host adapter against the same native full-bitmap output.
    const terrain = { solid(x,y) {
      const sx=x-100,sy=696-1-y-100;
      return sx>=0 && sx<32 && sy>=0 && sy<16 && !!girderBitmap.terrain[sy*32+sx];
    } };
    const liveScene=new NativeCollisionScene(terrain,696);
    const points=girderBitmap.actor.flatMap((value,i)=>value?[[i%8,Math.floor(i/8)]]:[]);
    liveScene.rows[2]=[null,{enabled:c.enabled,x:140*65536,y:120*65536,
      mask:{width:8,height:8,anchorX:4,anchorY:4,planes:[{points}]}}];
    const originalMask=liveScene.rows[2][1].mask;
    const adapted=liveScene.placementRegistry(1920);
    surface.pixels.set(initialPlacementPixels);
    const adaptedResult=nativeGirderPlacement(memory,sceneMemory,c.x,c.y,sprite,adapted,()=>({x:90*65536,y:90*65536}),surface);
    packPlacement(surface.pixels,packed);
    expect({result:adaptedResult,surfaceHash:createHash("sha256").update(packed).digest("hex")}).toEqual({result:c.result,surfaceHash:c.surfaceHash});
    expect(liveScene.rows[2][1].mask).toBe(originalMask);
    expect(adapted[2][0]).toBeNull();
    if(c===girderBitmap.cases[0]) {
      terrain.solid=()=>false;
      expect(liveScene.placementRegistry(1920)[1][0].mask.bitmap.pixels.some(Boolean)).toBe(false);
      expect(adapted[1][0].mask.bitmap.pixels.some(Boolean)).toBe(true);
    }
  }
  for(const c of placementBitmap.cases) {
    const destination={width:32,height:16,clip:c.clip,pixels:Uint8Array.from(c.initial)};
    const source={width:24,height:12,pixels:Uint8Array.from(c.source)};
    const result=nativePlacementBitmapBlit(destination,c.x,c.y,c.width,c.height,source,c.sx,c.sy,c.mode);
    expect({result,output:[...destination.pixels]}).toEqual({result:c.result,output:c.output});
  }
  for(const c of collisionDraw.cases) {
    const bodies=new Map(c.bodies.map(body=>[body.id,{...body,mask:body.id}]));
    const registry=c.registry.map(row=>row.map(id=>bodies.get(id)??null)),calls=[];
    nativeDrawCollisionRegistry(registry,"surface",c.dx,c.dy,bodies.get(c.excluded),c.flags,c.mode,{
      bounds:mask=>calls.push(["bounds",mask]),
      draw:(mask,surface,x,y,mode)=>{expect(surface).toBe("surface");calls.push(["draw",mask,x,y,mode]);},
    });
    expect(calls).toEqual(c.calls);
  }
  for(const c of teleportPlacement.cases) {
    const memory=new Uint8Array(0x300),view=new DataView(memory.buffer),calls=[];let attempts=0;
    for(const [offset,value] of Object.entries(c.fields))view.setInt32(Number(offset),value,true);
    const result=nativeTeleportPlacement(memory,c.x,c.y,c.ceiling,(body,x,y)=>{
      calls.push([body.flags,x,y,body.x,body.y,body.sleeping]);
      return body.flags===2?c.restoreBlocked:Number(attempts++!==c.acceptAt);
    });
    expect({calls,accepted:result.accepted,output:[result.x,result.y],final:Object.keys(c.fields).map(o=>view.getInt32(Number(o),true))}).toEqual({calls:c.calls,accepted:c.accepted,output:c.output,final:c.final});
  }
  for(const c of wormQuery.cases) {
    const memory=Uint8Array.from({length:0x300},(_,i)=>(i*17+c.seed*31)&255),payload=Uint8Array.from(c.input),calls=[];
    let position=[...c.position],mode=c.mode,placements=0;
    const returned=nativeWormQuery(memory,c.event,0x154,payload,{
      position:()=>{calls.push(["position"]);return [...position];},
      mode:()=>{calls.push(["mode"]);return mode;},
      setMode:value=>{calls.push(["setMode",value]);mode=value;},
      place:(x,y)=>{calls.push(["place",x,y]);position=[x,y];return ++placements===1?c.result:99;},
      status:()=>{calls.push(["status"]);return c.status;},
      base:(event,size,output)=>{calls.push(["base",event,size]);new DataView(output.buffer).setInt32(12,123456,true);return c.result;},
    });
    expect({returned,calls,output:[...payload],finalPosition:position,finalMode:mode}).toEqual({returned:c.returned,calls:c.calls,output:c.output,finalPosition:c.finalPosition,finalMode:c.finalMode});
  }
  for(const c of wormQuery.composed) {
    const memory=Uint8Array.from({length:0x300},(_,i)=>(i*17+c.seed*31)&255),calls=[];
    let position=[...c.position],mode=c.mode,placements=0;
    const host={
      position:()=>{calls.push(["position"]);return [...position];},
      mode:()=>{calls.push(["mode"]);return mode;},
      setMode:value=>{calls.push(["setMode",value]);mode=value;},
      place:(x,y)=>{calls.push(["place",x,y]);position=[x,y];placements++;return placements%2?Number(Math.floor((placements-1)/2)===c.acceptAt):99;},
    };
    const result=nativeFindTeleportTarget(c.x,c.y,c.ceiling,(event,payload)=>nativeWormQuery(memory,event,payload.length,payload,host));
    expect({calls,accepted:result.accepted,output:[result.x,result.y],finalPosition:position,finalMode:mode}).toEqual({calls:c.calls,accepted:c.accepted,output:c.output,finalPosition:c.finalPosition,finalMode:c.finalMode});
  }
  for(const c of girderPlacement.cases) {
    const memory=new Uint8Array(0x50),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x12000),scene=new DataView(sceneMemory.buffer),calls=[];
    body.setInt32(0x3c,2,true);body.setInt32(0x4c,3,true);scene.setUint16(0x11d6c,c.distance,true);
    const result=nativeValidateGirderTarget(memory,sceneMemory,c.x,c.y,"shape",{
      dimensions:()=>{calls.push(["dimensions"]);return c.dimensions;},
      lookup:(...args)=>{calls.push(["lookup",...args]);return c.found;},
      position:()=>{calls.push(["position"]);return c.position;},
      clear:()=>calls.push(["clear"]),draw:(...args)=>calls.push(["draw",...args]),
      overlap:(...args)=>{calls.push(["overlap",...args]);return c.hit;},
    });
    expect({calls,result}).toEqual({calls:c.calls,result:c.result});
  }
  for(const c of targetPlacement.bounds) {
    expect(nativeClampPlacementTarget(c.x,c.y,...c.dimensions,c.ceiling)).toEqual(c.output);
  }
  for(const c of targetPlacement.teleport) {
    const calls=[];
    const result=nativeFindTeleportTarget(c.x,c.y,c.ceiling,(event,payload)=>{
      const view=new DataView(payload.buffer,payload.byteOffset,payload.byteLength);
      calls.push([event,payload.length,view.getInt32(0,true),view.getInt32(4,true)]);
      view.setInt32(0,view.getInt32(0,true)+c.adjust[0],true);
      view.setInt32(4,view.getInt32(4,true)+c.adjust[1],true);
      return calls.length-1===c.acceptAt;
    });
    expect({calls,accepted:result.accepted,output:[result.x,result.y]}).toEqual({calls:c.calls,accepted:c.accepted,output:c.output});
  }
  for (const c of controllerPointerInput.cases) {
    const memory=new Uint8Array(0x120),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000),scene=new DataView(sceneMemory.buffer);
    for(const [offset,value] of Object.entries(c.fields))body.setInt32(Number(offset),value,true);
    for(const [start,count,values] of [[0x1b822,0x1b842,c.controllers],[0x1b7ba,0x1b7da,c.owners],[0x1b778,0x1b798,c.free]]) {
      scene.setInt16(count,values.length,true);values.forEach((value,i)=>scene.setInt16(start+i*2,value,true));
    }
    c.priorities.forEach((value,i)=>scene.setInt16(0x1b79a+i*2,value,true));
    [...c.xy,123,456].forEach((value,i)=>scene.setInt32(controllerPointerInput.sceneOffsets[i],value,true));
    const calls=[],queue=new NativeReplayBuffer(c.capacity);
    nativeCollectPointerInput(memory,sceneMemory,c.hasQueue?queue:null,{
      wormBusy:(...args)=>{calls.push(["busy",...args]);return c.busy;},
      wormState:(...args)=>{calls.push(["state",...args]);return c.state;},
      weaponAvailable:(team,slot)=>{calls.push(["available",team,slot]);return slot===c.available;},
      pointerSample:()=>{calls.push(["pointer"]);return {dx:c.sample[0],dy:c.sample[1],buttons:c.sample[2]};},
      pointerResetA:()=>calls.push(["resetA"]),pointerResetB:()=>calls.push(["resetB"]),
      key:key=>{calls.push(["key",key]);return c.keys.includes(key);},sound:(...args)=>calls.push(["sound",...args]),
    });
    const events=[];for(let e=queue.readEvent();e;e=queue.readEvent())events.push([e.event,e.payload]);
    expect({calls,events,body:controllerPointerInput.bodyOffsets.map(o=>body.getInt32(o,true)),scene:controllerPointerInput.sceneOffsets.map(o=>scene.getInt32(o,true)),ownership:[...sceneMemory.slice(0x1b778,0x1b7dc)]}).toEqual({calls:c.calls,events:c.events,body:c.body,scene:c.scene,ownership:c.ownership});
  }
  for(const c of controllerPresentation.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000),scene=new DataView(sceneMemory.buffer),calls=[];
    for(const [o,v] of Object.entries(c.fields))body.setInt32(Number(o),v,true);
    controllerPresentation.sceneOffsets.forEach((o,i)=>scene.setInt32(o,c.initial[i],true));scene.setInt32(0x1d444,c.blocked,true);
    nativeUpdateControllerPresentation(memory,sceneMemory,{
      teamVisible:team=>{calls.push(["visible",team]);return c.visible;},teamIndicator:team=>{calls.push(["indicator",team]);return c.indicator;},
      arsenalMeasure:()=>{calls.push(["measure"]);return [c.width,c.height];},
      arsenalLayout:(...args)=>{calls.push(["layout",...args]);expect(scene.getInt32(0x12474,true)).toBe(0);expect(scene.getInt32(0x12478,true)).toBe(0);return [c.x,c.y];},
      arsenalPosition:(...args)=>calls.push(["position",...args]),arsenalSelection:()=>{calls.push(["selection"]);return c.selection;},
    });
    expect({calls,body:controllerPresentation.offsets.map(o=>body.getInt32(o,true)),scene:controllerPresentation.sceneOffsets.map(o=>scene.getInt32(o,true))}).toEqual({calls:c.calls,body:c.body,scene:c.scene});
  }
  for(const c of controllerFrameInput.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000),scene=new DataView(sceneMemory.buffer),calls=[];
    for(const [o,v] of Object.entries(c.fields))body.setInt32(Number(o),v,true);
    scene.setInt16(0x1b8aa,c.owners.length,true);c.owners.forEach((v,i)=>scene.setInt16(0x1b88a+i*2,v,true));
    scene.setInt32(0x12418,c.paused,true);scene.setInt32(0x1247c,111,true);scene.setInt32(0x12480,222,true);
    const collect=c.kind==="camera"?nativeCollectCameraInput:nativeCollectPauseInput;
    collect(memory,sceneMemory,{
      key:key=>{calls.push(["key",key]);return c.pressed;},consume:key=>calls.push(["consume",key]),
      wormState:(...args)=>{calls.push(["state",...args]);return c.state;},lookup:(...args)=>{calls.push(["lookup",...args]);return c.exists?1:0;},
      wormQuery:(...args)=>{calls.push(["query",...args]);if(!c.valid)return null;const p=new Uint8Array(0x154),v=new DataView(p.buffer);v.setInt32(0,c.x,true);v.setInt32(4,c.y,true);return p;},
      sendTask:(type,id,event,size,payload)=>calls.push(["send",type,id,event,size,[...payload]]),
      cameraMode:mode=>calls.push(["mode",mode]),cameraPosition:(...args)=>calls.push(["position",...args]),
    });
    expect({calls,scene:[0x12418,0x1247c,0x12480].map(o=>scene.getInt32(o,true))}).toEqual({calls:c.calls,scene:c.scene});
  }
  for(const c of controllerFrame.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000),scene=new DataView(sceneMemory.buffer),calls=[];
    for(const [o,v] of Object.entries(c.fields))body.setInt32(Number(o),v,true);
    scene.setInt8(0x11d7c,c.active);scene.setInt8(0x11e78,c.spectator);scene.setInt32(0x20,c.network,true);
    scene.setInt32(0x1247c,123456,true);scene.setInt32(0x12480,-131072,true);
    const payload=new Uint8Array(4);new DataView(payload.buffer).setInt32(0,123,true);
    expect(nativeControllerCommand(memory,sceneMemory,c.event,payload,{
      forward:(event,p)=>calls.push(["forward",event,[...p]]),
      weaponAvailable:(...args)=>{calls.push(["available",...args]);return c.available;},
      wormBusy:(...args)=>{calls.push(["busy",...args]);return c.busy;},
      selectionCommand:(...args)=>calls.push(["select",...args]),sendTask:(...args)=>calls.push(["send",...args]),
      cameraTarget:(...args)=>calls.push(["camera",...args]),selectionSound:(...args)=>calls.push(["sound",...args]),
      updatePresentation:()=>calls.push(["update"]),collectCameraInput:()=>calls.push(["cameraInput"]),collectPauseInput:()=>calls.push(["pauseInput"]),
      drawPresentation:()=>calls.push(["draw"]),drawTargeting:()=>calls.push(["targetDraw"]),drawCountdown:()=>calls.push(["timerDraw"]),collectInput:token=>calls.push(["input",token]),
    })).toBe(true);
    expect({calls,body:controllerFrame.offsets.map(o=>body.getInt32(o,true))}).toEqual({calls:c.calls,body:c.body});
  }
  for(const c of weaponDelays.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),calls=[],delays=[...c.initial];
    for(const [o,v] of [[0x3c,c.team],[0x54,c.priority],[0xc8,c.dirty]])body.setInt32(o,v,true);
    nativeAdvanceWeaponDelays(memory,{
      weaponDelay:(team,slot)=>{calls.push(["delay",team,slot]);return delays[slot-1];},
      setWeaponDelay:(team,slot,value)=>{calls.push(["set",team,slot,value]);delays[slot-1]=value;},
      weaponUnlockTemplates:()=>{calls.push(["templates"]);return c.texts;},random:()=>{calls.push(["random"]);return c.rng;},
      formatTeamAnnouncement:(template,team)=>{calls.push(["format",template,team]);return template.replace("%s","TeamName");},
      announce:(...args)=>calls.push(["announce",...args]),teamSound:(...args)=>{calls.push(["teamSound",...args]);return 123;},
      sound:(...args)=>calls.push(["sound",...args]),
    });
    expect({calls,delays,resultDirty:body.getInt32(0xc8,true)}).toEqual({calls:c.calls,delays:c.delays,resultDirty:c.resultDirty});
  }
  for(const c of controllerShot.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000);
    for(const [offset,value] of Object.entries(c.fields))body.setInt32(Number(offset),value,true);
    sceneMemory.set(c.initial,0x1b778);const calls=[];
    expect(nativeControllerCommand(memory,sceneMemory,0x431,Uint8Array.from(c.payload),{
      consumeWeapon:(...args)=>calls.push(["consume",...args]),
      shotText:(...args)=>{calls.push(["text",...args]);return args[0]===0x60?"finished":args[0]===0x64?"one left":`${args[1]} left`;},
      announce:(...args)=>calls.push(["announce",...args]),forward:(event,p)=>calls.push(["forward",event,[...p]]),
    })).toBe(true);
    expect({calls,body:controllerShot.offsets.map(o=>body.getInt32(o,true)),ownership:[...sceneMemory.slice(0x1b778,0x1b7dc)]}).toEqual({calls:c.calls,body:c.body,ownership:c.ownership});
  }
  for(const c of controllerPostShot.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000);
    for(const [offset,value] of Object.entries(c.fields))body.setInt32(Number(offset),value,true);
    sceneMemory.set(c.initial,0x1b778);const calls=[],descriptor=new Uint8Array(0x200);
    new DataView(descriptor.buffer).setInt32(0x4c,c.selectable,true);
    const host={
      wormHealth:(...args)=>{calls.push(["health",...args]);return c.health;},
      weaponDescriptor:slot=>{calls.push(["descriptor",slot]);return descriptor;},
      findDefaultWeapon:worm=>{calls.push(["default",worm]);return 17;},
      weaponAvailable:(...args)=>{calls.push(["available",...args]);return c.available;},
      consumeWeapon:(...args)=>calls.push(["consume",...args]),
      wormBusy:(...args)=>{calls.push(["busy",...args]);return c.busy;},
      selectionCommand:(...args)=>calls.push(["select",...args]),
    };
    if(c.mode!=="pending") {
      const payload=new Uint8Array(4);new DataView(payload.buffer).setInt32(0,c.team,true);
      expect(nativeControllerCommand(memory,sceneMemory,0x432,payload,host)).toBe(true);
    }
    if(c.mode!=="post")nativeControllerPendingWeapon(memory,host);
    expect({calls,body:controllerPostShot.offsets.map(o=>body.getInt32(o,true)),ownership:[...sceneMemory.slice(0x1b778,0x1b7dc)]}).toEqual({calls:c.calls,body:c.body,ownership:c.ownership});
  }
  for(const c of controllerControl.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000);
    for(const [offset,value] of Object.entries(c.fields))body.setInt32(Number(offset),value,true);
    sceneMemory.set(c.initial,0x1b778);const calls=[];
    expect(nativeControllerCommand(memory,sceneMemory,c.event,Uint8Array.from(c.payload),{
      forward:(event,p)=>calls.push(["forward",event,[...p]]),sendTask:(type,id,event)=>calls.push(["send",type,id,event]),
      selectWorm:worm=>calls.push(["select",worm]),wormCount:team=>{calls.push(["count",team]);return c.count;},
      wormHealth:(team,worm)=>{calls.push(["health",team,worm]);return worm===c.living?100:0;},
      selectionSound:(...args)=>calls.push(["sound",...args]),
    })).toBe(true);
    expect({calls,body:controllerControl.offsets.map(o=>body.getInt32(o,true)),ownership:[...sceneMemory.slice(0x1b778,0x1b7dc)]}).toEqual({calls:c.calls,body:c.body,ownership:c.ownership});
  }
  for(const c of controllerActivation.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000),scene=new DataView(sceneMemory.buffer);
    for(const [offset,value] of Object.entries(c.fields))body.setInt32(Number(offset),value,true);
    sceneMemory.set(c.initial,0x1b778);scene.setInt8(0x11d7c,c.active);scene.setUint8(0x11d6a,c.duration);
    const payload=new Uint8Array(4);new DataView(payload.buffer).setInt32(0,c.team,true);const calls=[];
    expect(nativeControllerCommand(memory,sceneMemory,0x41c,payload,{
      forward:(event,p)=>calls.push(["forward",event,[...p]]),
      sendWorm:(type,id,event,p)=>calls.push(["send",type,id,event,[...p]]),sendTask:(type,id,event)=>calls.push(["send",type,id,event,[]]),
      matchMode:mode=>{calls.push(["mode",mode]);return c.mode;},selfEvent:(event,size)=>calls.push(["self",event,size]),
      advanceWeaponDelays:()=>calls.push(["delays"]),repeatKey:key=>calls.push(["repeat",key]),
      selectDefaultWeapon:worm=>calls.push(["default",worm]),
      teamSound:(...args)=>{calls.push(["teamSound",...args]);return 77;},sound:(...args)=>calls.push(["sound",...args]),
      allocateAI:size=>{calls.push(["allocate",size]);return c.allocation?1:0;},constructAI:(_, ...args)=>calls.push(["construct",...args]),
    })).toBe(true);
    expect({calls,body:controllerActivation.offsets.map(o=>body.getInt32(o,true)),ownership:[...sceneMemory.slice(0x1b778,0x1b8ac)]}).toEqual({calls:c.calls,body:c.body,ownership:c.ownership});
  }
  for(const c of controllerDeactivation.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000),scene=new DataView(sceneMemory.buffer);
    for(const [offset,value] of Object.entries(c.fields))body.setInt32(Number(offset),value,true);
    sceneMemory.set(c.initial,0x1b778);scene.setInt8(0x11d7c,c.active);
    const payload=new Uint8Array(4);new DataView(payload.buffer).setInt32(0,c.team,true);const calls=[];
    expect(nativeControllerCommand(memory,sceneMemory,c.event,payload,{
      sendWorm:(type,id,event,p)=>calls.push(["send",type,id,event,[...p]]),
      sendTask:(type,id,event)=>calls.push(["send",type,id,event,[]]),
      repeatKey:key=>calls.push(["repeat",key]),
      wormState:(...args)=>{calls.push(["state",...args]);return c.state;},
      setTeamState:(...args)=>calls.push(["teamState",...args]),
      weaponAvailable:(...args)=>{calls.push(["available",...args]);return 1;},
      consumeWeapon:(...args)=>calls.push(["consume",...args]),
      releaseCamera:mode=>calls.push(["camera",mode]),
      lookup:(...args)=>{calls.push(["lookup",...args]);return c.exists?1:0;},
      destroyActor:(_,flag)=>calls.push(["destroy",flag]),
    })).toBe(true);
    expect({calls,body:controllerDeactivation.offsets.map(o=>body.getInt32(o,true)),ownership:[...sceneMemory.slice(0x1b778,0x1b8ac)]}).toEqual({calls:c.calls,body:c.body,ownership:c.ownership});
  }
  for(const c of defaultWeapon.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000),scene=new DataView(sceneMemory.buffer);
    body.setInt32(0x3c,2,true);body.setInt32(0x4c,3,true);body.setInt32(0x44,c.controller,true);body.setInt32(0x40,1,true);body.setInt32(0xf0,-1,true);body.setInt32(0xe8,-1,true);scene.setInt32(0x4730+(2*75+4)*40,c.saved,true);
    const calls=[],host={
      wormState:(...args)=>{calls.push(["state",...args]);return c.state;},
      selectedWeapon:(...args)=>{calls.push(["selected",...args]);return c.selected;},
      weaponAvailable:(team,slot)=>{calls.push(["available",team,slot]);return c.inventory.includes(slot);},
      teamFlags:team=>{calls.push(["flags",team]);return c.flags;},
      weaponDescriptor:slot=>{calls.push(["descriptor",slot]);const d=new Uint8Array(0x200),v=new DataView(d.buffer);for(const [o,value] of Object.entries(c.descriptors[slot]??{}))v.setInt32(Number(o),value,true);return d;},
      selectionSound:(...args)=>calls.push(["sound",...args]),sendWorm:(...args)=>calls.push(["send",...args.map(v=>v??0)]),
      setWeaponAmmo:(...args)=>calls.push(["ammo",...args]),selectInventory:(...args)=>calls.push(["inventory",...args]),selectionCommand:(...args)=>calls.push(["command",...args]),
    };
    const result=c.routine==="0x4e55d0"?nativeFindDefaultWeapon(memory,sceneMemory,4,host):c.routine==="0x4e54d0"?nativeSelectDefaultWeapon(memory,sceneMemory,4,host):nativeSelectControllerWorm(memory,sceneMemory,4,host);
    expect(calls).toEqual(c.calls);if(c.result!==null)expect(result).toBe(c.result);
  }
  for(const c of wormSelection.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000);
    for(const [offset,value] of Object.entries(c.fields))body.setInt32(Number(offset),value,true);
    sceneMemory.set(c.initial,0x1b778);const calls=[];
    nativeSelectControllerWorm(memory,sceneMemory,c.next,{
      repeatKey:key=>calls.push(["repeat",key]),
      sendWorm:(...args)=>calls.push(["send",...args.map(value=>value??0)]),
      selectionSound:(...args)=>calls.push(["sound",...args]),
      selectDefaultWeapon:worm=>calls.push(["default",worm]),
    });
    expect({calls,body:wormSelection.offsets.map(o=>body.getInt32(o,true)),ownership:[...sceneMemory.slice(0x1b778,0x1b8ac)]}).toEqual({calls:c.calls,body:c.body,ownership:c.ownership});
  }
  for(const c of controllerCommand.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000),scene=new DataView(sceneMemory.buffer);
    for(const [offset,value] of Object.entries(c.fields))body.setInt32(Number(offset),value,true);
    const calls=[];
    expect(nativeControllerCommand(memory,sceneMemory,c.event,Uint8Array.from(c.payload),{
      wormBusy:(...args)=>{calls.push(["busy",...args]);return c.busy;},
      resetTeam:team=>calls.push(["reset",team]),
      teamVisible:team=>{calls.push(["visible",team]);return c.visible;},
      teamFlags:team=>{calls.push(["flags",team]);return c.flags;},
      targetEffect:(...args)=>calls.push(["effect",...args]),
      sendWorm:(type,id,event,p)=>calls.push(["send",type,id,event,[...p]]),
      forward:(event,p)=>calls.push(["forward",event,[...p]]),
    })).toBe(true);
    expect({calls,body:controllerCommand.offsets.map(o=>body.getInt32(o,true)),target:[0x1247c,0x12480].map(o=>scene.getInt32(o,true))}).toEqual({calls:c.calls,body:c.body,target:c.target});
  }
  for(const c of weaponSelection.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000),scene=new DataView(sceneMemory.buffer);
    for(const [offset,value] of Object.entries(c.fields))body.setInt32(Number(offset),value,true);
    sceneMemory.set(c.initial,0x1b778);scene.setInt8(0x11d7c,c.active);scene.setInt32(0x1d444,c.mode,true);scene.setInt32(0x804,696,true);
    scene.setInt32(0x1247c,123,true);scene.setInt32(0x12480,700*65536,true);
    const descriptor=new Uint8Array(0x200),descriptorView=new DataView(descriptor.buffer);
    for(const [offset,value] of Object.entries(c.descriptor))descriptorView.setInt32(Number(offset),value,true);
    const payload=new Uint8Array(16),command=new DataView(payload.buffer);c.words.forEach((value,i)=>command.setInt32(i*4,value,true));
    const calls=[];
    nativeControllerCommand(memory,sceneMemory,0x41b,payload,{
      wormBusy:(...args)=>{calls.push(["busy",...args]);return c.busy;},
      weaponAvailable:(...args)=>{calls.push(["available",...args]);return c.available;},
      lookup:(...args)=>{calls.push(["lookup",...args]);return 1;},
      wormQuery:(_,event,size)=>{calls.push(["query",event,size]);const p=new Uint8Array(size),v=new DataView(p.buffer);if(event===0x7d3)v.setInt32(0x20,c.blocked,true);else {v.setInt32(0,100*65536+123,true);v.setInt32(4,20*65536+456,true);}return p;},
      weaponDescriptor:slot=>{calls.push(["descriptor",slot]);return descriptor;},
      selectInventory:(...args)=>calls.push(["inventory",...args]),
      wormState:(...args)=>{calls.push(["state",...args]);return c.state;},
      cameraMode:mode=>calls.push(["mode",mode]),cameraTarget:(...args)=>calls.push(["target",...args]),
      targetShape:()=>{calls.push(["shape"]);return {width:33,height:17};},
      forward:(event,p)=>calls.push(["forward",event,p.length,[...p]]),
    });
    expect({calls,body:weaponSelection.offsets.map(o=>body.getInt32(o,true)),target:[0x1247c,0x12480].map(o=>scene.getInt32(o,true)),ownership:[...sceneMemory.slice(0x1b778,0x1b7dc)]}).toEqual({calls:c.calls,body:c.body,target:c.target,ownership:c.ownership});
  }
  for(const c of weaponInputFlags.cases) {
    const descriptor=new Uint8Array(0x200),view=new DataView(descriptor.buffer);
    for(const [offset,value] of Object.entries(c.fields))view.setInt32(Number(offset),value,true);
    expect(nativeWeaponInputFlags(descriptor)).toEqual(c.output);
    const controller=new Uint8Array(0x110).fill(0xa5),expected=controller.slice(),expectedView=new DataView(expected.buffer);
    c.output.forEach((value,i)=>expectedView.setInt32(nativeWeaponInputOffsets[i],value,true));
    nativeApplyWeaponInputFlags(controller,descriptor);expect(Buffer.from(controller).equals(Buffer.from(expected))).toBe(true);
  }
  for(const c of targetEntry.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000),scene=new DataView(sceneMemory.buffer);
    for(const [offset,value] of Object.entries(c.fields))body.setInt32(Number(offset),value,true);
    sceneMemory.set(c.initial,0x1b778);scene.setInt8(0x11d7c,c.active);scene.setInt32(0x804,696,true);
    [0x1247c,0x12480].forEach((o,i)=>scene.setInt32(o,c.xy[i],true));
    const calls=[];
    nativeBeginTargeting(memory,sceneMemory,{
      wormState:(...args)=>{calls.push(["state",...args]);return c.state;},
      lookup:(...args)=>{calls.push(["lookup",...args]);return 1;},
      wormQuery:(_,event,size)=>{calls.push(["query",event,size]);const p=new Uint8Array(size),v=new DataView(p.buffer);c.position.forEach((value,i)=>v.setInt32(i*4,value,true));return p;},
      cameraMode:mode=>calls.push(["mode",mode]),cameraTarget:(...args)=>calls.push(["target",...args]),
    });
    expect({calls,body:targetEntry.offsets.map(o=>body.getInt32(o,true)),target:[0x1247c,0x12480].map(o=>scene.getInt32(o,true)),output:[...sceneMemory.slice(0x1b778,0x1b7dc)]}).toEqual({calls:c.calls,body:c.body,target:c.target,output:c.output});
  }
  for(const c of targetTeardown.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000);
    [0xac,0xbc,0xe8].forEach((offset,i)=>body.setInt32(offset,[...c.flags,c.handle][i],true));
    sceneMemory.set(c.initial,0x1b778);nativeEndTargeting(memory,sceneMemory);
    expect({body:[0xac,0xbc,0xe8].map(o=>body.getInt32(o,true)),output:[...sceneMemory.slice(0x1b778,0x1b7dc)]}).toEqual({body:c.body,output:c.output});
  }
  for(const c of targetInput.cases) {
    const memory=new Uint8Array(0x200),body=new DataView(memory.buffer),sceneMemory=new Uint8Array(0x20000),scene=new DataView(sceneMemory.buffer);
    for(const [offset,value] of Object.entries(c.fields))body.setInt32(Number(offset),value,true);
    for(const [start,count,values] of [[0x1b822,0x1b842,c.controllers],[0x1b7ba,0x1b7da,c.owners],[0x1b88a,0x1b8aa,c.keyowners]]) {
      scene.setInt16(count,values.length,true);values.forEach((value,i)=>scene.setInt16(start+i*2,value,true));
    }
    for(const [offset,value] of [[0x1247c,c.xy[0]],[0x12480,c.xy[1]],[0x1b8cc,0],[0x1b8d0,1920*65536],[0x804,696],[0x1b8ac,c.ceiling]])scene.setInt32(offset,value,true);
    const calls=[],queue=new NativeReplayBuffer(c.capacity);
    nativeCollectTargetInput(memory,sceneMemory,queue,{
      wormBusy:(...args)=>{calls.push(["busy",...args]);return c.busy;},
      lookup:(...args)=>{calls.push(["lookup",...args]);return 1;},
      wormQuery:(_,event,size)=>{calls.push(["query",event,size]);const p=new Uint8Array(size),v=new DataView(p.buffer);v.setInt32(0x14,c.allow,true);v.setInt32(0x18,c.allow,true);return p;},
      key:key=>{calls.push(["key",key]);return c.keys.includes(key);},
      repeatKey:key=>calls.push(["repeat",key]),consume:key=>calls.push(["consume",key]),
      pointerSample:()=>{calls.push(["pointer"]);return {dx:c.sample[0],dy:c.sample[1],buttons:c.sample[2]};},
      pointerResetA:()=>calls.push(["resetA"]),pointerResetB:()=>calls.push(["resetB"]),
      targetShape:()=>{calls.push(["shape"]);return {width:33,height:17};},
      girderTarget:(x,y)=>{calls.push(["girder",x,y]);return c.accept;},
      teleportTarget:(x,y)=>{calls.push(["teleport",x,y]);return {x,y:(y+65536)|0,accepted:c.accept};},
      sound:(...args)=>calls.push(["sound",...args]),
      wormState:(...args)=>{calls.push(["state",...args]);return c.state;},
    });
    const events=[];for(let e=queue.readEvent();e;e=queue.readEvent())events.push([e.event,e.payload]);
    expect({calls,events,output:[body.getInt32(0xe0,true),scene.getInt32(0x1247c,true),scene.getInt32(0x12480,true)],targetFlags:[0xac,0xbc,0xe8].map(o=>body.getInt32(o,true)),ownership:[...sceneMemory.slice(0x1b778,0x1b7dc)]}).toEqual({calls:c.calls.filter(call=>call[0]!=="end"),events:c.events,output:c.output,targetFlags:c.targetFlags,ownership:c.ownership});
  }
  for (const c of targetActivation.cases) {
    const memory=new Uint8Array(0xb0),body=new DataView(memory.buffer);
    for(const [offset,value] of Object.entries(c.fields))body.setInt32(Number(offset),value,true);
    const calls=[],queue=new NativeReplayBuffer(c.capacity);
    nativeCollectTargetActivation(memory,queue,{
      wormBusy:(...args)=>{calls.push(["busy",...args]);return c.busy;},
      pointerSample:()=>{calls.push(["pointer"]);return {dx:c.sample[0],dy:c.sample[1],buttons:c.sample[2]};},
      pointerResetA:()=>calls.push(["resetA"]),pointerResetB:()=>calls.push(["resetB"]),
    });
    const events=[];for(let e=queue.readEvent();e;e=queue.readEvent())events.push([e.event,e.payload]);
    expect({calls,events}).toEqual({calls:c.calls,events:c.events});
  }
  for (const c of controllerWeaponInput.cases) {
    const memory = new Uint8Array(0x110), body = new DataView(memory.buffer);
    for (const [offset,value] of Object.entries(c.fields)) body.setInt32(Number(offset),value,true);
    const calls = [], keys = new Set(c.keys), queue = new NativeReplayBuffer(c.capacity);
    nativeCollectWeaponInput(memory,queue,{
      wormBusy: (...args) => { calls.push(["busy",...args]);return c.busy; },
      weaponAvailable: (team,slot) => { calls.push(["available",team,slot]);return Object.hasOwn(c.available,slot); },
      weaponCategory: slot => { calls.push(["category",slot]);return c.available[slot]; },
      key: key => { calls.push(["key",key]);return keys.has(key); },
      consume: key => { calls.push(["consume",key]);keys.delete(key); },
    });
    const events = [];for(let event=queue.readEvent();event;event=queue.readEvent())events.push([event.event,event.payload]);
    expect({calls,events}).toEqual({calls:c.calls,events:c.events});
  }
  for (const c of controllerMovementInput.cases) {
    const memory = new Uint8Array(0x110), body = new DataView(memory.buffer);
    for (const [offset,value] of Object.entries(c.fields)) body.setInt32(Number(offset),value,true);
    const calls = [], keys = new Set(c.keys), states = [...c.states], queue = new NativeReplayBuffer(c.capacity);
    nativeCollectMovementInput(memory,queue,{
      wormState: (...args) => { calls.push(["state",...args]);return states.shift(); },
      wormBusy: (...args) => { calls.push(["busy",...args]);return c.busy; },
      key: key => { calls.push(["key",key]);return keys.has(key); },
      consume: key => { calls.push(["consume",key]);keys.delete(key); },
    });
    const events = [];for(let event=queue.readEvent();event;event=queue.readEvent())events.push([event.event,event.payload]);
    expect({calls,events,latch:body.getInt32(0x108,true)}).toEqual({calls:c.calls,events:c.events,latch:c.latch});
  }
  for (const c of controllerMenuInput.cases) {
    const memory = new Uint8Array(0x110), sceneMemory = new Uint8Array(0x1d480);
    const body = new DataView(memory.buffer), scene = new DataView(sceneMemory.buffer);
    for (const [offset,value] of Object.entries(c.fields)) body.setInt32(Number(offset),value,true);
    scene.setInt16(0x1b8aa,c.controllers.length,true);
    c.controllers.forEach((value,i)=>scene.setInt16(0x1b88a+i*2,value,true));
    const calls = [], keys = new Set(c.keys), queue = new NativeReplayBuffer(c.capacity);
    nativeCollectMenuInput(memory,sceneMemory,queue,{
      lookup: (...args) => { calls.push(["lookup",...args]); return 7; },
      wormQuery: (worm,event,size) => { calls.push(["wormQuery",event,size]); const out=new Uint8Array(size);new DataView(out.buffer).setInt32(0x1c,c.busy,true);return out; },
      wormState: (...args) => { calls.push(["state",...args]); return c.state; },
      key: key => { calls.push(["key",key]);return keys.has(key); },
      consume: key => { calls.push(["consume",key]);keys.delete(key); },
    });
    const events = [];for(let event=queue.readEvent();event;event=queue.readEvent())events.push([event.event,event.payload]);
    expect({calls,events,latch:body.getInt32(0x108,true)}).toEqual({calls:c.calls,events:c.events,latch:c.latch});
  }
  for (const c of controllerInput.cases) {
    const memory = new Uint8Array(0x110), sceneMemory = new Uint8Array(0x1d480);
    const body = new DataView(memory.buffer), scene = new DataView(sceneMemory.buffer);
    for (const [offset,value] of Object.entries(c.fields)) body.setInt32(Number(offset),value,true);
    scene.setInt8(0x11d7c,c.active); scene.setInt32(0x1d444,c.replaying,true);
    scene.setInt16(0x1b8aa,c.controllers.length,true);
    c.controllers.forEach((value,i)=>scene.setInt16(0x1b88a+i*2,value,true));
    const calls = [], answers = [...c.stateResults];
    const host = Object.fromEntries(["menu","pointer","keyboard","weapon","movement"].map(name=>[name,(...args)=>calls.push([name,args])]));
    host.wormState = (...args) => { calls.push(["wormState",args]); return answers.shift(); };
    nativeCollectControllerInput(memory,sceneMemory,c.queue,host);
    expect(calls).toEqual(c.calls);
  }

  for (const row of replayPipelineCapture.cases) {
    const scene = new Uint8Array(0x20000), sceneView = new DataView(scene.buffer);
    const memory = new Uint8Array(0x300), managerView = new DataView(memory.buffer), calls = [];
    const pattern = (length, multiplier) => Uint8Array.from({ length }, (_, i) => (i * multiplier + row.seed) & 255);
    scene.set(pattern(0x3fbc, 13), 0x7ec); scene.set(pattern(0x950, 17), 0x1c188); scene.fill(0xa5, 0x1cad8, 0x1d428);
    for (const [offset, value] of [[0x7f0,99],[0x7f4,0],[0x800,7],[0x1ab8,0],[0x1240c,4],[0x1d438,1],[0x1cad4,0]]) sceneView.setInt32(offset,value,true);
    const root = { type: 6, registryType: 26, registryIndex: 0, children: [{ type: 13 }, { type: 14 }], memory: new Uint8Array(0x28c) };
    root.memory.set(pattern(0x5c,11),0x3c); root.memory.set(pattern(0x138,19),0xd8);
    const environment = { state: pattern(12,7), all: { entries: [] }, categories: [] };
    const stream = new NativeReplayStream(65536); stream.bytes.fill(0xcc); stream.seek(13); stream.length=21;
    const incoming = new NativeReplayBuffer(4096), recording = new NativeReplayBuffer(4096);
    const deviceCall = (offset, result=0) => { calls.push(['device',offset]); return result; };
    const pipeline = createNativeReplayPipeline({ sceneMemory: scene, managerMemory: memory, root, environment, stream, incoming, recording, host: {
      collectRoot: (_root, queue, event, size) => calls.push(['collect',event,size,queue===incoming]),
      dispatchRoot: (_root,event,payload) => calls.push(['dispatch',event,[...payload]]),
      queryRoot: (_root,event,output) => { calls.push(['query',event,output.length]); new DataView(output.buffer).setInt32(4,0,true); },
      flushRoot: () => calls.push(['flush',0x210]), flushEnvironment: () => calls.push(['flush',0x220]), renderFrame: () => calls.push(['render']),
      device: { pending: () => deviceCall(0x40), startRecording: () => deviceCall(0x30,row.captureAccepted), checksum: () => deviceCall(0x48,-16), startPlayback: () => deviceCall(0x44,row.playbackAccepted), readyForPlayback: () => deviceCall(0x3c) },
      audio: row.sound ? { setVolume: volume => calls.push(['volume',volume]), setSpeed: speed => calls.push(['speed',speed]), playSound: (...args) => calls.push(['sound',...args]) } : null,
    } });
    pipeline.manager.globalCounter=1234;
    const events = queue => queue.snapshot().records.map(record => { const bytes=Uint8Array.from(record.payload); return [new DataView(bytes.buffer).getUint32(0,true),[...bytes.slice(4)]]; });
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    row.frames.forEach((expected,index) => {
      if (index===2) { sceneView.setInt32(0x1d43c,0,true); sceneView.setInt32(0x1d440,1,true); }
      calls.length=0; pipeline.tick();
      expect({ calls, scene: replayPipelineCapture.sceneFields.map(offset=>sceneView.getInt32(offset,true)), manager: replayPipelineCapture.managerFields.map(offset=>managerView.getInt32(offset,true)),
        input: events(incoming), recorded: events(recording), globalCounter: pipeline.manager.globalCounter, position: stream.position, length: stream.length,
        streamHash: hash(stream.bytes.slice(0,stream.length)), copiedHash: hash(scene.slice(0x1cad8,0x1d428)),
      }).toEqual(expected);
    });
  }
  for (const row of replayPipeline.cases) {
    const scene = new Uint8Array(0x20000), sceneView = new DataView(scene.buffer);
    const memory = new Uint8Array(0x300), managerView = new DataView(memory.buffer);
    for (const [offset, value] of [[0x7f0, 99], [0x800, 7], [0x1240c, 4], [0x1d43c, row.mode === 1 ? 1 : 0], [0x1d444, row.mode === 2 ? 1 : 0], [0x1d448, row.slow]]) sceneView.setInt32(offset, value, true);
    for (const [offset, value] of [[0x15c, 17], [0x160, 23], [0x164, 1], [0x168, 101], [0x214, 3], [0x21c, 19], [0x224, row.hide], [0x244, row.paused], [0x260, 3], [0x284, 1]]) managerView.setInt32(offset, value, true);
    const incoming = new NativeReplayBuffer(4096), recording = new NativeReplayBuffer(4096), calls = [];
    for (const [event, payload] of [[0x401, [1, 2]], [0x3ea, []], [0x402, [3]], [0x3ea, []]]) (row.mode === 2 ? recording : incoming).writeEvent(event, Uint8Array.from(payload));
    const pipeline = createNativeReplayPipeline({ sceneMemory: scene, managerMemory: memory, incoming, recording, host: {
      collectRoot: (_root, queue, event, size) => calls.push(['collect', event, size, queue === incoming]),
      dispatchRoot: (_root, event, payload) => calls.push(['dispatch', event, [...payload]]),
      queryRoot: (_root, event, output) => { calls.push(['query', event, output.length]); new DataView(output.buffer).setInt32(4, 0, true); },
      flushRoot: () => calls.push(['flush', 0x210]), flushEnvironment: () => calls.push(['flush', 0x220]),
      renderFrame: () => calls.push(['render']),
      device: { pending: () => { calls.push(['device', 0x40]); return 0; } },
      audio: row.sound ? { setVolume: volume => calls.push(['volume', volume]), setSpeed: speed => calls.push(['speed', speed]), playSound: (...args) => calls.push(['sound', ...args]) } : null,
    } });
    const events = queue => queue.snapshot().records.map(record => {
      const bytes = Uint8Array.from(record.payload);
      return [new DataView(bytes.buffer).getUint32(0, true), [...bytes.slice(4)]];
    });
    for (const expected of row.frames) {
      calls.length = 0;
      pipeline.tick();
      expect({ calls, scene: replayPipeline.sceneFields.map(offset => sceneView.getInt32(offset, true)),
        manager: replayPipeline.managerFields.map(offset => managerView.getInt32(offset, true)),
        input: events(incoming), recorded: events(recording),
      }).toEqual(expected);
    }
  }
  for (const row of replayInput.cases) {
    const queue = new NativeReplayBuffer(row.capacity), calls = [];
    if (row.fill !== null) queue.writeEvent(0x499, new Uint8Array(row.fill).fill(7));
    const manager = { hasSnapshot: row.flags & 1, pendingInputEvent: row.flags & 2, inputMode: row.mode,
      captureFrame: 0x87654321, checksum: 0xfedcba98 };
    nativeCollectReplayInput(manager, queue, {
      collectRoot: (target, event, size) => calls.push(['root', event, size, target === queue]),
      collectDevice: target => calls.push(['device', target === queue]),
    });
    const snapshot = queue.snapshot();
    const events = snapshot.records.map(record => {
      const bytes = Uint8Array.from(record.payload);
      return [new DataView(bytes.buffer).getUint32(0, true), [...bytes.slice(4)]];
    });
    expect({ calls, events, flags: [manager.hasSnapshot, manager.pendingInputEvent], percent: snapshot.percent }).toEqual(row.result);
  }
  for (const row of replayFrameState.cases) {
    const memory = new Uint8Array(0x300), view = new DataView(memory.buffer), scene = new Uint8Array(0x20000), calls = [];
    replayFrameState.fields.forEach((offset, index) => view.setInt32(offset, row.initial[index], true));
    scene[0x11e45] = row.volume;
    if (row.routine === '0x49e750') nativeAdvanceReplayFrameState(memory);
    else if (row.routine === '0x49e580') nativeAdvanceInputFrameState(memory, {
      dispatchRoot: (event, bytes) => calls.push(['root', event, bytes.length, 0]), renderFrame: () => calls.push('render'),
    });
    else nativeReplayFrameAudio(memory, scene, {
      audio: { setVolume: value => calls.push(['audio', value]) },
      music: row.music ? { setVolume: value => calls.push(['music', value]) } : null,
    });
    expect({ fields: replayFrameState.fields.map(offset => view.getInt32(offset, true)), calls }).toEqual(row.result);
  }
  for (const { mask, limit, result } of replayFrame.cases) {
    const scene = new Uint8Array(0x20000), view = new DataView(scene.buffer), calls = [];
    view.setInt32(0x1d444, mask & 1, true);
    view.setInt32(0x1b8ec, 0x7fffffff, true);
    const manager = { playbackError: 0, playbackFailure: 0, paused: mask & 4, suppressRender: mask & 8,
      abortValue: mask & 32 ? 9 : 0, abortFirst: 88, abortSecond: 99, abortMode: 77 };
    let count = 0;
    nativeReplayFrame(scene, manager, {
      audio: mask & 2 ? {} : null, updateAudio: () => calls.push('audio'),
      incoming: 'incoming', recording: 'recording', collectInput: queue => calls.push(['collect', queue]),
      dispatchEvents: queue => { calls.push(['dispatch', queue]); view.setInt32(0x1d448, ++count < limit ? 1 : 0, true); },
      advanceInput: () => calls.push('advanceInput'), advancePlayback: () => calls.push('advancePlayback'),
      dispatchRoot: (event, data) => calls.push(['root', event, data.length, 0]), renderFrame: () => calls.push('render'),
      queryRoot: (event, data) => { calls.push(['query', event, data.length]); new DataView(data.buffer).setInt32(4, mask & 16 ? -7 : 0, true); return !(mask & 16); },
    });
    expect({ fields: [0x1b8ec, 0x1d448].map(offset => view.getInt32(offset, true)),
      manager: [manager.abortValue, manager.abortFirst, manager.abortSecond, manager.abortMode], calls,
    }).toEqual(result);
  }
  for (const row of replayEntry.cases) {
    const scene = new Uint8Array(0x20000), view = new DataView(scene.buffer);
    const put = (offset, value) => view.setInt32(offset, value, true);
    scene.fill(0xa5, 0x1c188, 0x1c188 + 0x950);
    for (let i = 0; i < 0x950; i++) scene[0x1cad8 + i] = (i * 17 + 31) & 255;
    for (const [offset, value] of [[0x12488, row.fade], [0x7f0, 0x87654321], [0x1d434, 99], [0x1d444, 0]]) put(offset, value);
    const manager = { playbackError: row.phase, playbackFailure: row.request }, calls = [];
    const continued = nativeReplayEntry(scene, manager, {
      device: { readyForPlayback: () => { calls.push('ready'); return row.ready; } },
      restoreSnapshot: () => { calls.push(['restore', view.getInt32(0x1d434, true)]); put(0x7f0, 42); },
      audio: row.sound ? { reset: () => calls.push('audio') } : null,
    });
    expect({ continued, fields: [0x12488, 0x7f0, 0x1d434, 0x1d444].map(offset => view.getInt32(offset, true)),
      manager: [manager.playbackError, manager.playbackFailure],
      copiedHash: createHash('sha256').update(scene.slice(0x1c188, 0x1c188 + 0x950)).digest('hex'), calls,
    }).toEqual(row.result);
  }
  for (const row of replayDispatch.cases) {
    const input = row.input, calls = [], sceneMemory = new Uint8Array(0x20000), view = new DataView(sceneMemory.buffer);
    for (const [offset,value] of [[0x1ab8,1],[0x800,-1],[0x7f0,0x7fffffff],[0x1d43c,input.recording],[0x1d444,input.replaying],[0x1d448,input.slow],[0x1240c,4],[0x1cad4,input.audioCount]]) view.setInt32(offset,value,true);
    sceneMemory.fill(0xa5,0x12490,0x125bc);
    for (let i=0;i<input.audioCount*5;i++) view.setInt32(0x1c994+i*4,100+i,true);
    const incoming = new NativeReplayBuffer(4096), recording = new NativeReplayBuffer(4096);
    if (input.fill) recording.writeEvent(0x499,new Uint8Array(input.fill).fill(7));
    for (const [event,payload] of input.events) incoming.writeEvent(event,Uint8Array.from(payload));
    const manager = { abortValue:77,abortFirst:77,abortSecond:77,abortMode:77 };
    const deviceCall = offset => { calls.push(["device",offset]); return 0; };
    const audio = { setSpeed: value => calls.push(["speed",value]) };
    nativeDispatchReplayEvents(sceneMemory, manager, { incoming, recording,
      dispatch: (event,payload) => calls.push(["dispatch",event,[...payload]]),
      flushRoot: () => calls.push(["flush",0x210]), flushEnvironment: () => calls.push(["flush",0x220]),
      sessionTick: playback => nativeReplaySessionTick(sceneMemory, manager, { playback, recording,
        device: { pending:()=>deviceCall(0x40), clear:()=>deviceCall(0x34),startRecording:()=>deviceCall(0x30),startPlayback:()=>deviceCall(0x44),checksum:()=>deviceCall(0x48) }, audio }),
      playSound: (...args) => calls.push(["sound",...args]) });
    const events = buffer => { const rows=[]; for(let head=buffer.head;head!==null;head=buffer.records.get(head).next) {
      const record=buffer.records.get(head), bytes=buffer.bytes.slice(head+8,head+8+record.size);
      rows.push([new DataView(bytes.buffer).getUint32(0,true),[...bytes.slice(4)]]);
    } return rows; };
    expect({ calls,input:events(incoming),recorded:events(recording),frame:view.getInt32(0x7f0,true),timer:view.getInt32(0x800,true),tickActive:view.getInt32(0x7f4,true),
      recording:view.getInt32(0x1d43c,true),replaying:view.getInt32(0x1d444,true),slow:view.getInt32(0x1d448,true),speed:view.getInt32(0x1240c,true),audioCount:view.getInt32(0x1cad4,true),
      manager:[manager.abortValue,manager.abortFirst,manager.abortSecond,manager.abortMode],clearRegion:[...sceneMemory.slice(0x12490,0x125bc)],
      debugCounters:[0x15948,0x15740,0x1316c].map(offset=>view.getInt32(offset,true)) }).toEqual(row.result);
  }
  for (const row of replaySession.cases) {
    const mask = row.mask, seed = mask & 255, calls = [], sceneMemory = new Uint8Array(0x20000), view = new DataView(sceneMemory.buffer);
    const pattern = (length, multiplier) => Uint8Array.from({ length }, (_, i) => (i * multiplier + seed) & 255);
    sceneMemory.set(pattern(0x3fbc, 13), 0x7ec); sceneMemory.set(pattern(0x950, 17), 0x1c188); sceneMemory.fill(0xa5, 0x1cad8, 0x1d428);
    const fields = [0x1d438, 0x1d43c, 0x1d444, 0x1d428, 0x1d42c, 0x1d440];
    fields.forEach((offset, i) => view.setInt32(offset, (mask >> i) & 1, true));
    for (const [offset, value] of [[0x1d448,7],[0x1240c,mask & 32 ? 1 : 4],[0x1d430,99],[0x7f0,0x87654321]]) view.setInt32(offset, value, true);
    const root = { type: 6, registryType: 26, registryIndex: 0, children: [{ type: 13 }, { type: 14 }], memory: new Uint8Array(0x28c) };
    root.memory.set(pattern(0x5c, 11), 0x3c); root.memory.set(pattern(0x138, 19), 0xd8);
    const manager = { root, environment: { state: pattern(12,7), all: { entries: [] }, categories: [] }, globalCounter: 1234,
      captureFrame: 77, checksum: 77, hasSnapshot: 77, playbackFailure: 77, playbackError: 77 };
    const stream = new NativeReplayStream(65536); stream.bytes.fill(0xcc); stream.seek(13); stream.length = 21;
    const recording = new NativeReplayBuffer(256); recording.count = 1; recording.readOffset = recording.writeOffset = recording.head = recording.tail = 1;
    const call = (offset, result) => { calls.push(["device", offset]); return result; };
    nativeReplaySessionTick(sceneMemory, manager, { stream, recording, playback: { count: (mask >> 6) & 1 },
      device: { pending: () => call(0x40,(mask>>7)&1), clear: () => call(0x34,0), startRecording: () => call(0x30,(mask>>8)&1), startPlayback: () => call(0x44,(mask>>9)&1), checksum: () => call(0x48,0xfffffff0) },
      audio: mask & 16 ? { setSpeed: value => calls.push(["audio",value]) } : null });
    const hash = bytes => createHash("sha256").update(bytes).digest("hex");
    expect({ fields: [...fields,0x1d448,0x1240c,0x1d430].map(offset => view.getInt32(offset,true)),
      manager: [manager.captureFrame,manager.checksum,manager.hasSnapshot,manager.playbackFailure,manager.playbackError],
      globalCounter: manager.globalCounter, recordCount: recording.count,
      recordReset: [recording.writeOffset,recording.readOffset,recording.tail ?? 0,recording.head ?? 0],
      position: stream.position, length: stream.length, streamHash: hash(stream.bytes.slice(0,stream.length)),
      copiedHash: hash(sceneMemory.slice(0x1cad8,0x1d428)), calls }).toEqual(row.result);
  }
  for (const row of [...replaySnapshotRestore.cases, ...replayPipelineRestore.cases.map(row => ({
    input: { ...replaySnapshotRestore.cases[row.baseCase].input, entry: true, sound: row.sound },
    result: { ...replaySnapshotRestore.cases[row.baseCase].result, entry: row.entry, calls: row.calls },
  }))]) {
    const stream = new NativeReplayStream(65536), calls = [], allocations = [...row.input.allocations], tasks = [...row.input.tasks], objects = [...row.input.objects], buffers = [...row.input.buffers];
    stream.bytes.set(row.input.bytes); stream.seek(row.input.position);
    const sceneMemory = new Uint8Array(0x20000), scene = new DataView(sceneMemory.buffer);
    scene.setInt32(0x1b8dc, 320, true); scene.setInt32(0x3a4, 17, true);
    let manager = { root: { id: 0x2000400 }, environment: { id: 0x2500000 } };
    const restoreOptions = { context: 0x2020000, renderer: 0x7654321, sceneMemory, links: [17],
      flushTask: task => { calls.push([0x2200200, task.id]); if (row.input.clearRoot) manager.root = null; }, destroyTask: (task, flag) => calls.push([0x2200210, task.id, flag]),
      flushEnvironment: env => { calls.push([0x2200220, env.id]); if (row.input.clearEnvironment) manager.environment = null; }, destroyEnvironment: (env, flag) => calls.push([0x2200230, env.id, flag]),
      allocateObject: size => { const request = objects.shift(); expect(size).toBe(request.size); return request.pointer ? { id: request.pointer } : null; },
      allocateEnvironmentBuffer: size => { expect(size).toBe(buffers.shift()); return new Uint8Array(size); },
      allocateTask: size => { const request = tasks.shift(); expect(size).toBe(request.size); return { id: request.pointer }; },
      allocateResource: size => { const request = allocations.shift(); expect(size).toBe(request.size); return request.pointer; },
      constructText: (...args) => { calls.push([0x4c6610, ...args]); return args[0]; },
      constructSurface: (...args) => { calls.push([0x492bc0, ...args]); return args[0]; } };
    if (row.input.entry) {
      scene.setInt32(0x12488,61604,true); scene.setInt32(0x7f0,12345678,true); scene.setInt32(0x1d434,99,true);
      sceneMemory.fill(0xa5,0x1c188,0x1c188+0x950);
      for (let i=0;i<0x950;i++) sceneMemory[0x1cad8+i]=(i*17+31)&255;
      const memory=new Uint8Array(0x300), view=new DataView(memory.buffer);
      view.setInt32(0x26c,1,true); view.setInt32(0x270,-1,true);
      const pipeline=createNativeReplayPipeline({sceneMemory,managerMemory:memory,stream,root:manager.root,environment:manager.environment,host:{
        restore:restoreOptions, device:{readyForPlayback:()=>{calls.push(["ready"]);return 1;}},
        audio:row.input.sound ? {reset:()=>calls.push(["audioReset"])} : null,
      }});
      manager=pipeline.manager; pipeline.tick();
    } else nativeRestoreReplaySnapshot(stream,manager,restoreOptions);
    const { root: task, environment: env } = manager;
    const capture = node => ({ id: node.id, type: node.type, parent: node.parent?.id ?? 0, capacity: node.capacity,
      ownsRegistry: node.ownsRegistry, sharedRegistry: node.registry === task.registry, registryType: node.registryType,
      registryIndex: node.registryIndex, body: [...node.memory.slice(0x3c)], children: node.children.map(capture) });
    expect([tasks, allocations, objects, buffers]).toEqual([[], [], [], []]);
    expect(scene.getUint32(0x7d4, true)).toBe(env?.id ?? 0);
    expect({ tree: task ? capture(task) : null, registry: task ? task.registry.flatMap((bucket, index) => bucket.map(entry => [index, entry.type, entry.index, entry.task.id])) : [],
      environment: env ? { id: env.id, all: { capacity: env.all.capacity, entries: env.all.entries },
        category: { capacity: env.categories[2].capacity, entries: env.categories[2].entries }, state: [...env.state], context: env.context, dirty: env.dirty } : null,
      contextBytes: [...sceneMemory.slice(0x7ec, 0x47a8)], phase: scene.getInt32(0x12414, true), position: stream.position, calls,
      ...(row.input.entry ? { entry: { fields: [0x12488,0x7f0,0x1d434,0x1d444].map(offset=>scene.getInt32(offset,true)),
        manager: [manager.playbackError,manager.playbackFailure], copiedHash: createHash('sha256').update(sceneMemory.slice(0x1c188,0x1c188+0x950)).digest('hex') } } : {}),
    }).toEqual(row.result);
  }
  for (const row of replayTreeRestore.cases) {
    const stream = new NativeReplayStream(32768), calls = [], allocations = [...row.input.allocations], tasks = [...row.input.tasks];
    stream.bytes.set(row.input.bytes); stream.seek(row.input.position);
    const sceneMemory = new Uint8Array(0x20000); new DataView(sceneMemory.buffer).setInt32(0x1b8dc, 320, true);
    const environment = { all: { capacity: 256, entries: [] }, categories: { 2: { capacity: 256, entries: [] } }, links: [17] };
    const task = nativeReadReplayTree(stream, { id: 0x2000000, context: 0x2020000, renderer: 0x7654321, sceneMemory, environment,
      memory: new Uint8Array(0x28c).fill(0xa5),
      allocateTask: size => { const request = tasks.shift(); expect(size).toBe(request.size); return { id: request.pointer }; },
      allocateResource: size => { const request = allocations.shift(); expect(size).toBe(request.size); return request.pointer; },
      constructText: (...args) => { calls.push([0x4c6610, ...args]); return args[0]; },
      constructSurface: (...args) => { calls.push([0x492bc0, ...args]); return args[0]; } });
    const capture = node => ({ id: node.id, type: node.type, parent: node.parent?.id ?? 0, capacity: node.capacity,
      ownsRegistry: node.ownsRegistry, sharedRegistry: node.registry === task.registry, registryType: node.registryType,
      registryIndex: node.registryIndex, body: [...node.memory.slice(0x3c)], children: node.children.map(capture) });
    expect(tasks).toEqual([]); expect(allocations).toEqual([]);
    expect({ tree: capture(task), registry: task.registry.flatMap((bucket, index) => bucket.map(entry => [index, entry.type, entry.index, entry.task.id])),
      all: environment.all, category: environment.categories[2], position: stream.position, calls }).toEqual(row.result);
  }
  for (const row of replayRootRestore.cases) {
    const stream = new NativeReplayStream(2048), calls = [], allocations = [...row.input.allocations];
    stream.bytes.set(row.input.bytes); stream.seek(row.input.position);
    const sceneMemory = new Uint8Array(0x20000); sceneMemory.set(row.input.scene, 0x1b778);
    const task = nativeReadReplayRoot(stream, { id: 0x2000000, context: 0x2020000, renderer: 0x7654321, sceneMemory,
      memory: new Uint8Array(0x28c).fill(0xa5), readChildren: (_, reader) => reader.readByte(),
      allocateResource: size => { const request = allocations.shift(); expect(size).toBe(request.size); return request.pointer; },
      constructText: (...args) => { calls.push([0x4c6610, ...args]); return args[0]; },
      constructSurface: (...args) => { calls.push([0x492bc0, ...args]); return args[0]; } });
    expect(allocations).toEqual([]);
    expect({ body: [...task.memory.slice(0x3c)], position: stream.position,
      scene: [...sceneMemory.slice(0x1b778, 0x1b8e0)], calls,
      children: task.children.map(child => ({ id: child.id, type: child.type, registryType: child.registryType, registryIndex: child.registryIndex,
        context: new DataView(child.memory.buffer).getInt32(0x38, true), parent: child.parent.id, ownsRegistry: child.ownsRegistry,
        sharedRegistry: child.registry === task.registry, capacity: child.capacity, childCount: child.children.length,
        last: new DataView(child.memory.buffer).getInt32(child.type === 13 ? 0xc3c : 0x63c, true) })),
      registry: task.registry.flatMap((bucket, index) => bucket.map(entry => [index, entry.type, entry.index, entry.task.id])),
    }).toEqual(row.result);
  }
  for (const row of replayPresentationRestore.cases) {
    const stream = new NativeReplayStream(2048), calls = [], input = row.input;
    stream.bytes.set(input.bytes); stream.seek(input.position);
    const environment = { all: { capacity: 256, entries: [] }, categories: { 2: { capacity: 256, entries: [] } }, links: [17] };
    const task = nativeReadReplayActor(28, stream, { id: 9, context: 0x2020000, environment,
      memory: new Uint8Array(0x175c).fill(0xa5), readChildren: (_, reader) => reader.readByte(),
      presentation: { palette: { 8: 8, 9: 9 },
        paletteSource: { height: input.pixels.length, readPixel: (x, y) => { calls.push(["sample", x, y]); return input.pixels[y]; } },
        weather: { lowDetail: input.detail, left: input.limits[0], right: input.limits[1], height: input.limits[2] },
        surface: { width: input.dimensions[0], height: input.dimensions[1], draw: (...args) => calls.push(args) },
      } });
    expect({ body: [...task.memory.slice(0x3c)], position: stream.position, calls }).toEqual(row.result);
  }
  for (const row of replayTerrainRestore.cases) {
    const stream = new NativeReplayStream(16384), allocations = [...row.input.allocations];
    stream.bytes.set(row.input.bytes); stream.seek(row.input.position);
    const task = nativeReadReplayActor(31, stream, { id: 9, context: 0x2020000,
      memory: new Uint8Array(0x2dd4).fill(0xa5), readChildren: (_, reader) => reader.readByte(),
      allocateResource: size => { const request = allocations.shift(); expect(size).toBe(request.size); return request.pointer; } });
    const ring = task.terrainQueue?.ring, buffer = ring?.buffer;
    expect(allocations).toEqual([]);
    expect({ body: [...task.memory.slice(0x3c)], position: stream.position,
      queue: task.terrainQueue ? { pointer: task.terrainQueue.pointer, ring: ring ? {
        pointer: ring.pointer, dataPointer: ring.dataPointer, capacity: buffer.capacity,
        count: buffer.count, writeOffset: buffer.writeOffset, readOffset: buffer.readOffset,
        head: buffer.head === null ? 0 : buffer.head, tail: buffer.tail === null ? 0 : buffer.tail, bytes: [...buffer.bytes],
      } : null } : null,
      table: task.terrainTable ? { ...task.terrainTable, bytes: [...task.terrainTable.bytes] } : null,
    }).toEqual(row.result);
  }
  for (const row of replayActorRestore.cases) {
    const stream = new NativeReplayStream(8192), calls = [], sounds = [], allocations = [...row.input.allocations];
    stream.bytes.set(row.input.bytes); stream.seek(row.input.position);
    const schema = nativeReplayTaskTypes.find(schema => schema.tag === row.input.tag);
    const environment = { all: { capacity: 256, entries: [] }, categories: { 2: { capacity: 256, entries: [] } }, links: [17] };
    const contextState = { counters: Object.fromEntries([0x12420, 0x12424, 0x12428, 0x1242c, 0x12430, 0x1b8f0, 0x1b8f4].map(offset => [offset, 0x7fffffff])), teamSlots: [0,0,0,0], effectSlots: [0,0,0,0] };
    const task = nativeReadReplayActor(row.input.tag, stream, { id: 0x2000000, context: 0x2020000, renderer: 0x7654321, environment, contextState,
      palette: { 7: 0x12345678, 8: 0x87654321 },
      constructPortrait: (...args) => { calls.push([0x500170, ...args]); return args[0]; },
      constructFrame: (...args) => { calls.push([0x4ffed0, ...args]); return args[0]; },
      audio: { suppressed: row.input.audioSuppressed, play: row.input.audioPresent ? (...args) => { sounds.push(args); return 0x654321; } : undefined },
      memory: new Uint8Array(schema.size).fill(0xa5), readChildren: (_, reader) => reader.readByte(),
      allocateResource: size => { const request = allocations.shift(); expect(size).toBe(request.size); return request.pointer; },
      constructText: (...args) => { calls.push([0x4c6610, ...args]); return args[0]; } });
    expect(allocations).toEqual([]);
    expect({ body: [...task.memory.slice(0x3c)], position: stream.position, calls, sounds, ...contextState }).toEqual(row.result);
  }
  for (const row of replayWormRoundtrip.cases) {
    const stream = new NativeReplayStream(2048), calls = [], allocations = [...row.input.allocations];
    stream.bytes.set(row.input.bytes); stream.seek(row.input.position);
    const environment = { all: { capacity: 256, entries: [] }, categories: { 2: { capacity: 256, entries: [] } }, links: [17] };
    const matchState = { activeCount: 0x7fffffff, presentationValue: 0x87654321 };
    const task = nativeReadWormTask(stream, { id: 9, context: 0x2020000, renderer: 0x7654321, environment, matchState,
      memory: new Uint8Array(0x390).fill(0xa5), readChildren: (_, reader) => reader.readByte(),
      allocateContacts: size => ({ pointer: row.input.contactPointer, bytes: new Uint8Array(size) }),
      allocateResource: size => { const request = allocations.shift(); expect(size).toBe(request.size); return request.pointer; },
      constructText: (...args) => { calls.push([0x4c6610, ...args]); return args[0]; },
      constructPanel: (...args) => { calls.push([0x4fd5a0, ...args]); return args[0]; } });
    expect(allocations).toEqual([]);
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    const restoredHash = hash(task.memory.slice(0x3c)), restorePosition = stream.position;
    const output = new NativeReplayStream(65536); output.bytes.fill(0xcc); output.seek(row.input.position); output.length=row.input.position;
    nativeWriteReplayTask(output,task,{all:environment.all.entries,categories:{2:environment.categories[2].entries}});
    expect({ restoredHash, restorePosition, position:output.position, length:output.length,
      writtenHash:hash(output.bytes.slice(0,output.length)), bodyHash:hash(task.memory.slice(0x3c)), calls, activeCount:matchState.activeCount,
    }).toEqual(row.result);
  }
  for (const row of replayWormRestore.cases) {
    const stream = new NativeReplayStream(2048), calls = [], allocations = [...row.input.allocations];
    stream.bytes.set(row.input.bytes); stream.seek(row.input.position);
    const environment = { all: { capacity: 256, entries: [] }, categories: { 2: { capacity: 256, entries: [] } }, links: [17] };
    const matchState = { activeCount: 0x7fffffff, presentationValue: 0x87654321 };
    const task = nativeReadWormTask(stream, { id: 9, context: 0x2020000, renderer: 0x7654321, environment, matchState,
      memory: new Uint8Array(0x390).fill(0xa5), readChildren: (_, reader) => reader.readByte(),
      allocateResource: size => { const request = allocations.shift(); expect(size).toBe(request.size); return request.pointer; },
      constructText: (...args) => { calls.push([0x4c6610, ...args]); return args[0]; },
      constructPanel: (...args) => { calls.push([0x4fd5a0, ...args]); return args[0]; } });
    expect(allocations).toEqual([]);
    expect({ animationRenderer: task.animationRenderer, body: [...task.memory.slice(0x3c)], animation: [...task.animation], position: stream.position, calls,
      activeCount: matchState.activeCount }).toEqual(row.result);
  }
  for (const row of replayEnvironmentRestore.cases) {
    const stream = new NativeReplayStream(64), allocations = [], links = [17];
    stream.bytes.set(row.input.bytes); stream.seek(row.input.position);
    const environment = nativeReadPhysicsEnvironment(stream, { context: row.input.context, links,
      allocate: size => { allocations.push(size); return new Uint8Array(size); } });
    expect(environment.links).toBe(links);
    expect(new Set([environment.all, ...environment.categories]).size).toBe(33);
    expect({ lists: [environment.all, ...environment.categories].map(list => ({ capacity: list.capacity, count: list.entries.length, cursor: list.cursor })),
      state: [...environment.state], context: environment.context, dirty: environment.dirty,
      position: stream.position, allocations }).toEqual(row.result);
  }
  for (const row of replayBodyRestore.cases) {
    const input = row.input, stream = new NativeReplayStream(2048), allocations = [];
    stream.bytes.set(input.bytes); stream.seek(input.position); stream.length = input.bytes.length;
    const environment = { all: structuredClone(input.layout), categories: { 2: structuredClone(input.layout) }, links: input.links, dirty: 77 };
    const task = nativeReadPhysicsTask(stream, { id: 9, context: 0x2020000, environment,
      readChildren: (_, reader) => reader.readByte() === 0 ? 1 : 0,
      allocateContacts: size => { allocations.push(size); return { pointer: input.contactPointer, bytes: new Uint8Array(size) }; } });
    expect({ body: [...task.memory.slice(0x3c, 0xfc)], position: stream.position,
      contacts: [...task.physicsPoints], allocations, all: environment.all,
      category: environment.categories[2], dirty: environment.dirty,
      type: task.type, registryType: task.registryType, registryIndex: task.registryIndex }).toEqual(row.result);
  }
  for (const row of replayFactory.cases) {
    const stream = new NativeReplayStream(256), calls = [], parent = {};
    stream.bytes.set(row.input.bytes); stream.length = row.input.bytes.length;
    let allocation = 0;
    const returned = nativeReadTaskChildren(stream, parent, size => {
      const id = allocation++, success = row.input.mode === 0 || (row.input.mode === 2 && id % 2 === 0);
      calls.push(["allocate", size, success ? id : null]);
      return success ? id : null;
    }, (schema, id, passedParent, reader) => {
      calls.push(["construct", schema.tag, id, passedParent === parent, reader === stream]);
      reader.readByte(); reader.readByte();
    });
    expect({ returned, position: stream.position, calls }).toEqual(row.result);
  }
  for (const row of replayRestore.cases) {
    const input = row.input, stream = new NativeReplayStream(64);
    stream.bytes.set(input.bytes); stream.length = input.bytes.length;
    let parent = null;
    if (input.parent) {
      parent = { capacity: input.parent.capacity, children: input.parent.children.map(id => id === null ? null : { id }),
        registry: Array.from({ length: 256 }, () => []) };
      parent.registry[input.bucket].push({ type: input.existing.type, index: input.existing.index, task: { id: input.existing.id } });
    }
    const task = nativeReadTaskBase(stream, { id: 9, parent, readChildren: (_, reader) => reader.readByte() === 0 ? 1 : 0 });
    const registry = task.registry.flatMap((entries, bucket) => entries.map(entry => ({ bucket, type: entry.type, index: entry.index, id: entry.task.id })));
    expect({ type: task.type, registryType: task.registryType, registryIndex: task.registryIndex,
      ownsRegistry: task.ownsRegistry, sharedRegistry: !!parent && task.registry === parent.registry,
      capacity: task.capacity, childCount: task.children.length, parent: parent ? {
        capacity: parent.capacity, children: parent.children.map(child => child?.id ?? null) } : null,
      registry, position: stream.position, returnedSelf: task.id === 9 }).toEqual(row.result);
  }
  for (const row of replayPhysics.cases) expect(nativeRestorePhysicsMembership(row.input)).toEqual(row.result);
  for (const row of replayChildren.cases) {
    const schema = nativeReplayTaskTypes.find(type => type.tag === row.tag);
    const memory = Uint8Array.from({ length: schema.size }, (_, i) => (i * 13 + row.tag * 7 + row.position) & 255);
    const view = new DataView(memory.buffer), set = (offset, value) => view.setInt32(offset, value, true);
    set(0x14, 0); set(0x2c, row.tag); set(0x28, 0x115); set(0x24, 0x129);
    if (schema.physics) { set(0x3c, 2); set(0xc8, row.count ? 1 : 0); set(0xdc, row.count); set(0xe4, -29); set(0xe8, 88); }
    const task = { id: 1, type: row.tag, memory, children: [],
      physicsPoints: Uint8Array.from({ length: row.count * 8 }, (_, i) => (i * 17 + row.tag) & 255),
      animation: Uint8Array.from({ length: 0x15c }, (_, i) => (i * 19 + row.tag) & 255) };
    const environment = { all: row.membership === 1 ? [null, 1, 1] : row.membership === 2 ? [2, null, 1] : [null, 2],
      categories: { 2: row.membership === 1 ? [2, null, 1] : [null, 2] } };
    const stream = new NativeReplayStream(0x4000);
    stream.bytes.fill(0xa5); stream.seek(row.position); stream.length = row.position;
    const result = nativeWriteReplayTask(stream, task, environment);
    expect({ result, length: stream.length, bytes: [...stream.bytes.slice(0, stream.position)],
      references: schema.physics ? [view.getInt32(0xe4, true), view.getInt32(0xe8, true)] : null })
      .toEqual({ result: row.result, length: row.length, bytes: row.bytes, references: row.references });
  }
  for (const row of replayTask.cases) {
    const stream = new NativeReplayStream(2048);
    stream.bytes.fill(0xa5); stream.seek(row.position); stream.length = row.position;
    const calls = [], childWriter = (child, target) => {
      calls.push(row.input.children.indexOf(child));
      for (const byte of child.bytes) target.writeByte(byte);
      return child.result;
    };
    const result = row.kind === "environment"
      ? nativeWritePhysicsEnvironment(stream, row.input.environment)
      : (row.kind === "header" ? nativeWriteTaskHeader : nativeWriteMatchController)(stream, row.input, childWriter);
    expect({ result, calls, bytes: [...stream.bytes.slice(0, stream.position)], length: stream.length })
      .toEqual({ result: row.result, calls: row.calls, bytes: row.bytes, length: row.length });
  }
  for (const row of replayStream.cases) {
    const stream = new NativeReplayStream(2048);
    stream.bytes.set(row.initial);
    for (const step of row.steps) {
      const op = step.operation;
      let result = null;
      if (op.kind === "reset") stream.reset();
      else if (op.kind === "seek") stream.seek(op.position);
      else if (op.kind === "readByte") result = stream.readByte();
      else if (op.kind === "writeByte") stream.writeByte(op.value);
      else if (op.kind === "readBlock") result = [...stream.readBlock(op.size)];
      else if (op.kind === "writeBlock") stream.writeBlock(op.bytes);
      else if (op.kind === "checksum") result = stream.checksum();
      expect({ result, state: { position: stream.position, length: stream.length,
        checksum: stream.checksum(), bytes: [...stream.bytes.slice(0, 256)] } }).toEqual({ result: step.result, state: step.state });
    }
  }
  for (const row of replayBuffer.cases) {
    const buffers = [new NativeReplayBuffer(row.capacity), new NativeReplayBuffer(row.capacity)];
    for (const step of row.steps) {
      const op = step.operation, index = op.queue ?? 0, buffer = buffers[index];
      let result = null;
      if (op.kind === "push") result = buffer.push(op.payload);
      else if (op.kind === "pop") result = buffer.pop();
      else if (op.kind === "clear") buffer.clear();
      else if (op.kind === "contains") result = buffer.contains(op.offset);
      else if (op.kind === "copy") result = buffer.copyFrom(buffers[1 - index]);
      else if (op.kind === "writeEvent") result = buffer.writeEvent(op.event, op.payload);
      else if (op.kind === "readEvent") result = buffer.readEvent();
      else if (op.kind === "peek") {
        const peek = buffer.peek();
        result = peek ? { offset: peek.offset, payload: [...peek.bytes] } : null;
      }
      expect({ result, buffers: buffers.map(buffer => buffer.snapshot()) }).toEqual({ result: step.result, buffers: step.buffers });
    }
  }
  for (const row of replayControl.capture) expect(nativeReplayCaptureRequest(row.input)).toEqual(row.result);
  for (const row of replayControl.inputs) expect(nativeReplayInput(row.input)).toEqual(row.result);
  for (const row of replayControl.playback) expect(nativeReplayPlaybackRequest(row.input)).toEqual(row.result);
  for (const row of actionBusy.writer) expect(nativeActionBusyWrite(row.input)).toEqual(row.result);
  for (const row of actionBusy.clear) expect(nativeActionBusyClear(row.input)).toEqual(row.result);
  for (const row of actionBusy.gate) expect(nativeActionGate(row.input)).toEqual(row.result);
  for (const row of windMeter.phases) expect(nativeWindMeterVisibility(row.visibility, row.hidden)).toBe(row.nextVisibility);
  for (const row of windMeter.phases) expect(nativeWindMeterPhase(row.phase, row.wind)).toBe(row.result);
  for (const row of windMeter.ticks) expect(nativeWindMeterTick(row.current, row.target)).toBe(row.result);
  for (const row of windMeter.cases) expect(nativeWindMeter(row.input)).toEqual(row.calls);
  for (const row of windSelection.cases) {
    let state = row.input.seed;
    const result = nativeWindSelection(row.input, () => (state = nextLogicRandom(state, row.input.frame)));
    expect({ ...result, randomState: state }).toEqual(row.result);
  }
  for (const row of wormRotation.cases) expect(nativeWormRotation(row.input)).toEqual(row.result);
  for (const row of teamRotation.reset) expect(nativeTeamRotationReset(row.input)).toEqual(row.result);
  for (const row of teamRotation.cases) expect(nativeSelectNextTeam(row.input)).toEqual(row.result);
  for (const row of turnStart.cases) expect(nativeTurnStart(row.input)).toEqual(row.result);
  for (const row of retreatRequest.cases) expect(nativeRetreatRequest(row.input)).toEqual(row.result);
  for (const row of retreat.cases) expect(nativeRetreatTick(row.input)).toEqual(row.result);
  for (const row of settlementEntry.cases) expect(nativeSettlementEntry(row.input)).toEqual(row.result);
  for (const row of busyCounter.cases) {
    const counter = new NativeBusyCounter(row.before);
    counter[row.operation](row.seconds);
    expect(counter.value).toBe(row.after);
    expect(counter.value).toBe(row.read);
  }
  for (const row of settlement.cases) expect(nativeSettlementPresentation(row.input)).toEqual(row.result);
  const bankState = manager => ({
    banks: manager.banks.map(palette => palette ? [palette.first, palette.last] : null),
    available: manager.available,
    references: manager.references,
  });
  for (const sequence of paletteBanks.cases) {
    const manager = new NativePaletteBanks();
    for (const { operation: [operation, bank, count], result, ...state } of sequence) {
      let value = null;
      if (operation === "references") manager.references[bank] = count;
      else if (operation === "release") value = manager.release(bank);
      else value = manager.allocate(bank, count, operation === "fail" ? () => null : undefined);
      expect(value).toBe(result);
      expect(bankState(manager)).toEqual(state);
    }
  }
  const banks = createNativeGamePaletteBanks();
  expect({ ...bankState(banks), blackIndex: banks.get(1).used[0], usedCount: banks.get(1).used.length }).toEqual(paletteBanks.setup);
  for (const row of gamePalette.cases) {
    const palette = new NativeGamePalette(row.first, row.last);
    for (const step of row.steps) expect(palette.add(step.color)).toBe(step.value);
    for (const read of row.reads) expect(palette.read(read.index)).toEqual(read.color);
    const entries = [];
    for (let entry; (entry = palette.next());) entries.push(entry);
    expect(entries).toEqual(row.entries);
    expect(palette.free).toEqual(row.free);
    expect(palette.dirty).toBe(row.dirty);
  }
  for (const row of environmentPalette.cases) {
    const sources = environmentPalette.ranges.map(([first, last]) => ({ first, last, colors: environmentPalette.colors }));
    const previous = { palettes: sources.map(() => environmentPalette.colors.map(() => [0, 0, 0])),
      cached: row.unchanged ? [row.input.flash, Math.max(row.input.dark, row.input.extra), row.input.fade] : [-1, -1, -1] };
    expect(nativeEnvironmentPalette(row.input, sources, previous)).toEqual({ palettes: row.palettes, cached: row.cached, calls: row.calls });
  }
  for (const c of fixture.killCases) {
    const stats = { turnKills: c.kills };
    let random = c.seed;
    const next = () => (random = nextLogicRandom(random, c.frame));
    expect(nativeKillAnnouncement(c.active ? stats : null, c.name, c.color, next)).toEqual(c.message);
    expect(stats.turnKills).toBe(c.remaining);
    expect(random).toBe(c.random);
  }
  for (const c of fixture.wormDeathCases) {
    let random = c.seed;
    const next = () => (random = nextLogicRandom(random, c.frame));
    expect(nativeWormDeathAnnouncement(c.name, c.color, c.drowned, next)).toEqual(c.message);
    expect(random).toBe(c.random);
  }
  for (const c of fixture.victorySpeechCases)
    expect(nativeVictorySpeech(c.totals)).toEqual(c.request);
  for (const c of fixture.eliminationCases) {
    let random = c.seed;
    const next = () => (random = nextLogicRandom(random, c.frame));
    expect(c.kind === "elimination" ? nativeTeamEliminationAnnouncement(c.name, c.color, next)
      : c.kind.endsWith("Drop") ? nativeCrateDropAnnouncement(c.kind.replace("Drop", ""), next)
      : c.kind === "poison" ? nativePoisonAnnouncement(c.name, next)
      : c.kind === "suddenDeath" ? nativeSuddenDeathAnnouncement(next)
      : nativeMatchResultAnnouncement(c.name, c.color, c.kind === "draw", next)).toEqual(c.message);
    expect(random).toBe(c.random);
  }
  for (const c of fixture.teamSoundCases) {
    const state = { ...c.before };
    expect(nativeTeamPanelSounds(state)).toEqual(c.calls);
    expect(state).toEqual(c.after);
  }
  for (const c of fixture.announcementAudioCases)
    expect(nativeAnnouncementAudioTick(c.volume, c.handle, c.long)).toEqual(c.after);
  for (const c of fixture.announcementDrawCases)
    expect(nativeAnnouncementDraw({ read: 0, stage: c.stage, scale: c.coverage,
      entries: [{ text: "READY", font: 23, teamOnly: c.teamOnly }] }, c.height, c.playback, c.visible)).toEqual(c.after);
  for (const c of fixture.announcementFrameCases)
    expect(nativeAnnouncementFrame(c.width, c.height, 7)).toEqual(c.calls);
  for (const c of fixture.announcementMaskCases)
    expect([...nativeAnnouncementMask(c.length, c.seed, c.coverage)]).toEqual(c.mask);
  for (const c of fixture.announcementQueueCases) {
    const state = { ...createNativeAnnouncements(), read: c.head, write: c.tail, stage: 2 };
    queueNativeAnnouncement(state, c.text, c.font, 2, 1);
    expect({ read: state.read, write: state.write, stage: state.stage, entry: state.entries[c.after.index], index: c.after.index }).toEqual(c.after);
  }
  for (const c of fixture.announcementCases) {
    const state = { ...c.before, entries: Array.from({ length: 20 }, () => ({ long: c.long })) };
    nativeAnnouncementTick(state);
    expect(nativeAnnouncementsPending(state)).toBe(c.pending);
    const { entries, ...after } = state;
    expect(after).toEqual(c.after);
  }
  for (const c of fixture.clockCountdownCases)
    expect(nativeTurnClockTick(c.remaining, c.active)).toEqual(c.after);
  for (const c of fixture.clockPresentationCases)
    expect(nativeClockPresentationTick(c.before, c.remaining, c.selected)).toEqual(c.after);
  expect(nativeClockFrame(56, 42, 22, 33)).toEqual(fixture.clockFrame);
  for (const c of fixture.clockSlideCases)
    expect(nativeClockSlide(c.progress, c.target)).toBe(c.after);
  for (const c of fixture.timerCases)
    expect(nativeTimerFont(c.milliseconds, c.running)).toBe(c.font);
  for (const c of fixture.listCases) {
    const list = structuredClone(c.before);
    const result = c.operation === "tick" ? nativeTeamListTick(list)
      : c.operation === "sort" ? sortNativeTeamList(list, c.scores) : removeNativeTeamListRow(list, c.scores);
    expect(result).toEqual(c.result);
    expect(list).toEqual(c.after);
    expect(nativeTeamListRows(list)).toEqual(c.rows);
  }
  for (const c of fixture.highlightCases)
    expect(nativeTeamHighlight(c.color, c.selected, c.tick)).toEqual(c.after);
  for (const c of fixture.healthCases)
    expect(nativeTeamHealthTick(c.value, c.roster, c.maximum, c.surrendered)).toEqual(c.after);
  for (const c of fixture.visibilityCases) {
    const state = { ...c.before };
    nativeTeamPanelVisibilityTick(state, c.keys.every(Boolean));
    expect(state).toEqual(c.after);
  }
  for (const c of fixture.panelCases) {
    const panel = { ...c.before };
    nativeTeamPanelTick(panel);
    expect(panel).toEqual(c.after);
  }
  for (const c of fixture.cases)
    expect(nativeHUDFrame(c.width, c.height, 11, 22, 33)).toEqual(c.calls);
});
test("live native team bars update with damage and keep HUD controls usable", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  // Exercise actual Canvas pixels against the executable palette captures,
  // including repeated updates and restoration of cached source artwork.
  const palettePixels = await page.evaluate(async () => {
    const { NativeCanvasPaletteDisplay } = await import('/src/armageddon/canvas-palette.js');
    const fixture = await (await fetch('/tests/fixtures/armageddon/environment-palette.json')).json();
    const display = new NativeCanvasPaletteDisplay();
    const canvases = fixture.ranges.map(([first, last], bank) => {
      const canvas = document.createElement('canvas');
      canvas.width = last - first + 2;
      canvas.height = 1;
      const pixels = new Uint8ClampedArray(canvas.width * 4);
      for (let i = first; i <= last; i++) pixels.set([...fixture.colors[i], 255], (i - first) * 4);
      canvas.getContext('2d').putImageData(new ImageData(pixels, canvas.width, 1), 0, 0);
      display.capture(canvas, bank + 1);
      return canvas;
    });
    let checked = 0;
    for (const row of fixture.cases.filter(row => !row.unchanged)) {
      display.update(row.input);
      display.update(row.input);
      for (let bank = 0; bank < 3; bank++) {
        const canvas = canvases[bank], [first, last] = fixture.ranges[bank];
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, 1).data;
        for (let i = first; i <= last; i++) {
          const actual = [...pixels.slice((i - first) * 4, (i - first + 1) * 4)];
          const expected = [...row.palettes[bank][i], 255];
          if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Palette mismatch ${bank}/${i}`);
          checked++;
        }
        if (pixels[pixels.length - 1] !== 0) throw new Error('Transparency changed');
      }
    }
    display.update();
    for (let bank = 0; bank < 3; bank++) {
      const [first, last] = fixture.ranges[bank];
      const pixels = canvases[bank].getContext('2d').getImageData(0, 0, last - first + 1, 1).data;
      for (let i = first; i <= last; i++)
        if (JSON.stringify([...pixels.slice((i - first) * 4, (i - first + 1) * 4)]) !== JSON.stringify([...fixture.colors[i], 255]))
          throw new Error('Source artwork did not restore');
    }
    return checked;
  });
  expect(palettePixels).toBe(576);

  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator(".native-team-health").first()).toHaveAttribute(
    "data-native-health",
    "100",
  );
  await page.evaluate(() => window.siege.debug.hit(1, 10));
  await expect(page.locator(".native-team-health").nth(1)).toHaveAttribute(
    "data-native-health",
    "100",
  );
  await expect(page.locator("#fire")).toBeEnabled();
  await expect(page.locator("#timer")).toBeInViewport();
  await expect(page.locator("#wind")).toBeInViewport();
  await expect.poll(() => page.locator(".match-bar").evaluate(el => el.style.getPropertyValue("--team-panel-offset"))).toBe("32px");
  await expect(page.locator(".native-team-health").first()).toHaveCSS("height", "17px");
  await page.screenshot({ path: info.outputPath("native-hud.png") });
  await page.keyboard.press("ArrowRight");
  const offset = () => page.locator(".match-bar").evaluate(el => el.style.getPropertyValue("--team-panel-offset"));
  await expect.poll(offset).toBe("0px");
  await page.keyboard.press("Shift+Delete");
  await expect.poll(offset).toBe("32px");
  await page.keyboard.press("Shift+Delete");
  await expect.poll(offset).toBe("0px");
  await page.evaluate(() => window.siege.debug.hit(0, 10));
  // Hitting the active worm resolves damage for both teams; 270/300 truncates
  // to 58982 in 16.16, then the original 100px draw truncates again to 89.
  await expect(page.locator(".native-team-health").nth(1)).toHaveAttribute("data-native-health", "89", { timeout: 10000 });
  await expect.poll(() => page.evaluate(() => window.siege.getState().worms.map(w => w.damageTaken))).toEqual([0, 0, 0, 0, 0, 0]);
  await page.evaluate(() => window.siege.debug.hit(0, 10));
  await expect.poll(() => page.evaluate(() => {
    const moss = document.querySelector(".team-lime").getBoundingClientRect();
    const coral = document.querySelector(".team-coral").getBoundingClientRect();
    return { x: moss.x - coral.x, y: moss.y - coral.y };
  }), { timeout: 10000 }).toEqual({ x: 0, y: 16 });
  await page.screenshot({ path: info.outputPath("native-hud-reordered.png") });
});
