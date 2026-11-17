import { test, expect } from "@playwright/test";
import { UTILITIES, UTILITY_KINDS, freshUtilities } from "../src/utilities.js";

test("utility inventory exposes the movement and support kit", { tag: "@logic" }, () => {
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
  ]);
  expect(loadout.rope).toBe(Infinity);
  expect(loadout.jetpack).toBe(1);
  expect(loadout.freeze).toBe(1);
  expect(loadout.fastwalk).toBe(0);
  expect(UTILITIES.teleport.label).toBe("Teleport");
});
