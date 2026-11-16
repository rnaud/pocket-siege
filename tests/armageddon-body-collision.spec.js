import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { nativeBodyCollision } from "../src/armageddon/body-collision.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/body-collision.json", import.meta.url),
  ),
);
test("two-body collision reproduces native momentum, damping and early-return ordering", () => {
  expect(fixture.cases).toHaveLength(432);
  for (const v of fixture.cases) {
    const result = nativeBodyCollision(v.receiver, v.incoming, v.side);
    expect(result, JSON.stringify(v)).toEqual({
      receiver: { vx: v.receiver_out[0], vy: v.receiver_out[1] },
      incoming: { vx: v.incoming_out[0], vy: v.incoming_out[1] },
      result: v.result,
    });
  }
});
