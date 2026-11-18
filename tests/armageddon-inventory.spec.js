import setupFixture from './fixtures/armageddon/inventory-setup.json' with {type:'json'};
import { nativeBuildInventorySetup, nativeSetupWeaponValue, nativeFindSetupTeam, nativePrepareInventoryScheme } from '../src/armageddon/inventory-setup.js';
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
  for(const row of setupFixture.preparations) {
    const template=setupFixture.cases[0],memory=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),view=new DataView(memory.buffer);
    for(const [offset,size,value] of template.writes) {
      if(size===1)view.setUint8(offset,value);else if(size===2)view.setUint16(offset,value,true);else view.setInt32(offset,value,true);
    }
    for(const [offset,name] of template.names)memory.set(new TextEncoder().encode(name+'\0'),offset);
    const state=Uint8Array.from(Buffer.from(row.initial,'hex'));
    nativePrepareInventoryScheme(memory,state);
    expect(Buffer.from(state).toString('hex')).toBe(row.prepared);
    const descriptors=new Uint8Array(0x1d8);descriptors.fill(255,0xd0);
    nativeBuildInventorySetup(memory,state.subarray(0x14,0xec),0,[],{descriptors,teamData:new Uint8Array(0x9000)});
    expect(createHash('sha256').update(memory).digest('hex')).toBe(row.setup_sha256);
    const inventory=new Uint8Array(0x2c14);nativeInitializeInventory(inventory,memory.subarray(0x3c));
    expect(createHash('sha256').update(inventory).digest('hex')).toBe(row.inventory_sha256);
  }
  for(const row of setupFixture.lookups) {
    const data=new Uint8Array(0x9000);
    for(const [offset,hex] of row.writes)data.set(Buffer.from(hex,'hex'),offset);
    const name=Buffer.from(row.name,'hex');
    expect(nativeFindSetupTeam(data,name)).toBe(row.results[0]);
    expect(nativeFindSetupTeam(data,name,true)).toBe(row.results[1]);
  }
  for(const row of setupFixture.cases) {
    const memory=Uint8Array.from({length:0x10000},(_,i)=>(i*7+3)&255),view=new DataView(memory.buffer);
    for(const [offset,size,value] of row.writes) {
      if(size===1)view.setUint8(offset,value);else if(size===2)view.setUint16(offset,value,true);else view.setInt32(offset,value,true);
    }
    for(const [offset,name] of row.names)memory.set(new TextEncoder().encode(name+'\0'),offset);
    const descriptors=new Uint8Array(0x1d8),descriptorView=new DataView(descriptors.buffer);
    row.descriptors.forEach((record,i)=>record.forEach((value,j)=>descriptorView.setInt32(0xd0+i*12+j*4,value,true)));
    row.getter_results.forEach(([count,delay],slot)=>{
      expect(nativeSetupWeaponValue(descriptors,slot)).toBe(count);
      expect(nativeSetupWeaponValue(descriptors,slot,true)).toBe(delay);
    });
    const teamData=new Uint8Array(0x9000),teamView=new DataView(teamData.buffer);
    for(const [team,statsIndex,specialIndex] of row.team_records) {
      const name=new TextEncoder().encode('Team'+team+'\0');
      teamData.set(name,0xc30+statsIndex*0x39c);teamData[0xc41+statsIndex*0x39c]=1;
      teamData.set(name,0x379f+specialIndex*0xd7b);teamData[0x38c0+specialIndex*0xd7b]=1;
      row.saved[team].forEach((value,slot)=>teamView.setInt16(0x508+statsIndex*0x8e+slot*2,value,true));
      teamData[0x38c1+specialIndex*0xd7b]=row.specials[team];
    }
    nativeBuildInventorySetup(memory,row.scheme,row.preset,row.extras,{
      descriptors,
      teamData,
    });
    expect(createHash('sha256').update(memory).digest('hex')).toBe(row.sha256);
    const inventory=new Uint8Array(0x2c14);nativeInitializeInventory(inventory,memory.subarray(0x3c));
    expect(createHash('sha256').update(inventory).digest('hex')).toBe(row.inventory_sha256);
  }
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
