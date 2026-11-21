import { test, expect } from "./helpers/shared-page.js";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { nativeSin, nativeCos } from "../src/armageddon/trig.js";
import { nativeLaunch } from "../src/armageddon/launch.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/launch.json", import.meta.url),
  ),
);
test("native trig matches original x86 for all 65536 input words", { tag: "@logic" }, () => {
  const bytes = Buffer.alloc(65536 * 8);
  for (let angle = 0; angle < 65536; angle++) {
    bytes.writeInt32LE(nativeSin(angle), angle * 8);
    bytes.writeInt32LE(nativeCos(angle), angle * 8 + 4);
  }
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    fixture.trig_sha256,
  );
  for (const angle of [-1, -65536, 65536, 2147483647]) {
    expect(nativeSin(angle)).toBe(nativeSin(angle & 65535));
    expect(nativeCos(angle)).toBe(nativeCos(angle & 65535));
  }
});
test("native launch offsets, directions and RNG consumption match original x86", { tag: "@logic" }, () => {
  expect(fixture.vectors).toHaveLength(1056);
  for (const v of fixture.vectors) {
    const queries = [];
    let draws = 0;
    const result = nativeLaunch(v.fields, {
      x: 100 << 16,
      y: 200 << 16,
      angle: v.angle,
      facing: v.facing,
      preview: v.preview,
      targetX: 321,
      vx: 111,
      vy: 222,
      random: () => {
        draws++;
        return v.random;
      },
      solid: (x, y) => {
        queries.push([x, y]);
        return queries.length >= v.block_after;
      },
    });
    expect(
      [result.x, result.y, result.vx, result.vy],
      JSON.stringify(v),
    ).toEqual(v.result);
    expect(queries).toEqual(v.queries);
    expect(draws).toBe(v.rng_draws);
  }
});
