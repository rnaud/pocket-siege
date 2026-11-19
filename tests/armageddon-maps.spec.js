import {attachNativeDrillFlight} from '../src/armageddon/worm-flight.js';
import {attachNativeHurtFlight} from '../src/armageddon/hurt-flight.js';
import {createNativeRopeShot} from '../src/armageddon/rope-runtime.js';
import { nativePlaceWormAt } from "../src/armageddon/worm-placement.js";
import { nativeSceneCollision } from "../src/armageddon/collision-scene.js";
import { nativeDefaultMapObjects } from "../src/armageddon/map-setup.js";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { OriginalMapTerrain } from "../src/armageddon/maps.js";
import { decodeImage } from "../src/armageddon/image.js";

const catalog = JSON.parse(fs.readFileSync("public/armageddon/media.json"));
const maps = catalog.assets.filter((asset) => asset.group === "maps");
function read(asset) {
  const bytes = fs.readFileSync(`public/armageddon/${asset.path}`);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

test("all 100 authored maps retain full source pixels and collision orientation", { tag: "@logic" }, () => {
  expect(maps).toHaveLength(100);
  for (const asset of maps) {
    const buffer = read(asset),
      source = decodeImage(buffer);
    const terrain = new OriginalMapTerrain(buffer, asset.id);
    expect([terrain.width, terrain.height]).toEqual([1920, 696]);
    expect([terrain.nativePalette.first, terrain.nativePalette.last]).toEqual([137, 248]);
    expect(terrain.nativePaletteMapping.includes(255), asset.id).toBe(false);
    let mismatches = 0,
      solids = 0;
    for (let i = 0; i < source.pixels.length; i++) {
      const index = source.pixels[i],
        x = i % source.width;
      const y = source.height - 1 - Math.floor(i / source.width);
      if (terrain.sourcePixels[i] !== index) mismatches++;
      if (terrain.solid(x, y) !== (index !== 0)) mismatches++;
      if (index) solids++;
      for (let c = 0; c < 4; c++) {
        const expected = index ? source.palette[index * 4 + c] : 0;
        if (terrain.pixels[i * 4 + c] !== expected) mismatches++;
      }
    }
    expect(mismatches, asset.id).toBe(0);
    expect(solids, asset.id).toBeGreaterThan(0);
    expect(terrain.solid(-1, 0)).toBe(false);
    expect(terrain.solid(1920, 0)).toBe(false);
    expect(terrain.solid(0, 696)).toBe(false);
  }
});

test("map destruction clears artwork and collision together without changing source or other pixels", { tag: "@logic" }, () => {
  const buffer = read(maps[0]);
  const originalBytes = new Uint8Array(buffer).slice();
  const terrain = new OriginalMapTerrain(buffer);
  const before = terrain.pixels.slice();
  const cx = 960,
    cy = terrain.surface(960) - 12,
    radius = 35;
  expect(terrain.carve(cx, cy, radius)).toBeGreaterThan(0);
  let mismatch = 0;
  for (let y = 0; y < terrain.height; y++) {
    for (let x = 0; x < terrain.width; x++) {
      const inside = (x - cx) ** 2 + (y - cy) ** 2 < radius ** 2;
      const offset = ((terrain.height - 1 - y) * terrain.width + x) * 4;
      for (let c = 0; c < 4; c++)
        if (terrain.pixels[offset + c] !== (inside ? 0 : before[offset + c]))
          mismatch++;
      if (inside && terrain.solid(x, y)) mismatch++;
    }
  }
  expect(mismatch).toBe(0);
  expect(new Uint8Array(buffer)).toEqual(originalBytes);
  expect(terrain.carve(cx, cy, radius)).toBe(0);
});

test("authored map is playable at full size and switching back restores the host world", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator('[data-mode="local"]').click();
  await page.locator("#map-layout").selectOption("original:image/artclass.img");
  await page.locator("#start").click();
  const state = await page.evaluate(async () => { await window.siege.debug.resetSeed(42); return window.siege.getState(); });
  expect(state.mapLayout).toBe("original:image/artclass.img");
  expect(state.world).toEqual({ width: 1920, height: 696 });
  expect(state.worms).toHaveLength(6);
  expect(state.mines.length).toBeGreaterThan(0);
  expect(state.hazards.length).toBeGreaterThan(0);
  expect(state.mines.length+state.hazards.length).toBeLessThanOrEqual(nativeDefaultMapObjects.count);
  for(const mine of state.mines) {
    expect(mine.nativeTimer.placed).toBe(0);
    expect(mine.nativeTimer.arm).toBe(0);
    expect(mine.nativeTimer.fuse).toBe(nativeDefaultMapObjects.fuse*1000);
    expect(mine.team).toBe(-1);
    expect(mine.y).toBeGreaterThan(state.waterLevel);
    expect(mine.nativeBody.x).not.toBe(0);
  }
  expect(state.worms.every((w) => w.hp === 100 && w.y > state.waterLevel)).toBe(
    true,
  );
  await page.screenshot({ path: info.outputPath("original-artclass-map.png") });
  await page.evaluate(() => window.siege.debug.explodeAt(960, 350, "cluster"));
  await page.evaluate(async () => {
    document.querySelector("#map-layout").value = "fern";
    await window.siege.debug.resetSeed(42);
  });
  expect((await page.evaluate(() => window.siege.getState())).world).toEqual({
    width: 1200,
    height: 650,
  });
});

