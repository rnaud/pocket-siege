import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-camera.json" with { type: "json" };
import { nativeMineCamera } from "../src/armageddon/mine-camera.js";

test("mine camera activity and order promotion match original executable", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(108);
  for (const [i, c] of fixture.cases.entries()) {
    expect(
      nativeMineCamera(c.body, c.timer, c.orders, c.index),
      `case ${i}`,
    ).toEqual({
      after: c.after,
      requests: c.requests,
      activity: c.activity,
    });
  }
});
