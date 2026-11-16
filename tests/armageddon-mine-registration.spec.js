import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-registration.json" with { type: "json" };
import { nativeMineRegistration } from "../src/armageddon/mine-registration.js";

test("mine slot selection and eviction match original executable", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(48);
  for (const [i, c] of fixture.cases.entries()) {
    expect(
      nativeMineRegistration(c.slots, c.frame, c.color),
      `case ${i}`,
    ).toEqual({
      slot: c.slot,
      registeredFrame: c.registeredFrame,
      calls: c.calls,
    });
  }
});
