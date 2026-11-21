import { test, expect } from "./helpers/shared-page.js";
import fixture from './fixtures/armageddon/moving-fire.json' with { type: 'json' };
import { nativeMovingFire } from '../src/armageddon/moving-fire.js';

test('moving release matches native normalization, low-speed direction and offsets', { tag: '@logic' }, () => {
  expect(fixture.cases.map(row => nativeMovingFire(row.body, row.record)))
    .toEqual(fixture.cases.map(row => row.output));
});
