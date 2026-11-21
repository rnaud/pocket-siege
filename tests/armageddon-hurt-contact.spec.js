import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/hurt-contact.json" with { type: "json" };
import { nativeWormHurtCollision } from "../src/armageddon/hurt-contact.js";
test("hurt collision damage, recovery, bounce and state transitions match original callback", { tag: "@logic" }, () => {
  for (const row of fixture.cases) {
    const queries = [];
    expect(
      nativeWormHurtCollision(
        row.input,
        row.other,
        row.side,
        row.environment,
        (x, y) => {
          queries.push([x, y]);
          return 0;
        },
      ),
    ).toEqual(row.result);
    expect(queries).toEqual(row.queries);
  }
});
