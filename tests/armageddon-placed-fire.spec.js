import { test, expect } from "./helpers/shared-page.js";
import fixture from './fixtures/armageddon/placed-fire.json' with { type: 'json' };
import { nativePlacedFire } from '../src/armageddon/placed-fire.js';

test('placed fire matches native power, launch ordering and repeat scheduling', { tag: '@logic' }, () => {
  const actual = fixture.cases.map(row => nativePlacedFire(row.body, row.record, {
    launchSetup: () => row.vector,
    launch(body, record) {
      for (const [key, value] of Object.entries(row.changes)) {
        if (key.startsWith('0x')) record[key] = value;
        else body[key] = value;
      }
    },
  }));
  expect(actual).toEqual(fixture.cases.map(row => row.output));
});
