import { captureReplayActors, restoreReplayActors } from "../src/armageddon/replay-actor-adapter.js";
import replayAnimation from "./fixtures/armageddon/replay-animation.json" with { type: "json" };
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import {
  NativeAnimationPlayer,
  nativeSpriteFrame,
  animationMetadata,
} from "../src/armageddon/animation.js";
import { nativeWeaponAnimation } from "../src/armageddon/weapon-animation.js";
import { decodeSprite } from "../src/armageddon/sprite.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/animation.json", import.meta.url),
  ),
);
const weapons = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/weapon-art.json", import.meta.url),
  ),
);

for (const group of [0, 1, 2])
  test(`equipped weapons display their original native sprites (${group})`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect
      .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
      .toBe(true);
    await page.locator("#mode").selectOption("local");
    await page.locator("#start").click();
    const poses = {
      rocket: "wbaz",
      mortar: "wbaz",
      grenade: "wthrgrn",
      mine: "wminlnk",
      shotgun: "wshotg",
      dynamite: "wdynlnk",
      cluster: "wthrcls",
      airstrike: "wairlnk",
      bat: "wbsbaim",
      homing: "wbaz2",
      holy: "wthrhgr",
    };
    for (const [weapon, sprite] of Object.entries(poses).slice(
      group * 4,
      group * 4 + 4,
    )) {
      await page.locator("#inventory-toggle").click();
      const button = page.locator(`[data-weapon="${weapon}"]`);
      await button.click();
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const state = window.siege.getState();
              return state.worms[state.current].originalSprite;
            }),
          { message: weapon },
        )
        .toBe(sprite);
    }
    if(group===0) {
      const breathing=await page.evaluate(async()=>{
        const {originalWormFrame}=await import("/src/armageddon/art.js");
        const worm={hp:100,team:0,nativePoison:{amount:0}},names=[];
        const sample=frame=>names.push(originalWormFrame(worm,"idle",frame,0,"rocket",false).name);
        sample(0);worm.hp=29;sample(1);worm.nativePoison.amount=5;sample(2);
        sample(200);worm.nativePoison.amount=0;sample(201);worm.hp=100;sample(202);
        return names;
      });
      expect(breathing).toEqual(["wbrth1","wbrth2","wpbrtlk","wpbrth","wbrth2","wbrth1"]);
      const gesture=await page.evaluate(async()=>{
        const {originalWormFrame,stepOriginalIdle}=await import("/src/armageddon/art.js");
        const worm={hp:100,team:0,nativePoison:{amount:0}},memory=new Uint8Array(0x390),scene=new Uint8Array(0x6000);
        originalWormFrame(worm,"idle",0,0,"rocket",false);
        worm.originalPlayer.current.progress=65535;
        let randomCalls=0;
        stepOriginalIdle(worm,1,memory,scene,{state:()=>101,random:()=>{randomCalls++;return 0;},teamStatus:()=>0,health:()=>100});
        const name=originalWormFrame(worm,"idle",1,0,"rocket",false).name;
        const before=[...worm.originalPlayer.replayState()];
        for(let i=0;i<20;i++)originalWormFrame(worm,"idle",1,0,"rocket",false);
        return {name,randomCalls,unchanged:JSON.stringify(before)===JSON.stringify([...worm.originalPlayer.replayState()]),cooldown:new DataView(memory.buffer).getInt32(0x2c8,true)};
      });
      expect(gesture).toEqual({name:"wblink1",randomCalls:2,unchanged:true,cooldown:200});

    }
    await page.screenshot({
      path: test.info().outputPath("native-weapon.png"),
    });
  });

