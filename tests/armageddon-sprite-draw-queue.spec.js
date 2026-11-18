import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/sprite-draw-queue-primitives.json" with { type: "json" };
import { NativeSpriteDrawQueue } from "../src/armageddon/sprite-draw-queue.js";

const rendererNames = {
  0x30: "point",
  0x34: "dataList",
  0x38: "polygon",
  0x3c: "polyline",
  0x40: "screenSprite",
  0x44: "line",
  0x48: "sprite",
  0x4c: "image",
  0x50: "imageTwin",
};

function insert(queue, request) {
  const { kind, args, points } = request;
  if (kind === 0) return queue.line(...args);
  if (kind === 1) return queue.imageRaw(...args);
  if (kind === 2) return queue.image(...args);
  if (kind === 3) return queue.spriteRaw(...args);
  if (kind === 4)
    return request.flagged ? queue.spriteTwin(...args) : queue.draw(...args);
  if (kind === 6) return queue.polyline(args[0], points, args[1]);
  if (kind === 7) return queue.polygon(args[0], points, args[1], args[2]);
  if (kind === 8) return queue.screenSprite(...args);
  if (kind === 9) return queue.screenPoint(...args);
  if (kind === 10) return queue.imageTwin(...args);
  throw new Error(`Unknown primitive ${kind}`);
}

test(
  "native draw queue primitive records and projection match original x86",
  { tag: "@logic" },
  () => {
    for (const c of fixture.cases) {
      const queue = new NativeSpriteDrawQueue(c.remaining);
      for (const request of c.requests) insert(queue, request);
      const calls = [];
      const host = Object.fromEntries(
        Object.values(rendererNames).map((name) => [
          name,
          (...args) => calls.push([name, ...args]),
        ]),
      );
      queue.flushAll(c.view, host);
      expect(queue.records).toEqual(c.records);
      expect(queue.available).toBe(c.available);
      expect(calls).toEqual(
        c.draws.map(([offset, ...args]) => [rendererNames[offset], ...args]),
      );
    }
  },
);
