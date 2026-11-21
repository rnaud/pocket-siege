import { test, expect } from "./helpers/shared-page.js";
import fixture from './fixtures/armageddon/fire-input.json' with { type: 'json' };
import { nativeFireInput } from '../src/armageddon/fire-input.js';

test('Fire input matches native state routing, charge selection and rope re-fire', { tag: '@logic' }, () => {
  expect(fixture.cases.map(row => nativeFireInput(row.body, row.record, {
    blocked: () => row.options.blocked,
    random: () => row.options.random,
    voice: () => 321,
    weaponRecord: () => ({ '0x70': row.options.rope }),
    continueAction: body => { if (row.options.clearRope) body.ropeActive = 0; },
    traversalFire: () => row.options.delegate,
    immediateFire: () => row.options.delegate,
  }))).toEqual(fixture.cases.map(row => row.output));
});
