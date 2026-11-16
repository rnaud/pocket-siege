import { test, expect } from "@playwright/test";
import fs from "node:fs";
import {
  nativeChargeTick,
  nativeLaunchVelocity,
} from "../src/armageddon/power.js";
const fixture = JSON.parse(
  fs.readFileSync(new URL("./fixtures/armageddon/power.json", import.meta.url)),
);
test("native velocity scaling and charge accumulation match original x86", () => {
  expect(fixture.vectors).toHaveLength(2840);
  expect(fixture.charge).toHaveLength(45);
  for (const v of fixture.vectors)
    expect(
      nativeLaunchVelocity(
        v.fields,
        ...v.direction,
        v.power,
        v.state,
        v.inherited_y,
      ),
      JSON.stringify(v),
    ).toEqual(v.result);
  for (const v of fixture.charge)
    expect(nativeChargeTick(v.type, v.power), JSON.stringify(v)).toEqual({
      power: v.result,
      target: v.targets[0] ?? null,
    });
});
test("native full charge transitions on the 76th simulation tick", () => {
  let power = 0;
  for (let tick = 1; tick <= 75; tick++) {
    const result = nativeChargeTick(1, power);
    expect(result.target).toBeNull();
    power = result.power;
  }
  expect(power).toBe(65475);
  expect(nativeChargeTick(1, power)).toEqual({ power: 65536, target: 0x69 });
});
