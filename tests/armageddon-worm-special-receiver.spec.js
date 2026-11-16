import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/worm-special-receiver.json" with { type: "json" };
import ordinary from "./fixtures/armageddon/worm-receiver.json" with { type: "json" };
import { nativeWormReceiver } from "../src/armageddon/worm-receiver.js";

test("hurt and airborne receivers match original impulse, state, velocity and sound dispatch", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(995);
  for (const [i,c] of fixture.cases.entries()) {
    const e = c.environment;
    const actual = nativeWormReceiver(c.receiver, c.incoming, e.side, {
      recordAvailable: e.record, marked: e.marked, matched: e.matched,
      scale: e.scale, random: e.random, voiceId: 123, soundHandle: 456,
    });
    expect({
      receiver: [actual.receiver.vx, actual.receiver.vy, actual.receiver.state, actual.receiver.soundHandle],
      incoming: [actual.incoming.vx, actual.incoming.vy],
      result: actual.result, calls: actual.calls,
    }, `case ${i}: ${JSON.stringify(e)}`).toEqual({
      receiver: c.receiver_out, incoming: c.incoming_out, result: c.result, calls: c.calls,
    });
  }
});

test("full receiver preserves the verified ordinary type2 branch", { tag: "@logic" }, () => {
  for (const c of ordinary.cases) {
    const actual = nativeWormReceiver({ ...c.receiver, state: c.state }, { ...c.incoming, type: 2 }, c.side, {});
    expect([actual.receiver.vx, actual.receiver.vy]).toEqual(c.receiver_out);
    expect([actual.incoming.vx, actual.incoming.vy]).toEqual(c.incoming_out);
    expect(actual.result).toBe(c.result);
    expect(actual.calls).toEqual([]);
  }
});
