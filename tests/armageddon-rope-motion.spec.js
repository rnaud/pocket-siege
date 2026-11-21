import { test, expect } from "./helpers/shared-page.js";
import fixture from './fixtures/armageddon/rope-motion.json' with { type: 'json' };
import { nativeRopeMotion } from '../src/armageddon/rope-motion.js';

test('rope movement matches native pivots, wrapping, collision sweeps and remaining time', { tag: '@logic' }, () => {
  const actual = fixture.cases.map(row => {
    let terrainCalls = 0, bodyCalls = 0;
    return nativeRopeMotion(row.body, row.remaining, {
      terrain: () => Number(++terrainCalls === row.terrainAt),
      collide: () => ++bodyCalls === row.bodyAt ? 7 : 0,
    });
  });
  expect(actual).toEqual(fixture.cases.map(row => row.output));
});
