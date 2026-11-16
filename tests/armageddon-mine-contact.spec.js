import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-contact.json" with { type: "json" };
import { nativeMineContact } from "../src/armageddon/mine-contact.js";

test("mine contact ordering, impact level and forced dud state match original executable", () => {
  expect(fixture.cases).toHaveLength(288);
  for (const [i, c] of fixture.cases.entries()) {
    const body = { vx: c.vx, vy: c.vy, state: 0 };
    const calls = [];
    nativeMineContact(body, c, c.side, c.suppress, {
      sound: (request) => calls.push({ operation: "sound", request }),
      receive: (side) => {
        calls.push({ operation: "receive", side });
        return c.accepted;
      },
      bounce: (side) => calls.push({ operation: "bounce", side }),
    });
    expect({ calls, state: body.state }, `case ${i}`).toEqual({
      calls: c.calls,
      state: c.state,
    });
  }
});
