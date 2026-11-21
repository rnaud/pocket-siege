import { test, expect } from "./helpers/shared-page.js";
import fixture from './fixtures/armageddon/utility-fire.json' with { type: 'json' };
import { nativeUtilityFire } from '../src/armageddon/utility-fire.js';

test('utility fire matches native voices, animation, counters and finish gates', { tag: '@logic' }, () => {
  expect(fixture.cases.map(row => nativeUtilityFire(row.body, row.record, {
    voice: () => row.voice,
    launchSetup: () => row.vector,
    launch: body => Object.assign(body, row.changes),
  }))).toEqual(fixture.cases.map(row => row.output));
});
