import { test, expect } from "@playwright/test";
import fs from "node:fs";
import crypto from "node:crypto";
import { decodeImage } from "../src/armageddon/image.js";
import {
  nativeTerrainObjectMasks,
  nativeTerrainObjectFits,
  nativeFindTerrainObject,
} from "../src/armageddon/terrain-object-masks.js";
const root = new URL("../", import.meta.url);
const definitions = JSON.parse(
  fs.readFileSync(new URL("src/armageddon/terrain-objects.json", root)),
);
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("tests/fixtures/armageddon/terrain-masks.json", root),
  ),
);
test("terrain masks match original Landgen for every listed object and boundary case", () => {
  expect(fixture.cases).toHaveLength(553);
  for (const entry of fixture.cases) {
    const image = entry.asset
      ? decodeImage(
          fs.readFileSync(new URL("public/armageddon/" + entry.asset, root)),
        )
      : { ...entry, pixels: Buffer.from(entry.pixels, "base64") };
    const actual = nativeTerrainObjectMasks(image, entry.direction);
    expect(
      Array.from(actual.occupancy).join(""),
      entry.asset ||
        JSON.stringify([entry.width, entry.height, entry.direction]),
    ).toBe(entry.occupancy);
    expect(
      Array.from(actual.placement).join(""),
      entry.asset || "synthetic",
    ).toBe(entry.placement);
    const fits = [0, 1, 2, 3, 128, "matching"].map((mode) => {
      const width = actual.width + 2,
        height = actual.height + 2;
      const cells = new Uint8Array(width * height);
      if (mode === "matching") {
        for (let y = 0; y < actual.height; y++)
          for (let x = 0; x < actual.width; x++)
            cells[(y + 1) * width + x + 1] =
              actual.placement[y * actual.width + x];
      } else cells.fill(mode);
      return nativeTerrainObjectFits(actual, { width, height, cells }, 1, 1);
    });
    expect(fits, entry.asset || "synthetic").toEqual(entry.fits);
    const width = actual.width + 2,
      height = actual.height + 2;
    const cells = new Uint8Array(width * height);
    for (let y = 0; y < actual.height; y++)
      for (let x = 0; x < actual.width; x++)
        cells[(y + 1) * width + x + 1] = actual.placement[y * actual.width + x];
    const scans = [
      [0, 1, 1],
      [2, 1, 0],
      [1, 0, 3],
      [1, 2, 2],
      [1, 1, 0],
      [-1, 1, 1],
      [width, 1, 0],
      [1, height, 2],
    ].map(([x, y, direction]) =>
      nativeFindTerrainObject(
        actual,
        { width, height, cells },
        x,
        y,
        direction,
      ),
    );
    expect(scans, entry.asset || "synthetic").toEqual(entry.scans);
  }
});
test("ordered terrain definitions preserve their six original fields and source bytes", () => {
  expect(Object.keys(definitions)).toHaveLength(29);
  let count = 0;
  for (const [theme, data] of Object.entries(definitions))
    for (const object of data.objects) {
      count++;
      expect(
        crypto.createHash("sha256").update(object.definition).digest("hex"),
      ).toBe(object.sha256);
      expect(object.fields).toEqual(
        object.definition.trim().split(/\s+/).slice(0, 6).map(Number),
      );
      expect(
        fs.existsSync(
          new URL(
            `public/armageddon/media/level/${theme}/level/${object.name}.img`,
            root,
          ),
        ),
      ).toBe(true);
    }
  expect(count).toBe(457);
});