test("all authored maps support six separated, grounded worm spawns including caves", { tag: "@logic" }, async () => {
  const { originalMapSpawns } =
    await import("../src/armageddon/map-placement.js");
  const { bodyBlocked } = await import("../src/physics.js");
  const {nativeMapTheme}=await import("../src/armageddon/map-theme.js");
  const theme=nativeMapTheme(Object.fromEntries(["soil","grass","bridge-l","bridge","bridge-r"].map(name=>{
    const bytes=fs.readFileSync(`public/armageddon/media/level/forest/level/${name}.img`);
    return [name,decodeImage(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength))];
  })),true);
  for (const asset of maps) {
    const terrain = new OriginalMapTerrain(read(asset), asset.id);
    const positions = originalMapSpawns(
      terrain,
      80,
      6,42,theme,nativeDefaultMapObjects,
    );
    expect(positions, asset.id).toHaveLength(6);
    expect(terrain.nativeSpawnSetup.objects.length).toBeLessThanOrEqual(nativeDefaultMapObjects.count);
    for(const object of terrain.nativeSpawnSetup.objects) {
      const x=object.kind==="mine"?object.payload[2]:object.x,y=object.kind==="mine"?object.payload[3]:object.y;
      expect(positions.some(p=>p.x===x/65536 && p.y===terrain.height-y/65536)).toBe(false);
    }
    const worms=[];
    for(const p of positions) {
      const worm={...p,vx:0,vy:0,hp:100};
      const placed=nativePlaceWormAt(Math.round(p.x*65536),Math.round((terrain.height-p.y)*65536),terrain.height-80,96,
        (x,y,body)=>nativeSceneCollision(worm,body,x/65536,terrain.height-y/65536,terrain,worms,terrain.height,[]));
      // Constructor coefficients survive movement and mode changes. The extra
      // pixel offset makes recomputing water drag from the new position differ.
      const moved={...worm,x:worm.x+13.25,y:worm.y+7.5,facing:1,team:0,nativeSpawnPhysics:placed.physics};
      attachNativeDrillFlight(moved,{height:terrain.height,friction:1});
      const airborne=moved.nativeFlight;
      moved.originalHurt={state:0x80,angle:0};
      const hurt=attachNativeHurtFlight(moved,terrain.height);
      const rope=createNativeRopeShot(moved,45,terrain.height);
      for(const body of [airborne,hurt,rope])for(const [field,value] of Object.entries(placed.physics))expect(body[field],field).toBe(value);
      worm.x=placed.x/65536;worm.y=terrain.height-placed.y/65536;
      worm.ground=bodyBlocked(terrain,worm.x,worm.y-1);worms.push(worm);
    }
    for (const [i, worm] of worms.entries()) {
      expect(worm.y, asset.id).toBeGreaterThan(80);
      expect(worm.y, asset.id).toBeLessThanOrEqual(terrain.height);
      expect(worm.ground, asset.id).toBe(true);
      expect(bodyBlocked(terrain, worm.x, worm.y), asset.id).toBe(false);

      for (const other of worms.slice(0, i))
        expect(
          Math.abs(worm.x - other.x) >= 32 || Math.abs(worm.y - other.y) >= 32,
          asset.id,
        ).toBe(true);
    }
  }
});
