import { test, expect } from '@playwright/test';
import fixture from './fixtures/armageddon/worm-water.json' with { type: 'json' };
import { nativeWormSkim, nativeWormDrowningState, nativeWormBubbles } from '../src/armageddon/worm-water.js';

test('worm skim sound, state entry and world flag match the original callback', { tag: '@logic' }, () => {
  expect(fixture.cases.map(row => nativeWormSkim(row.body))).toEqual(fixture.cases.map(row => row.output));
  expect(fixture.drowning.map(row => nativeWormDrowningState(row.body))).toEqual(fixture.drowning.map(row => row.target));
  for (const row of fixture.bubbles) {
    let reads = 0;
    expect(nativeWormBubbles(row.body, row.frame, () => { reads++; return row.random; })).toEqual(row.output);
    expect(reads).toBe(row.randomReads);
  }
});
