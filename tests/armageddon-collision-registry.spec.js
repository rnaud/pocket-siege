import { test, expect } from "@playwright/test";
import masks from "./fixtures/armageddon/collision-mask.json" with { type: "json" };
import fixture from "./fixtures/armageddon/collision-registry.json" with { type: "json" };
import { NativeCollisionRegistry } from "../src/armageddon/collision-registry.js";

test("collision registry preserves native candidate order and overlap cache transitions", { tag: "@logic" }, () => {
  const mask = masks.cases.find((m) => m.shape === 3);
  for (const [index, scenario] of fixture.cases.entries()) {
    const bodies = new Map(scenario.initial.map((b) => [b.id, { ...b, mask }]));
    const registry = new NativeCollisionRegistry(
      scenario.registry.map((ids) => ids.map((id) => bodies.get(id) ?? null)),
    );
    for (const [step, r] of scenario.steps.entries()) {
      for (const [id, values] of Object.entries(r.changes))
        Object.assign(bodies.get(Number(id)), values);
      const hit = registry.query(bodies.get(r.actor), r.x, r.y, mask, r.flags);
      expect(
        {
          result: hit?.id ?? 0,
          overlaps: [...bodies.values()].map((body) => body.overlap),
        },
        `scenario ${index}, query ${step}`,
      ).toEqual({ result: r.result, overlaps: r.overlaps });
    }
  }
});
