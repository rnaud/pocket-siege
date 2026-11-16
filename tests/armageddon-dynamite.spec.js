import { test, expect } from "@playwright/test";
import { attachNativeProjectile, nativeProjectileLaunchGeometry, stepNativeProjectile } from "../src/armageddon/projectile-runtime.js";

test("dynamite uses original fixed release power, five-second fuse and blast record", { tag: "@logic" }, () => {
  const w = { x: 200, y: 400, facing: 1, vy: 0 };
  const a = nativeProjectileLaunchGeometry("dynamite",w,90,100,650);
  const b = nativeProjectileLaunchGeometry("dynamite",w,-90,0,650);
  expect(a).toEqual(b);
  expect(a.x).toBe(w.x);
  expect(a.y).toBe(w.y);
  expect(a.vx).toBeGreaterThan(30);
  expect(a.vx).toBeLessThan(40);
  expect(a.vy).toBeGreaterThan(45);
  expect(a.vy).toBeLessThan(50);
  const p = { ...a, kind: "dynamite", owner: 0, fuse: 1, bounce: 0.55 };
  attachNativeProjectile(p,650);
  expect(p.nativeTimer.remaining).toBe(5000);
  expect(p.nativeFuseSound).toBe(0x10042);
  expect(p.nativeArt.primary).toEqual({ sprite: 665, mode: 0 });
  expect(p.nativeDetonation).toMatchObject({ damage: 75, push: 100, offset: 50 });
  p.nativeBody.gravityScale = 0;
  const events = [];
  for (let frame=1; frame<=250; frame++) {
    const result = stepNativeProjectile(p,{height:650,waterLevel:-10000,frame},()=>0);
    events.push(...result.events);
    expect(result.detonate).toBe(false);
  }
  expect(events.filter(e=>e.operation==="stopSound")).toEqual([{ operation:"stopSound",request:[0x10042],timer:true }]);
  expect(stepNativeProjectile(p,{height:650,waterLevel:-10000,frame:251},()=>0).detonate).toBe(true);
});

test("live dynamite moves, advances its native fuse strip and stops the original fuse loop", async ({page}) => {
  await page.addInitScript(() => {
    window.fusePlayback=[];
    const start=AudioBufferSourceNode.prototype.start, stop=AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start=function(...args) {
      if(this.loop) window.fusePlayback.push("start");
      return start.apply(this,args);
    };
    AudioBufferSourceNode.prototype.stop=function(...args) {
      if(this.loop) window.fusePlayback.push("stop");
      return stop.apply(this,args);
    };
  });
  const samples=[];
  page.on("request",r=>{ if(/\/(fuse|laugh)\.wav$/.test(r.url())) samples.push(r.url().split("/").pop()); });
  await page.goto("/");
  await page.waitForFunction(()=>window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(()=>window.siege.debug.resetSeed(42));
  await page.locator("#sound").click();
  await page.locator("#inventory-toggle").click();
  await page.locator("#special-toggle").click();
  await page.locator('[data-weapon="dynamite"]').click();
  const x=await page.evaluate(()=>window.siege.getState().worms[0].x);
  await page.locator("#fire").click();
  const first=await page.evaluate(()=>window.siege.getState().bombs[0]);
  expect(first.kind).toBe("dynamite");
  expect(first.nativeDamage).toBe(75);
  expect(first.fuse).toBeGreaterThan(4);
  const observed=await page.evaluate(async()=>{
    const frames=new Set(), xs=new Set(), start=performance.now();
    await new Promise(resolve=>{
      function sample(){
        const b=window.siege.getState().bombs.find(b=>b.kind==="dynamite");
        if(!b || performance.now()-start>12000){resolve();return;}
        frames.add(b.frame); xs.add(b.x); requestAnimationFrame(sample);
      }
      sample();
    });
    return {frames:[...frames],xs:[...xs],state:window.siege.getState()};
  });
  expect(observed.frames.length).toBeGreaterThan(2);
  expect(observed.xs.some(value=>Math.abs(value-x)>2)).toBe(true);
  expect(observed.state.bombs).toHaveLength(0);
  expect(observed.state.explosions).toBeGreaterThan(0);
  expect(samples.sort()).toEqual(["fuse.wav","laugh.wav"]);
  expect(await page.evaluate(()=>window.fusePlayback)).toEqual(["start","stop"]);
});
