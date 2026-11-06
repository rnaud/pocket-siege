import { test, expect } from "@playwright/test";
import { MODIFIERS, modifierSettings } from "../src/modifiers.js";

test("modifier presets expose gravity, blast and turn settings", () => {
  expect(modifierSettings("standard")).toMatchObject({
    gravityScale: 1,
    blastScale: 1,
    turnSeconds: 45,
  });
  expect(modifierSettings("low-gravity").gravityScale).toBe(0.55);
  expect(modifierSettings("big-blasts").blastScale).toBe(1.35);
  expect(modifierSettings("quick-turns").turnSeconds).toBe(30);
  expect(modifierSettings("moon-chaos")).toMatchObject({
    gravityScale: 0.55,
    blastScale: 1.35,
    turnSeconds: 30,
  });
  expect(modifierSettings("missing")).toEqual(MODIFIERS.standard);
});
