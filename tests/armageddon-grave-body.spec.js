import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/grave-body.json" with { type: "json" };
import {
  nativeGraveBody,
  stepNativeGraveBody,
} from "../src/armageddon/grave-body.js";
const environment = {
  frame: 0,
  index: 0,
  waterY: 500,
  gravity: 0x3d70,
  wind: 0,
};
test("grave body fields match original base and grave constructor instructions", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(5);
  for (const row of fixture.cases)
    expect(nativeGraveBody(row.x, row.y, row.friction)).toEqual(row.body);
});
test("graves rise, fall and bounce on land without wind drift", { tag: "@logic" }, () => {
  let body = nativeGraveBody(100 << 16, 200 << 16);
  let rose = false,
    fell = false,
    bounced = false;
  for (let frame = 0; frame < 100; frame++) {
    const previous = body;
    body = stepNativeGraveBody(
      body,
      { ...environment, frame, wind: 0x4000 },
      (x, y) => Number(y >> 16 >= 210),
    );
    rose ||= body.y < previous.y;
    fell ||= body.y > previous.y;
    bounced ||= previous.vy > 0 && body.vy < 0;
    expect(body.x).toBe(100 << 16);
    expect(body.y).toBeLessThan(210 << 16);
  }
  expect({ rose, fell, bounced }).toEqual({
    rose: true,
    fell: true,
    bounced: true,
  });
});
test("submerged graves use water acceleration and retire terrain collision", { tag: "@logic" }, () => {
  let body = nativeGraveBody(100 << 16, 200 << 16);
  body.vy = 0;
  body = stepNativeGraveBody(body, { ...environment, waterY: 100 }, () => 0);
  expect(body.submerged).toBe(1);
  expect(body.flags).toBe(0x400000);
  expect(body.vy).toBe(0x4ccc);
  let calls = 0;
  const next = stepNativeGraveBody(
    body,
    { ...environment, frame: 1, waterY: 100 },
    () => {
      calls++;
      return 1;
    },
  );
  expect(calls).toBe(0);
  expect(next.y).toBeGreaterThan(body.y);
  expect(next.vy).toBeGreaterThan(body.vy);
});
