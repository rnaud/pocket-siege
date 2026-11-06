import { test, expect } from "@playwright/test";
import { UTILITIES, UTILITY_KINDS, freshUtilities } from "../src/utilities.js";

test("utility inventory exposes the movement and support kit", () => {
  const loadout = freshUtilities();
  expect(UTILITY_KINDS).toEqual([
    "rope",
    "jetpack",
    "parachute",
    "teleport",
    "girder",
    "freeze",
  ]);
  expect(loadout.rope).toBe(Infinity);
  expect(loadout.jetpack).toBe(1);
  expect(loadout.freeze).toBe(1);
  expect(UTILITIES.teleport.label).toBe("Teleport");
});
