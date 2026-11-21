import { test, expect } from "./helpers/shared-page.js";
import fixture from './fixtures/armageddon/traversal-fire.json' with { type: 'json' };
import { nativeTraversalFire } from '../src/armageddon/traversal-fire.js';

test('traversal firing matches native routing, rope limits and subtype12 launch', { tag: '@logic' }, () => {
  expect(fixture.cases.map(row => nativeTraversalFire(row.body, row.record, {
    placed: () => row.options.delegate,
    utility: () => row.options.delegate,
    weaponRecord: () => ({ '0x70': row.options.rope }),
    continueAction: body => { if (row.options.activateRope) body.ropeActive = 1; },
    launchSetup: () => row.options.vector,
  }))).toEqual(fixture.cases.map(row => row.output));
});
