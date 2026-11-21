import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/camera-priority.json" with { type: "json" };
import { NativeCameraPriority } from "../src/armageddon/camera-priority.js";
test("camera bounds, disabled accumulation and priority hold match original routines", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(120);
  for (const [i, c] of fixture.cases.entries()) {
    const camera = new NativeCameraPriority();
    camera.cap = c.cap;
    camera.lastFrame = c.lastFrame;
    for (const request of c.requests) camera.offer(...request, c.disabled);
    expect(camera.select(c.frame), `case ${i}`).toEqual(c.bounds);
    expect(camera.groups).toEqual(c.groups);
    expect(camera.cap).toBe(c.outputCap);
    expect(camera.lastFrame).toBe(c.outputFrame);
  }
  for (const row of fixture.resets) {
    const camera = new NativeCameraPriority();
    camera.lastFrame = 123;
    for (const request of [[1,100,200],[9,-300,400],[13,500,-600]]) camera.offer(...request);
    camera.offerSpecial(77,88);
    camera.setPriority(row.cap);
    expect(camera.groups).toEqual(row.groups);
    expect(camera.cap).toBe(row.outputCap);
    expect(camera.lastFrame).toBe(row.lastFrame);
    expect(Number(camera.special !== null)).toBe(row.special);
  }
});
