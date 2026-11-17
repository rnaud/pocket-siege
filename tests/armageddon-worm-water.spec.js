import { test, expect } from '@playwright/test';
import fixture from './fixtures/armageddon/worm-water.json' with { type: 'json' };
import { nativeWormSkim } from '../src/armageddon/worm-water.js';

test('worm skim sound, state entry and world flag match the original callback', { tag: '@logic' }, () => {
  expect(fixture.cases.map(row => nativeWormSkim(row.body))).toEqual(fixture.cases.map(row => row.output));
});
