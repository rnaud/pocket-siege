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
