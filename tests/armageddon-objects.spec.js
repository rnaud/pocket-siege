import { test, expect } from "@playwright/test";
async function start(page, map) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  expect(
    await page.evaluate(() => window.siege.getState().originalArtError),
  ).toBeNull();
  await page.locator("#mode").selectOption("local");
  if (map) await page.locator("#map-layout").selectOption(map);
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
}
test("original crates descend by parachute and switch to ground idle art", async ({
  page,
}) => {
  await start(page, "fern");
  const initial = await page.evaluate(() => window.siege.getState());
  expect(initial.crate.sprite).toMatch(/^[muw]crate0$/);
  expect(initial.crate.nativeBody.state).toBe(100);
  await expect.poll(() => page.evaluate(() => window.siege.getState().crate?.sprite))
    .toMatch(/^[muw]crate2$/);
  expect(initial.hazards.length).toBeGreaterThan(0);
  expect(initial.hazards.every((h) => h.sprite === "oildrum1")).toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().crate?.sprite), {
      timeout: 15000,
    })
    .toMatch(/^[muw]crate1$/);
  await page.screenshot({ path: "test-results/original-world-objects.png" });
  const spy = await page.evaluate(async () => {
    const { captureReplayActors, restoreReplayActors } = await import('/src/armageddon/replay-actor-adapter.js');
    const debug = window.siege.debug, saved = debug.captureReplayState();
    const state = restoreReplayActors(saved.actors, { resolveResource: id => saved.resources.get(id) }).get('match');
    const keys = new Map([...saved.resources].map(([id, value]) => [value, id]));
    const install = () => debug.restoreReplayState({ ...saved,
      actors: captureReplayActors([{ id: 'match', actor: state }], { resourceKey: value => keys.get(value) }) });
    const render = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    state.turn.utilityAmmo[state.turn.team].cratespy = 1;
    state.actors.crates[0].kind = 'special';
    state.actors.crates[0].content = 'magic';
    state.actors.crates[0].nativeBody.kind = 1;
    install(); debug.advanceReplayFrames(1); await render();
    const mesh = state.actors.crates[0].mesh;
    const label = () => mesh.children.find(child => child.userData.nativeCrateLabel === 0);
    const visible = label()?.visible;
    const consumed = window.siege.getState().utilities.cratespy === 0;
    const text = label()?.userData.nativeTextKey;
    // The native human-controller gate suppresses the same team flag for AI.
    state.turn.team = 1; state.turn.mode = 'ai';
    state.actors.worms[state.turn.current].nativeTeamModifiers = 32;
    install(); await render();
    const hiddenForAI = !label()?.visible;
    debug.restoreReplayState(saved);
    return { visible, consumed, text, hiddenForAI };
  });
  expect(spy.visible).toBe(true);
  expect(spy.consumed).toBe(true);
  expect(spy.text).toContain('Magic bullet');
  expect(spy.hiddenForAI).toBe(true);
  const ranks = await page.evaluate(async () => {
    const { restoreReplayActors } = await import('/src/armageddon/replay-actor-adapter.js');
    const debug = window.siege.debug, before = debug.captureReplayState();
    const decode = snapshot => restoreReplayActors(snapshot.actors, { resolveResource: id => snapshot.resources.get(id) }).get('match');
    const first = decode(before), id = first.actors.crates[0].nativeOrderId;
    debug.collectCrate();
    const after = decode(debug.captureReplayState()).controllers.renderOrder;
    debug.restoreReplayState(before);
    const restored = decode(debug.captureReplayState()).controllers.renderOrder;
    return { allocated: first.controllers.renderOrder.active.includes(id),
      released: after.free.includes(id) && !after.active.includes(id),
      restored: JSON.stringify(restored) === JSON.stringify(first.controllers.renderOrder) };
  });
  expect(ranks).toEqual({ allocated: true, released: true, restored: true });
  const pickups=await page.evaluate(()=>{
    const debug=window.siege.debug,snapshot=debug.captureReplayState(),results=[];
    for(const kind of ['health','grenade','utility']) {
      debug.restoreReplayState(snapshot);debug.setCrateKind(kind);
      const before=window.siege.getState(),content=before.crate.content,quantity=before.crate.quantity;
      debug.collectCrate();const after=window.siege.getState();
      const value=state=>kind==='health'?state.worms[state.current].hp:
        kind==='utility'?state.utilities[content]:state.ammo[state.team][content];
      results.push({kind,quantity,before:value(before),after:value(after),removed:after.crate===null});
    }
    debug.restoreReplayState(snapshot);return results;
  });
  for(const pickup of pickups) {
    expect(pickup.after).toBe(pickup.before+pickup.quantity);
    expect(pickup.removed).toBe(true);
  }

});
test("cluster fragments and fire use original art in live gameplay", async ({
  page,
}) => {
  await start(page, "fern");
  await page.evaluate(() => window.siege.debug.explodeAt(600, 500, "cluster"));
  const fragments = await page.evaluate(() => window.siege.getState().bombs);
  expect(fragments).toHaveLength(5);
  expect(fragments.every((b) => b.sprite === "clustlet")).toBe(true);
  const flames = await page.evaluate(() => {
    window.siege.debug.explodeAt(600, 350, "napalm");
    return window.siege.getState().nativeFlames;
  });
  expect(flames).toHaveLength(1);
  expect(flames[0].sprite).toMatch(/^petrol-?[1-6]$/);
  expect(flames[0].record.slice(7)).toEqual([4000, 100, 20, 1]);
});
test("native object strips preserve ping-pong playback and feet when changing canvas size", async ({
  page,
}) => {
  await start(page);
  const result = await page.evaluate(async () => {
    const { createOriginalObject, updateOriginalObject, updateOriginalCrate, originalVisual } =
      await import("/src/armageddon/art.js");
    const mesh = createOriginalObject("wcrate2", -10);
    const foot = () => {
      const frame = originalVisual(mesh.userData.originalSprite);
      const plane = mesh.children[0];
      return plane.position.y + plane.scale.y / 2 - frame.bottom;
    };
    const fallingFoot = foot();
    updateOriginalObject(mesh, "wcrate1", 0);
    const landedFoot = foot();
    const data = originalVisual("wcrate1");
    updateOriginalObject(mesh, "wcrate1", 0, 0x8000);
    const middle = mesh.userData.originalFrame;
    updateOriginalObject(mesh, "wcrate1", 0, 0xffff);
    const end = mesh.userData.originalFrame;
    const { H } = await import('/src/physics.js');
    const body = { x: 100.75 * 65536, y: 200.25 * 65536, kind: 1, state: 104,
      progress: 0, openingProgress: 0, variant: 0, fuse: 1500, submerged: 0 };
    updateOriginalCrate(mesh, body, { rank: 2, frame: 25, showContents: true,
      contentName: 'Grenade', contentSpecial: true });
    const labels = mesh.children.filter(child => child.userData.nativeCrateLabel !== undefined);
    const crateDraw = { position: [mesh.position.x, mesh.position.y],
      centered: [mesh.children[0].position.x, mesh.children[0].position.y],
      labels: labels.filter(child => child.visible).length,
      countdownBorder: [...labels.find(child => child.userData.nativeCrateLabel === 1).material.map.image
        .getContext('2d').getImageData(1,0,1,1).data] };
    updateOriginalCrate(mesh, { ...body, fuse: 0 }, { showContents: false });
    crateDraw.hidden = labels.every(child => !child.visible);
    crateDraw.expectedY = H - 200;
    for (const label of labels) { label.geometry.dispose(); label.material.map.dispose(); label.material.dispose(); }
    mesh.children[0].geometry.dispose();
    mesh.children[0].material.dispose();
    return { fallingFoot, landedFoot, middle, end, count: data.count, crateDraw };
  });
  expect(result.crateDraw).toEqual({ position: [100, result.crateDraw.expectedY], centered: [0,0],
    labels: 2, countdownBorder: [255,255,255,255], hidden: true, expectedY: result.crateDraw.expectedY });
  expect(result.fallingFoot).toBe(-10);
  expect(result.landedFoot).toBe(-10);
  expect(result.middle).toBe(result.count - 1);
  expect(result.end).toBe(1);
});

test("planting a mine displays the original unarmed sprite", async ({
  page,
}) => {
  await start(page, "fern");
  if (!(await page.locator(".weapon-panel").isVisible()))
    await page.locator("#inventory-toggle").click();
  await page.locator('[data-weapon="mine"]').click();
  await page.locator("#fire").click();
  const mines = await page.evaluate(() => window.siege.getState().mines);
  expect(mines).toHaveLength(1);
  expect(mines[0].sprite).toBe("mineoff");
});
