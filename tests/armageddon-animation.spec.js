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
