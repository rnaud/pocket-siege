import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/longbow.json" with { type: "json" };
import {
  nativeArrowCreate, nativeArrowCheck, nativeArrowHit, nativeArrowStick,
  nativeArrowFrame, nativeArrowDraw, nativeArrowWaterSound, nativeArrowContact,
} from "../src/armageddon/longbow.js";

const TARGETS = { landscape: 1, shooter: 2, worm: 2, barrel: 0x11, mine: 0x14 };
const FIELDS = ["flags", "shape", "enabled", "field4c", "state", "suspended", "mass", "windScale",
  "gravityScale", "field78", "field7c", "x", "y", "vx", "vy", "surface", "sleeping", "submerged",
  "slot", "damage", "bubbles", "angle", "splashed", "sunk", "offMap", "stuck"];
const zero = () => ({ ...Object.fromEntries(FIELDS.map((k) => [k, 0])), packet: Array(11).fill(0) });
const bodyOf = (input) => {
  const body = zero();
  for (const k of [...FIELDS, "packet"]) if (k in input) body[k] = Array.isArray(input[k]) ? [...input[k]] : input[k];
  return body;
};
// Records interface calls in the oracle's format; world answers come from the capture.
function recorder(world = {}) {
  const calls = [], randoms = [0x12345678, 0x9abcdef0, 0x0fedcba9, 0x55555555, 0xaaaaaaaa];
  const answer = (table = [], shape, flags) =>
    table.find(([s, f]) => (s === null || s === shape) && f === flags)?.[2] ?? 0;
  const io = {
    base: (category, shape) => calls.push({ operation: "base", category, shape }),
    task: (value) => calls.push({ operation: "task", value }),
    notify: (category, value, event, size, data) => calls.push({ operation: "notify", category, value, event, size, data }),
    place: (x, y, flags) => (calls.push({ operation: "place", x, y, flags }), world.place ?? 0),
    probe: (shape, x, y, flags) => (calls.push({ operation: "probe", shape, x, y, flags }), answer(world.probeTable, shape, flags)),
    query: (shape, flags) => (calls.push({ operation: "query", shape, flags }), answer(world.queryTable, shape, flags)),
    reshape: (shape) => (calls.push({ operation: "reshape", shape }), world.reshape ?? 1),
    owner: (category, id) => (calls.push({ operation: "owner", category, id }), world.owner ?? "shooter"),
    category: (target) => (calls.push({ operation: "category", target }), TARGETS[target]),
    hit: (target, event, size, packet) => calls.push({ operation: "hit", target, sender: "arrow", event, size, packet }),
    dirt: (...request) => calls.push({ operation: "dirt", request }),
    sound: (request) => calls.push({ operation: "sound", request }),
    random: () => (calls.push({ operation: "random" }), randoms.shift()),
    bubble: (request) => calls.push({ operation: "bubble", request }),
    camera: (request) => calls.push({ operation: "camera", request }),
    busy: () => calls.push({ operation: "busy" }),
    size: (index) => (calls.push({ operation: "size", index }), world.image ?? [60, 60]),
    stamp: (request) => calls.push({ operation: "stamp", request }),
    draw: (request) => calls.push({ operation: "draw", request }),
    waterSprite: (sprite) => (calls.push({ operation: "waterSprite", sprite }), world.waterSprite ?? 0x1282),
    event: (event) => calls.push({ operation: "event", event }),
    remove: (value) => calls.push({ operation: "delete", value }),
  };
  return { io, calls };
}

test("arrow construction matches the original 00502E70", { tag: "@logic" }, () => {
  expect(fixture.creates).toHaveLength(576);
  for (const { input, body, calls, result } of fixture.creates) {
    const host = recorder(input.world);
    const created = nativeArrowCreate(zero(), input.packet, input.damage, body.slot, host.io);
    expect(host.calls).toEqual(calls);
    expect(created.body).toEqual(body);
    expect(created.removed).toBe(calls.at(-1).operation === "delete");
    expect(result).toBe(0x2000000);
  }
});

test("arrow checks match the original 00503130 and 00503230", { tag: "@logic" }, () => {
  expect(fixture.checks).toHaveLength(720);
  for (const { routine, input, body, calls, result } of fixture.checks) {
    const host = recorder(input.world);
    const state = bodyOf(input);
    expect(nativeArrowCheck(state, host.io, routine === "00503130")).toBe(result);
    expect(host.calls).toEqual(calls);
    expect(state).toEqual(body);
  }
});

test("arrow hits and sticking match the original 005035D0 and 005034A0", { tag: "@logic" }, () => {
  expect(fixture.hits).toHaveLength(264);
  for (const { input, body, calls } of fixture.hits) {
    const host = recorder();
    expect(nativeArrowHit(bodyOf(input), input.target, host.io)).toEqual(body);
    expect(host.calls).toEqual(calls);
  }
  expect(fixture.sticks).toHaveLength(324);
  for (const { input, body, calls } of fixture.sticks) {
    const host = recorder(input.world);
    expect(nativeArrowStick(bodyOf(input), host.io)).toEqual(body);
    expect(host.calls).toEqual(calls);
  }
  for (const { input, body, calls } of fixture.contacts) {
    const host = recorder();
    expect(nativeArrowContact(bodyOf(input), input.target, host.io)).toEqual(body);
    expect(host.calls).toEqual(calls);
  }
});

test("arrow frames, draws and water sounds match the original 00503840", { tag: "@logic" }, () => {
  expect(fixture.frames).toHaveLength(514);
  for (const { input, body, calls } of fixture.frames) {
    const host = recorder(input.world);
    const frame = nativeArrowFrame(bodyOf(input), input.scene, host.io);
    expect(host.calls).toEqual(calls);
    expect(frame.body).toEqual(body);
    expect(frame.removed).toBe(calls.at(-1).operation === "delete");
  }
  for (const { input, calls } of fixture.draws) {
    const host = recorder({ waterSprite: input.waterSprite });
    nativeArrowDraw(bodyOf(input), input.layers[input.slot], host.io);
    expect(host.calls).toEqual(calls);
  }
  for (const { input, calls } of fixture.waters)
    expect([{ operation: "sound", request: nativeArrowWaterSound(input) }]).toEqual(calls);
});
