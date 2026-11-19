import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/worm-receiver.json" with { type: "json" };
import { nativeWormBodyCollision } from "../src/armageddon/body-collision.js";
import {
  attachNativeHurtFlight,
  stepNativeHurtFlight,
  nativeWormContactBody,
  applyNativeWormContact,
} from "../src/armageddon/hurt-flight.js";
import { nativeSceneCollision } from "../src/armageddon/collision-scene.js";

test("worm-to-worm receiver gate and momentum match the original executable", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(200);
  for (const c of fixture.cases) {
    expect(
      nativeWormBodyCollision(c.state, c.receiver, c.incoming, c.side),
      JSON.stringify(c),
    ).toEqual({
      receiver: { vx: c.receiver_out[0], vy: c.receiver_out[1] },
      incoming: { vx: c.incoming_out[0], vy: c.incoming_out[1] },
      result: c.result,
    });
  }
});

const height = 650;
function worm(x, y, vx = 0, vy = 0, state = 0x80) {
  return {
    x,
    y,
    vx,
    vy,
    hp: 100,
    facing: 1,
    team: 0,
    ...(state ? { originalHurt: { state, angle: 0 } } : {}),
  };
}
function environment(terrain, worms) {
  return {
    step(w, frame = 1) {
      return stepNativeHurtFlight(
        w,
        {
          height,
          waterLevel: 0,
          frame,
          collisionBody: (hit) =>
            hit >= 2
              ? nativeWormContactBody(worms[hit - 2], height)
              : { type: 1, vx: 0, vy: 0 },
          updateCollisionBody: (hit, body) => {
            if (hit >= 2) applyNativeWormContact(worms[hit - 2], body);
          },
        },
        (x, y, body) =>
          nativeSceneCollision(w, body, x, y, terrain, worms, height),
      );
    },
  };
}

test("registered hurt worm excludes itself and other hurt types", { tag: "@logic" }, () => {
  const a = worm(100, 200, 600),
    b = worm(118, 200);
  attachNativeHurtFlight(a, height);
  attachNativeHurtFlight(b, height);
  expect(a.nativeHurtBody.type).toBe(3);
  expect(a.nativeHurtBody.shape).toBe(3);
  const terrain = { solid: () => false },
    worms = [a, b];
  expect(
    nativeSceneCollision(a, a.nativeHurtBody, a.x, a.y, terrain, worms, height),
  ).toBe(0);
  environment(terrain, worms).step(a);
  expect(a.vx).toBe(600);
  expect(b.vx).toBe(0);
});

test("hurt contact imparts horizontal velocity and state to a standing receiver", { tag: "@logic" }, () => {
  const a = worm(100, 200, 600), b = worm(118, 200, 0, 0, null);
  b.nativeSpawnPhysics={waterDrag:0xd123,tangent:0x7000};
  const result = environment({ solid: () => false }, [a, b]).step(a);
  expect(b.nativeHurtBody).toMatchObject({state:0x80,type:3,vx:12*65536,waterDrag:0xd123,tangent:0x7000,drag:65536,field154:0});
  expect(a.vx).toBe(600);
  expect(b.vx).toBe(600);
  expect(result.events).toContainEqual({ operation: "state", target: 0x80, receiverHit: 3 });
  expect(result.events.some(c => c.operation === "voice" && c.receiverHit === 3)).toBe(true);
});

test("frozen receiver declines the hurt impulse and causes native incoming bounce", { tag: "@logic" }, () => {
  const a = worm(100, 200, 600), b = { ...worm(118, 200, 0, 0, null), frozen: true };
  environment({ solid: () => false }, [a, b]).step(a);
  expect(a.vx).toBeLessThan(0);
  expect(b.vx).toBe(0);
});

test("falling onto a worm uses type2 contact without terrain fall damage or twang", { tag: "@logic" }, () => {
  const a = worm(100, 230, 0, -600, 0x7f),
    b = worm(100, 200, 0, 0, null);
  const env = environment({ solid: () => false }, [a, b]);
  const calls = [];
  let result;
  for (let frame = 1; frame < 20; frame++) {
    result = env.step(a, frame);
    calls.push(...result.events);
    if ([0x65, 0x76].includes(result.body.state)) break;
  }
  expect(a.ground).toBe(false);
  expect(b.originalHurt.state).toBe(0x7f);
  expect(result.body.field250).toBe(0);
  expect(calls.some((c) => c.operation === "health")).toBe(false);
});

test("live update preserves native hurt impulse into the next standing worm", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  // This contact fixture needs empty air at its fixed world coordinates.
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await page.evaluate(() => {
    window.wormContact = null;
    window.siege.debug.stageWormContact();
    const sample = () => {
      const [a, b] = window.siege.getState().worms;
      if (b.vx > 1) window.wormContact = { a: a.vx, b: b.vx };
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await expect
    .poll(() => page.evaluate(() => window.wormContact), { timeout: 10000 })
    .not.toBeNull();
  const contact = await page.evaluate(() => window.wormContact);
  expect(contact.a).toBeGreaterThan(0);
  expect(contact.a).toBeCloseTo(600, 1);
  expect(contact.b).toBeGreaterThan(0);
  expect(contact.b).toBeGreaterThan(500);
  expect(errors).toEqual([]);
});
