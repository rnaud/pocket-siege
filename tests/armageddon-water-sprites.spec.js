import { test, expect } from "@playwright/test";
import fs from "node:fs";
import bank from "../src/armageddon/water-sprite-ids.json" with { type: "json" };

test("water descriptor table resolves every native sprite to its original file", () => {
  expect(bank.table).toBe("00566E78");
  expect(Object.keys(bank.sprites)).toHaveLength(74);
  for (const { name } of Object.values(bank.sprites))
    expect(
      fs.existsSync(`public/armageddon/media/water/blue/water/${name}.spr`),
      name,
    ).toBe(true);
});

test("all water sprites preserve source pixels; submerged projectiles use their own frames and clocks", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const {
      originalVisual,
      createOriginalVisual,
      updateOriginalProjectile,
      projectileSprites,
    } = await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    const { NativeAnimationPlayer, animationMetadata, nativeSpriteFrame } =
      await import("/src/armageddon/animation.js");
    const bank = (await import("/src/armageddon/water-sprite-ids.json"))
      .default;
    let mismatches = 0;
    const decoded = new Map();
    for (const { name } of Object.values(bank.sprites)) {
      const sprite = decodeSprite(
        await fetch(`/armageddon/media/water/blue/water/${name}.spr`).then(
          (r) => r.arrayBuffer(),
        ),
      );
      decoded.set(name, sprite);
      for (let index = 0; index < sprite.frames.length; index++) {
        const art = originalVisual(`water/${name}`, index);
        const canvas = art.map.image;
        const actual = canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data;
        const expected = spriteFrameRGBA(sprite, index);
        if (canvas.width !== sprite.width || canvas.height !== sprite.height)
          mismatches++;
        for (let i = 0; i < actual.length; i++)
          if (actual[i] !== expected[i]) mismatches++;
      }
    }
    const transitions = [];
    for (const [kind, name] of Object.entries(projectileSprites)) {
      const mesh = createOriginalVisual(name);
      const sprite = decoded.get(name);
      const player = new NativeAnimationPlayer();
      player.enqueue(1, animationMetadata(sprite));
      updateOriginalProjectile(mesh, kind, 100, 0, 1, false);
      updateOriginalProjectile(mesh, kind, 100, -100, 1.02, true);
      const entry = mesh.userData.originalFrame;
      for (let tick = 1; tick <= 100; tick++) {
        player.advance();
        updateOriginalProjectile(mesh, kind, 100, -100, 1.02 + tick / 50, true);
        if (
          mesh.userData.originalFrame !==
          nativeSpriteFrame(
            sprite.frames.length,
            sprite.metadata[2],
            player.current.progress,
          )
        )
          mismatches++;
      }
      const submerged = mesh.userData.originalSprite;
      updateOriginalProjectile(mesh, kind, 100, 0, 3.04, false);
      const resurfaced = mesh.userData.originalSprite;
      updateOriginalProjectile(mesh, kind, 0, -100, 3.06, true);
      transitions.push({
        kind,
        entry,
        submerged,
        resurfaced,
        reentry: mesh.userData.originalFrame,
      });
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    return {
      mismatches,
      transitions,
      error: window.siege.getState().originalArtError,
    };
  });
  expect(result.error).toBeNull();
  expect(result.mismatches).toBe(0);
  for (const t of result.transitions) {
    expect(t.entry, t.kind).toBe(0);
    expect(t.reentry, t.kind).toBe(0);
    expect(t.submerged).toBe(`water/${t.resurfaced}`);
  }
});
