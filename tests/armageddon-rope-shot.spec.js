import { createNativeRopeShot, refireNativeRope } from "../src/armageddon/rope-runtime.js";
import { test, expect } from "./helpers/shared-page.js";
import fixture from './fixtures/armageddon/rope-shot.json' with { type: 'json' };
import { nativeRopeShotTick } from '../src/armageddon/rope-shot.js';

test('rope shot matches native extension, attachment attempts and action events', { tag: '@logic' }, () => {
  const sounds = [];
  const body = createNativeRopeShot({ x: 300, y: 200, team: 0 }, 60, 696, request => sounds.push(request));
  expect(body.ropeFiring).toBe(1);
  expect(sounds).toEqual([[86, 3, 65536, 65536, 0]]);
  sounds.length = 0;
  const airborne = { ...body, state: 0x73, ropeActive: 1, ropeFiring: 0, ropeRemaining: 2 };
  expect(refireNativeRope(airborne, request => sounds.push(request)).ropeFiring).toBe(1);
  expect(sounds).toEqual([[86, 3, 65536, 65536, 0]]);
  sounds.length = 0;
  expect(refireNativeRope({ ...airborne, ropeRemaining: 0 }, request => sounds.push(request)).ropeFiring).toBe(0);
  expect(sounds).toEqual([]);
  const results = fixture.cases.map(row => {
    let attempts = 0, attachments = 0;
    const output = nativeRopeShotTick(row.body, {
      ray: () => row.options.distance,
      tryPosition: () => row.options.positions[attempts++ % row.options.positions.length],
      attach: () => ++attachments === row.options.attachAt,
      state: body => { if (row.options.activateOnState) body.ropeActive = 1; },
    });
    return { output, attempts, attachments };
  });
  expect(results).toEqual(fixture.cases.map(({ output, attempts, attachments }) => ({ output, attempts, attachments })));
});
