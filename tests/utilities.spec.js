import { test, expect } from "@playwright/test";
import { UTILITIES, UTILITY_KINDS, freshUtilities } from "../src/utilities.js";
import environment from './fixtures/armageddon/team-environment.json' with { type: 'json' };
import { nativeTeamEnvironment } from '../src/armageddon/team-environment.js';

test("utility inventory exposes the movement and support kit", { tag: "@logic" }, () => {
  for (const row of environment.cases)
    expect(nativeTeamEnvironment(row.input, row.flags)).toEqual(row.output);
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
  expect(UTILITIES.teleport.label).toBe("Teleport");
});
