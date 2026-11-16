import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/grave-lifecycle.json" with { type: "json" };
import { nativeGraveLifecycle } from "../src/armageddon/grave-lifecycle.js";
test("grave depth, animation and bubble arithmetic match original x86", { tag: "@logic" }, () => {
  for (const r of fixture.cases)
    expect(
      nativeGraveLifecycle(r.progress, r.phase, r.wet, r.y, r.depth),
    ).toEqual(r.result);
});
test("submerged graves emit every fourth simulation tick and stop at depth cutoff", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { createOriginalGrave, stepOriginalGrave } =
      await import("/src/armageddon/graves.js");
    const grave = createOriginalGrave({ x: 100, y: 90, team: 0, facing: 1 });
    const counts = [];
    for (let i = 0; i < 12; i++) {
      stepOriginalGrave(grave, { solid: () => false }, 0.02, 100);
      counts.push(grave.bubbleRequests);
    }
    const before = grave.progress;
    grave.y = 0;
    const alive = stepOriginalGrave(grave, { solid: () => false }, 0.02, 100);
    return {
      counts,
      alive,
      unchanged: grave.progress === before,
      bubbles: grave.bubbleRequests,
    };
  });
  expect(result).toEqual({
    counts: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    alive: false,
    unchanged: true,
    bubbles: 0,
  });
});
