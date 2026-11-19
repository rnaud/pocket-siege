import { test, expect } from "@playwright/test";
import { loadMissionScript } from "../src/armageddon/mission-script.js";
import { resolveMissionDefinition } from "../src/armageddon/mission-files.js";
import { createMissionState, runMissionTimed, runMissionSequence, missionMode, missionGameOver,
  missionSucceeded, missionMedal } from "../src/armageddon/mission-runtime.js";

const script = (path, attempts = 0) =>
  loadMissionScript(resolveMissionDefinition(path), { attempts, text: index => `text ${index}` });

test("mission scripts load through the original event loader", { tag: "@logic" }, () => {
  const mission0 = script("mission/mission0.wam");
  expect(mission0.timed.map(event => `${event.type}@${event.turn}`)).toEqual([
    "3@0", "3@0", "1@0", "1@0", "1@0", "1@0", "1@0", "1@0", "1@0", "1@0", "2@0", "7@4", "9@11"]);
  expect(mission0.timed[1]).toMatchObject({ x: 1610, y: 600, marked: 1, vital: 1 });
  expect(mission0.sequence.map(step => step.type)).toEqual([15, 6]);
  // Retries 1 events join the script after one failed attempt.
  expect(script("mission/mission0.wam", 1).timed.map(event => `${event.type}@${event.turn}`))
    .toContain("3@0");
  expect(script("mission/mission0.wam", 1).timed).toHaveLength(15);
  const training1 = script("mission/training1.wam");
  expect(training1.timed).toEqual([expect.objectContaining({ type: 5, turn: 0, marked: 1, x: 770, y: 608 })]);
  expect(training1.sequence.map(step => step.type)).toEqual([16, 5, 16, 6]);
});

test("timed runner executes one due event per call and blocks on retries", { tag: "@logic" }, () => {
  const state = createMissionState();
  const events = [{ type: 7, turn: 0 }, { type: 3, turn: 0 }, { type: 7, turn: 2 }];
  const ran = [];
  let allow = false;
  const execute = event => { if (event.type === 3 && !allow) return false; ran.push(event.type); return true; };
  expect(runMissionTimed(state, events, execute)).toBe(true);
  expect(runMissionTimed(state, events, execute)).toBe(false);
  expect(state.timedCursor).toBe(1);
  allow = true;
  expect(runMissionTimed(state, events, execute)).toBe(true);
  state.turn = 1;
  expect(runMissionTimed(state, events, execute)).toBe(false);
  state.turn = 3;
  // Missed events are skipped, never run.
  expect(runMissionTimed(state, events, execute)).toBe(false);
  expect(ran).toEqual([7, 3]);
  expect(state.timedCursor).toBe(3);
});

test("sequence waits on Marked counters and type 17 loops to the start", { tag: "@logic" }, () => {
  const state = createMissionState();
  const steps = [{ type: 3 }, { type: 15 }, { type: 7 }, { type: 17 }];
  const spawned = [];
  const execute = step => {
    if (step.type === 3) { spawned.push("crate"); state.markedCrates++; return true; }
    if (step.type === 7) { spawned.push("text"); return true; }
    return false;
  };
  expect(runMissionSequence(state, steps, execute)).toBe(1);
  expect(state.sequenceCursor).toBe(1);
  expect(runMissionSequence(state, steps, execute)).toBe(0);
  state.markedCrates = 0;
  // Wait passes, text runs, 17 rewinds to 0, the crate respawns and waits again.
  expect(runMissionSequence(state, steps, execute)).toBe(4);
  expect(spawned).toEqual(["crate", "text", "crate"]);
  expect(state.sequenceCursor).toBe(1);
  state.endCode = 5;
  expect(runMissionSequence(state, steps, execute)).toBe(0);
});

test("SetEventTurn rewinds the timed cursor through the runner increment", { tag: "@logic" }, () => {
  const state = createMissionState();
  state.turn = 3;
  const events = [{ type: 7, turn: 2 }, { type: 14, turn: 3, eventTurn: 3 }];
  const execute = event => {
    if (event.type === 14) { state.timedCursor = -1; state.turn = event.eventTurn - 1; }
    return true;
  };
  expect(runMissionTimed(state, events, execute)).toBe(true);
  expect(state).toMatchObject({ timedCursor: 0, turn: 2 });
});

test("mission end and success rules follow the original frontend", { tag: "@logic" }, () => {
  expect([0, 1, 2, 3].map(missionMode)).toEqual([2, 3, 2, 3]);
  const human = { human: true, vital: false, alliance: 0, alive: true };
  const enemy = { human: false, vital: false, alliance: 1, alive: true };
  const state = createMissionState();
  expect(missionGameOver(state, 2, [human, enemy])).toBe(false);
  expect(missionGameOver(state, 2, [human, { ...enemy, alive: false }])).toBe(true);
  expect(missionGameOver(state, 3, [human, { ...enemy, alive: false }])).toBe(false);
  expect(missionGameOver(state, 3, [{ ...human, alive: false }, enemy])).toBe(true);
  // A vital CPU team does not keep a mode-2 game alive.
  expect(missionGameOver(state, 2, [human, { ...enemy, vital: true }])).toBe(true);
  expect(missionGameOver({ ...state, endCode: 5 }, 3, [human, enemy])).toBe(true);
  const result = (winningCondition, resultCode, teams, surrendered = false) =>
    missionSucceeded({ winningCondition, resultCode, teams, surrendered });
  expect(result(0, 3, [human, { ...enemy, alive: false }])).toBe(true);
  expect(result(0, 3, [human, enemy])).toBe(false);
  expect(result(1, 4, [human])).toBe(true);
  expect(result(1, 5, [human])).toBe(false);
  expect(result(2, 3, [human, enemy])).toBe(true);
  expect(result(2, 3, [{ ...human, alive: false }, enemy])).toBe(false);
  expect(result(3, 5, [human])).toBe(true);
  expect(result(3, 4, [human])).toBe(false);
  expect(result(3, 5, [human], true)).toBe(false);
  expect([missionMedal(0, 0), missionMedal(0, 2), missionMedal(0, 7), missionMedal(3, 7)]).toEqual([3, 2, 1, 3]);
});
