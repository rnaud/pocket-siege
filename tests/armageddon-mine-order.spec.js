import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-order.json" with { type: "json" };
import { NativeRenderOrder } from "../src/armageddon/render-order.js";

test("shared render order initialization and mine allocation/release match original executable", () => {
  const pool = new NativeRenderOrder();
  const snapshot = () => ({
    free: pool.free,
    active: pool.active,
    orders: pool.orders,
  });
  expect(snapshot()).toEqual(fixture.initial);
  expect(fixture.cases).toHaveLength(12);
  for (const [i, c] of fixture.cases.entries()) {
    expect(snapshot(), `before ${i}`).toEqual(c.before);
    if (c.operation === "allocate") expect(pool.allocate()).toBe(c.index);
    else pool.release(c.index);
    expect(snapshot(), `after ${i}`).toEqual(c.after);
  }
});
