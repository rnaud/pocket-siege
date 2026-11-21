import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/burst.json" with { type: "json" };
import { nativeBurstTick } from "../src/armageddon/recoil.js";

test("burst countdown and next-state selection match original executable", { tag: "@logic" }, () => {
  for (const c of fixture.cases)
    expect(nativeBurstTick(c.before)).toEqual({ state: c.after, target: c.target });
});
