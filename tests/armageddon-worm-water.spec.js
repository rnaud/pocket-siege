import { test, expect } from '@playwright/test';
import fixture from './fixtures/armageddon/worm-water.json' with { type: 'json' };
import { nativeWormSkim, nativeWormDrowningState } from '../src/armageddon/worm-water.js';

test('worm skim sound, state entry and world flag match the original callback', { tag: '@logic' }, () => {
  expect(fixture.cases.map(row => nativeWormSkim(row.body))).toEqual(fixture.cases.map(row => row.output));
  expect(fixture.drowning.map(row => nativeWormDrowningState(row.body))).toEqual(fixture.drowning.map(row => row.target));
});
