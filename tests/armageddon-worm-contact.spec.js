import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { nativeWormAirborneContact } from "../src/armageddon/worm-contact.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/worm-contact.json", import.meta.url),
  ),
);
test("airborne contact matches native landing, ceiling and position-attempt decisions", () => {
  expect(fixture.cases).toHaveLength(2880);
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