test("native sampler, metadata and animation queue match original x86", { tag: "@logic" }, () => {
  for (const v of fixture.samples)
    expect(
      nativeSpriteFrame(v.count, v.flags, v.progress),
      JSON.stringify(v),
    ).toBe(v.frame);
  for (const v of fixture.metadata) {
    const sprite = decodeSprite(
      fs.readFileSync(
        new URL(`../public/armageddon/sprites/${v.name}.spr`, import.meta.url),
      ),
    );
    expect(animationMetadata(sprite), v.name).toEqual(v.result);
  }
  for (const v of fixture.queues) {
    const player = new NativeAnimationPlayer();
    const item = ([id, progress, rate, loop, span]) => ({
      id,
      progress,
      rate,
      loop,
      span,
    });
    player.current = item(v.current);
    player.read = v.read_index;
    player.write = (v.read_index + v.queued.length) & 15;
    v.queued.forEach((q, i) => {
      player.slots[(v.read_index + i) & 15] = item(q);
    });
    for (let tick = 1; tick <= 120; tick++) {
      player.advance(fixture.tick);
      const expected = v.snapshots.find((s) => s.tick === tick);
      if (expected)
        expect(player.snapshot(), `${v.name} tick ${tick}`).toEqual(
          expected.state,
        );
    }
  }
});

test("weapon animation selection matches all 71 initialized native records", { tag: "@logic" }, () => {
  expect(weapons.vectors).toHaveLength(71);
  for (const v of weapons.vectors)
    expect(nativeWeaponAnimation(v.fields), `weapon ${v.weapon_id}`).toBe(
      v.animation_id,
    );
});

test("native queue capacity, clearing and controlled progress match original x86", { tag: "@logic" }, () => {
  {
  const mesh = { dispose() {} }, player = new NativeAnimationPlayer();
  player.enqueue(1, { rate: 25 << 16, loop: 0, span: 1 }, 65000);
  player.enqueue(2, { rate: 25 << 16, loop: 1, span: 7 });
  const contacts = new Int32Array([17, 23, 31, 41]);
  const worm = { hp: 100, mesh, originalPlayer: player, contacts };
  const projectile = { owner: worm, attached: worm, animation: player, view: new DataView(contacts.buffer, 4, 8) };
  worm.target = projectile; worm.registry = new Map([[projectile, new Set([worm])]]);
  const saved = captureReplayActors([{ id: 'worm:0', actor: worm }, { id: 'projectile:0', actor: projectile }], { resourceKey: value => value === mesh ? 'worm:0/mesh' : undefined });
  const expected = new NativeAnimationPlayer().restoreReplayState(player.replayState()); expected.advance();
  worm.hp=1; contacts.fill(0); player.clear();
  const restore = () => restoreReplayActors(saved, { resolveResource: key => key === 'worm:0/mesh' ? mesh : undefined });
  const restored = restore(), w = restored.get('worm:0'), p = restored.get('projectile:0');
  expect(w.hp).toBe(100); expect(w.mesh).toBe(mesh); expect(w.target).toBe(p);
  expect(p.owner).toBe(w); expect(p.attached).toBe(w); expect(p.animation).toBe(w.originalPlayer);
  expect(w.registry.get(p).has(w)).toBe(true);
  expect(p.view.buffer).toBe(w.contacts.buffer); expect([...w.contacts]).toEqual([17,23,31,41]);
  w.originalPlayer.advance(); expect([...w.originalPlayer.replayState()]).toEqual([...expected.replayState()]);
  w.contacts.fill(0); w.hp=0;
  expect([...restore().get('worm:0').contacts]).toEqual([17,23,31,41]);
  expect(() => restoreReplayActors(saved)).toThrow('Missing replay resource');
  expect(() => captureReplayActors([{id:'worm:0',actor:worm}])).toThrow('Unmapped replay actor resource');
  }

  for (const row of replayAnimation.cases) {
    const player = new NativeAnimationPlayer().restoreReplayState(Uint8Array.from(row.bytes));
    for (const step of row.steps) {
      if (step.action === 'advance') player.advance();
      else if (step.action === 'clear') player.clear();
      expect([...player.replayState()]).toEqual(step.bytes);
      expect(step.position).toBe(0x160);
    }
  }

  const player = new NativeAnimationPlayer();
  expect(fixture.operations).toHaveLength(42);
  for (const [index, operation] of fixture.operations.entries()) {
    if (operation.action === "enqueue")
      player.enqueue(operation.id, operation.metadata, operation.progress);
    else if (operation.action === "setProgress")
      player.setProgress(operation.progress);
    else player[operation.action]();
    expect(
      player.snapshot(),
      `operation ${index}: ${operation.action}`,
    ).toEqual(operation.state);
  }
});
