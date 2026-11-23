import { test, expect } from "./helpers/shared-page.js";

// Live CPU turns run the original AI task (cpu-ai-live.js): the 004CCFA0
// stepper plans with the flood fill and every weapon family, then drives the
// worm only through controller events applied to the host controls.
async function startAiMatch(page, seed = 42) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="ai"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  // Pause across the reseed so no real-time frame runs before the recorded
  // ones: every run then replays the same match.
  await page.evaluate(async (value) => {
    window.siege.debug.setSimulationPaused(true);
    await window.siege.debug.resetSeed(value);
  }, seed);
}

// Advance logic frames and record each CPU turn: AI states, the controller
// events of every frame, the AI worm's native position and the shots fired.
// `prepare(state)` runs once at the start of every CPU turn.
async function recordCpuTurns(page, { turns = 2, frames = 9000, prepare = null } = {}) {
  return page.evaluate(({ turns, frames, prepare }) => {
    const setup = prepare ? new Function("state", "debug", prepare) : null;
    // Resume and hand the turn to the CPU inside this synchronous call.
    window.siege.debug.setSimulationPaused(false);
    document.querySelector("#skip")?.click();
    const out = [];
    let turn = null;
    for (let f = 0; f < frames && out.length < turns; f++) {
      const before = window.siege.getState();
      if (before.team === 1 && !turn) {
        turn = { frames: [], plans: [], start: f };
        setup?.(before, window.siege.debug);
      }
      if (before.team === 0 && turn) {
        out.push(turn);
        turn = null;
      }
      if (before.team === 0 && before.phase === "aim") document.querySelector("#skip")?.click();
      window.siege.debug.advanceReplayFrames(1);
      const s = window.siege.getState(), p = s.aiPlan;
      if (!turn || s.team !== 1 || !p) continue;
      turn.frames.push({ f, phase: s.phase, state: p.state, family: p.family, weapon: p.weapon, events: p.events,
        position: p.position, native: p.native, retreat: s.retreat, power: p.nativePower, aim: p.nativeAim,
        fuse: p.fuse, score: p.score, slot: p.slot });
    }
    return out;
  }, { turns, frames, prepare });
}
const eventsOf = (turn) => turn.frames.flatMap((frame) => frame.events.map((event) => ({ f: frame.f, event: event[0],
  words: event.slice(1), state: frame.state, phase: frame.phase, position: frame.position })));
const FIRE = new Set([0x40e, 0x40f]);

test("computer turns run the original AI end to end", async ({ page }) => {
  test.setTimeout(30000);
  await startAiMatch(page);
  const turns = await recordCpuTurns(page, { turns: 3 });
  expect(turns.length).toBe(3);
  for (const turn of turns) {
    // The native stepper drives every CPU turn (no host fallback).
    expect(turn.frames.every((frame) => frame.native)).toBe(true);
    const states = new Set(turn.frames.map((frame) => frame.state));
    expect(states.has(0x7b)).toBe(true); // 004CD460 planning
    const events = eventsOf(turn);
    // Every event is one of the controller events 004D0760 sends.
    for (const { event } of events)
      expect([0x406, 0x407, 0x408, 0x409, 0x40a, 0x40b, 0x40c, 0x40d, 0x40e, 0x40f, 0x410, 0x417, 0x41a, 0x41b, 0x42b])
        .toContain(event);
  }
  // The AI may choose any family; at least one turn presses fire.
  expect(turns.some((turn) => eventsOf(turn).some((e) => e.event === 0x40e))).toBe(true);
  // Ballistic shots keep the 004F2FD0 quantisation (covered in depth by the @logic specs).
  const ballistic = turns.flatMap((turn) => turn.frames).filter((frame) => frame.family === "ballistic" && frame.state === 0x6a);
  for (const plan of ballistic) {
    expect(["rocket", "grenade", "cluster", "banana", "holy", "napalm"]).toContain(plan.weapon);
    // 004F2FD0 clamps power to 0x1999..0x10000 in 0x369 steps; aim in 0x200 steps.
    expect(plan.power % 0x369).toBe(0);
    expect(plan.power).toBeGreaterThanOrEqual(0x17df);
    expect(plan.aim % 0x200).toBe(0);
    if (plan.weapon === "grenade") expect(plan.fuse).toBeGreaterThanOrEqual(1);
    expect(plan.score).toBeGreaterThan(0);
  }
});

