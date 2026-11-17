import { test, expect } from '@playwright/test';
import fixture from './fixtures/armageddon/immediate-fire.json' with { type: 'json' };
import { nativeImmediateFire } from '../src/armageddon/immediate-fire.js';

test('immediate fire matches native gates, dispatch, rechecks and airstrike state', { tag: '@logic' }, () => {
  const actual = fixture.cases.map(row => nativeImmediateFire(row.body, row.record, {
    beginAction(body, record) {
      for (const [key, value] of Object.entries(row.changes)) {
        if (key === 'actionType') record['0x68'] = value;
        else body[key] = value;
      }
    },
    projectile: () => row.result,
    placed: () => row.result,
    utility: () => row.result,
    launchSetup: () => row.vector,
  }));
  expect(actual).toEqual(fixture.cases.map(row => row.output));
});
