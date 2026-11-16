import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { nativeWormAirborneContact } from "../src/armageddon/worm-contact.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/worm-contact.json", import.meta.url),
  ),
);
test("airborne contact matches native landing, ceiling and position-attempt decisions", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(3600);
  for (const v of fixture.cases) {
    const queries = [];
    const result = nativeWormAirborneContact(
      v.input,
      v.otherType,
      v.side,
      v.environment,
      (x, y) => {
        queries.push([x, y]);
        return v.pattern[queries.length - 1];
      },
    );
    expect({ result, queries }, JSON.stringify(v)).toEqual({
      result: v.result,
      queries: v.queries,
    });
  }
});

import { nativeWormAirborneCollision } from "../src/armageddon/worm-contact.js";
test("complete airborne callback matches receiver dispatch, bounce and facing update", { tag: "@logic" }, () => {
  expect(fixture.complete_callbacks).toHaveLength(7200);
  for (const v of fixture.complete_callbacks) {
    const queries = [];
    const result = nativeWormAirborneCollision(
      v.input,
      v.other,
      v.side,
      v.environment,
      (x, y) => {
        queries.push([x, y]);
        return v.pattern[(queries.length - 1) % v.pattern.length];
      },
      () => v.environment.otherResponse,
    );
    expect({ result, queries }, JSON.stringify(v)).toEqual({
      result: v.result,
      queries: v.queries,
    });
  }
});
