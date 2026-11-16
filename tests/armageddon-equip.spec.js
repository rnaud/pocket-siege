import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { nativeWeaponEquip } from "../src/armageddon/equip.js";
const fixture = JSON.parse(
  fs.readFileSync(new URL("./fixtures/armageddon/equip.json", import.meta.url)),
);
test("weapon equip queues and angle rules match 1533 original x86 cases", () => {
  expect(fixture.vectors).toHaveLength(1533);
  for (const v of fixture.vectors) {
    expect(
      nativeWeaponEquip(
        v.fields,
        v.previous_state,
        v.angle,
        v.weapon_id,
        v.rope_mode,
        7,
      ),
      JSON.stringify(v),
    ).toEqual({ calls: v.calls, angle: v.result_angle, control: v.control });
  }
});

test("renderer plays native equip links before controlled weapon poses", async ({
  page,
}) => {
  await page.goto("/");
  const results = await page.evaluate(async () => {
    const { loadOriginalArt, originalWormFrame } =
      await import("/src/armageddon/art.js");
    await loadOriginalArt();
    return ["rocket", "grenade", "shotgun", "bat"].map((weapon) => {
      const worm = { hp: 100, frozen: 0 };
      const first = originalWormFrame(worm, "aim", 0, 45, weapon, true);
      const last = originalWormFrame(worm, "aim", 100, 45, weapon, true);
      return [
        weapon,
        first.name,
        first.aimed,
        first.equipped,
        last.name,
        last.aimed,
      ];
    });
  });
  expect(results).toEqual([
    ["rocket", "wbazlnk", false, true, "wbaz", true],
    ["grenade", "wgrnlnk", false, true, "wthrgrn", true],
    ["shotgun", "wshglnk", false, true, "wshotg", true],
    ["bat", "wbsblnk", false, true, "wbsbaim", true],
  ]);
});
