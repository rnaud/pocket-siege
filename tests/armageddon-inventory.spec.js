import initialization from './fixtures/armageddon/inventory-initialization.json' with {type:'json'};
import { nativeInitializeInventory } from '../src/armageddon/inventory-initialization.js';
import { createHash } from 'node:crypto';
import bankFixture from './fixtures/armageddon/inventory-banks.json' with { type:'json' };
import { nativeInventorySet, nativeInventoryAdd, nativeInventorySpend, nativeInventoryAvailable } from '../src/armageddon/inventory.js';
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import {
  addNativeAmmo,
  spendNativeAmmo,
  availableNativeAmmo,
  addAmmo,
  spendAmmo,
} from "../src/armageddon/inventory.js";
import { ammoFor } from "../src/weapons.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/inventory.json", import.meta.url),
  ),
);

test("inventory matches 120 cases executed by the original x86 routines", { tag: "@logic" }, () => {
  for(const row of initialization.cases) {
    const setup=new Uint8Array(0x10000),source=new DataView(setup.buffer);
    for(const [offset,size,value] of row.writes) {
      if(size===1)source.setUint8(offset,value);else source.setInt16(offset,value,true);
    }
    for(const [offset,name] of row.names)setup.set(new TextEncoder().encode(name+'\0'),offset);
    const memory=Uint8Array.from({length:0x2c14},(_,i)=>(row.fill+i%7)&255);
    nativeInitializeInventory(memory,setup);
    expect(createHash('sha256').update(memory).digest('hex')).toBe(row.sha256);
    for(const [team,slot,count] of row.availability)expect(nativeInventoryAvailable(memory,team,slot)).toBe(count);
  }
  const operations={set:nativeInventorySet,add:nativeInventoryAdd,spend:nativeInventorySpend,available:nativeInventoryAvailable};
  for(const row of bankFixture.cases) {
    const memory=new Uint8Array(0x2c14),view=new DataView(memory.buffer);
    for(const [offset,value] of row.writes)view.setInt32(offset,value,true);
    for(const step of row.steps) {
      const [name,...args]=step.operation,result=operations[name](memory,...args);
      if(name==='available')expect(result).toBe(step.result);
      expect(createHash('sha256').update(memory).digest('hex')).toBe(step.sha256);
    }
  }
  for (const v of fixture.vectors) {
    const result =
      v.operation === "add"
        ? addNativeAmmo(v.count, v.amount)
        : v.operation === "spend"
          ? spendNativeAmmo(v.count)
          : availableNativeAmmo(v.count, v.delay, v.bypass);
    expect(result, JSON.stringify(v)).toBe(v.result);
  }
  expect(fixture.vectors).toHaveLength(120);
  expect(addAmmo(Infinity, 1)).toBe(Infinity);
  expect(spendAmmo(Infinity)).toBe(Infinity);
  expect(ammoFor({ shotgun: -1 }, "shotgun")).toBe(Infinity);
  expect(ammoFor({ rocket: 0 }, "rocket")).toBe(0);
});

test("unlimited shotgun survives both shots and remains selectable", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.evaluate(() => window.siege.debug.setAmmo(0, "shotgun", -1));
  await page.locator("#inventory-toggle").click();
  // Special weapons share the expanded arsenal panel.
  const shotgun = page.locator('[data-weapon="shotgun"]');
  await expect(shotgun).toBeEnabled();
  await expect(shotgun.locator("small")).toHaveText("∞");
  await shotgun.click();
  // Fire into clear sky: a nearby terrain hit can injure the shooter and
  // correctly cancel the second shot, independently of unlimited ammunition.
  await page.locator("#angle").fill("90");
  await page.locator("#fire").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().shotgunRemaining))
    .toBe(1);
  expect(
    await page.evaluate(() => window.siege.getState().ammo[0].shotgun),
  ).toBe(-1);
  await page.locator("#fire").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().shotgunRemaining))
    .toBe(0);
  expect(
    await page.evaluate(() => window.siege.getState().ammo[0].shotgun),
  ).toBe(-1);
});
