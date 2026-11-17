import { test, expect } from "@playwright/test";
import { UTILITIES, UTILITY_KINDS, freshUtilities } from "../src/utilities.js";
import environment from './fixtures/armageddon/team-environment.json' with { type: 'json' };
import { nativeTeamEnvironment } from '../src/armageddon/team-environment.js';
import automatic from './fixtures/armageddon/automatic-utilities.json' with { type: 'json' };
import { nativeAutomaticUtilities } from '../src/armageddon/automatic-utilities.js';

test("utility inventory exposes the movement and support kit", { tag: "@logic" }, () => {
  for (const row of environment.cases)
    expect(nativeTeamEnvironment(row.input, row.flags)).toEqual(row.output);
  for (const row of automatic.cases) {
    const result = nativeAutomaticUtilities(row.input, row.available, row.bits);
    expect(result.body).toEqual(row.output);
    expect(row.counts.map((count, i) => result.cleared.includes(67 + i) ? 0 : count)).toEqual(row.after);
  }
  const loadout = freshUtilities();
  expect(UTILITY_KINDS).toEqual([
    "bungee",
    "rope",
    "jetpack",
    "parachute",
    "teleport",
    "girder",
    "freeze",
    "fastwalk",
    "lowgravity",
  ]);
  expect(loadout.rope).toBe(Infinity);
  expect(loadout.jetpack).toBe(1);
  expect(loadout.freeze).toBe(1);
  expect(loadout.fastwalk).toBe(0);
  expect(loadout.lowgravity).toBe(0);
  expect(loadout.doubledamage).toBe(0);
  expect(loadout.doubletime).toBe(0);
  expect(UTILITIES.teleport.label).toBe("Teleport");
});
