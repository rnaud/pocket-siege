import { test, expect } from "./helpers/shared-page.js";
import { NativePhysicsList } from "../src/armageddon/physics-list.js";

test("physics list slots follow append, hole and end-of-frame compaction order", { tag: "@logic" }, () => {
  const terrain = {}, a = {}, b = {}, c = {}, d = {};
  const list = new NativePhysicsList();
  list.sync([terrain, a, b, c]);
  expect([terrain, a, b, c].map((body) => list.slot(body))).toEqual([1, 2, 3, 4]);
  // 004C9460 leaves a hole: later bodies keep their slots for this frame and
  // a new body (004C8F80) is appended after the hole.
  list.sync([terrain, a, c, d]);
  expect([list.slot(b), list.slot(c), list.slot(d)]).toEqual([0, 4, 5]);
  expect(list.ordered().map(([, slot]) => slot)).toEqual([1, 2, 4, 5]);
  // 004CA7E0 compacts at the end of the frame, keeping membership order.
  list.finishFrame();
  expect([terrain, a, c, d].map((body) => list.slot(body))).toEqual([1, 2, 3, 4]);
  // A body first seen while ticking is appended, as at construction.
  const e = {};
  expect(list.slot(e) || list.append(e)).toBe(5);
});
