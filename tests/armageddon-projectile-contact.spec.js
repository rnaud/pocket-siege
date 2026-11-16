import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/projectile-contact.json" with { type: "json" };
import { nativeProjectileContact } from "../src/armageddon/projectile-contact.js";

test("projectile contact modes, detonation, probes, RNG and effects match the executable", () => {
  expect(fixture.cases).toHaveLength(1536);
  for (const [index, c] of fixture.cases.entries()) {
    const actual = nativeProjectileContact(c.body, c.environment.otherType, c.environment.side, {
      random: () => c.environment.random,
      probe: () => c.environment.probe,
      effectRandom: () => 77,
      respond: body => { if (c.environment.mutate) {
        body.vx = 777; body.vy = 888; body.x = (body.x + 65536) | 0;
      } },
    });
    expect(actual, `case ${index}`).toEqual({ body: c.output, calls: c.calls });
  }
});
