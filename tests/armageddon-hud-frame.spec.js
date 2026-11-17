import controllerInput from "./fixtures/armageddon/controller-input.json" with { type: "json" };
import { nativeCollectControllerInput } from "../src/armageddon/controller-input.js";
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