test("a CPU turn walks its planned path, aims, charges, fires and retreats", async ({ page }) => {
  test.setTimeout(30000);
  await startAiMatch(page);
  const turns = await recordCpuTurns(page, { turns: 3 });
  // A charged release: fire up on a later frame than its fire down (004F3250).
  const chargedRelease = (events) => events.findIndex((e, i) => e.event === 0x40f &&
    events.slice(0, i).some((d) => d.event === 0x40e && d.f < e.f));
  const shot = turns.find((turn) => {
    const events = eventsOf(turn);
    const release = chargedRelease(events);
    return release > 0 && events.slice(0, release).some((e) => e.event === 0x406 || e.event === 0x407);
  });
  expect(shot, "a CPU turn walks before a charged shot").toBeTruthy();
  const events = eventsOf(shot);
  const release = chargedRelease(events);
  const press = events.findLastIndex((e, i) => i < release && e.event === 0x40e);
  const walks = events.slice(0, press).filter((e) => e.event === 0x406 || e.event === 0x407);
  // Path following (state 0x66): one held walk event per frame, and the worm moved.
  expect(walks.every((e) => e.state === 0x66)).toBe(true);
  expect(new Set(walks.map((e) => e.f)).size).toBe(walks.length);
  const startX = shot.frames[0].position[0], fireX = events[press].position[0];
  expect(Math.abs(fireX - startX)).toBeGreaterThan(5);
  // Aim steps (state 0x68) precede the charge; the release matches the planned power.
  const aims = events.slice(0, press).filter((e) => e.event === 0x408 || e.event === 0x409);
  expect(aims.every((e) => e.state === 0x68)).toBe(true);
  const fired = shot.frames.find((frame) => frame.f === events[release].f);
  expect(fired.power % 0x369).toBe(0);
  // 004F3E50 retreat (state 0x6A then a 0x66 walk) while the retreat clock runs.
  const after = events.slice(release + 1);
  const retreatWalks = after.filter((e) => e.event === 0x406 || e.event === 0x407);
  expect(retreatWalks.length).toBeGreaterThan(0);
  expect(shot.frames.some((frame) => frame.f > events[release].f && frame.state === 0x6a)).toBe(true);
  const lastRetreat = retreatWalks.at(-1);
  // The retreat moves the worm (seen the frame after its last walk event),
  // possibly stepping it off a ledge into a fall.
  const moved = shot.frames.find((frame) => frame.f > lastRetreat.f).position;
  expect(Math.hypot(moved[0] - events[release].position[0], moved[1] - events[release].position[1])).toBeGreaterThan(3);
  expect(after.some((e) => FIRE.has(e.event))).toBe(false);
});

test("with only close-range weapons the CPU plans a gun or fire punch shot", async ({ page }) => {
  test.setTimeout(30000);
  await startAiMatch(page);
  // Leave the CPU team the shotgun and fire punch, and stand its worms next to the enemy.
  const prepare = `
    for (const kind of Object.keys(state.ammo[1])) debug.setAmmo(1, kind, 0);
    debug.setAmmo(1, "rocket", 0);
    debug.setAmmo(1, "shotgun", 2);
    debug.setAmmo(1, "firepunch", 2);
    debug.setUtility(1, "teleport", 0);
    const enemy = state.worms.findIndex((w) => w.team === 0 && w.hp > 0);
    state.worms.forEach((w, i) => { if (w.team === 1) debug.setWormPosition(i, state.worms[enemy].x - 24 - 30 * (i % 3)); });
  `;
  const turns = await recordCpuTurns(page, { turns: 2, prepare });
  const close = turns.find((turn) => turn.frames.some((frame) => ["gun", "melee"].includes(frame.family) &&
    eventsOf(turn).some((e) => e.event === 0x40e)));
  expect(close, "a gun or melee plan is executed").toBeTruthy();
  const events = eventsOf(close);
  const plan = close.frames.find((frame) => ["gun", "melee"].includes(frame.family));
  expect([11, 16]).toContain(plan.slot);
  // 0x41B selects the planned slot unless it is already the selected weapon.
  const select = events.find((e) => e.event === 0x41b);
  if (select) expect(select.words[2]).toBe(plan.slot);
  const fire = events.findIndex((e) => e.event === 0x40e);
  // Guns and the punch press and release fire in the same frame (action 0x6A).
  expect(events[fire + 1]?.event).toBe(0x40f);
  expect(events[fire + 1].f).toBe(events[fire].f);
});
