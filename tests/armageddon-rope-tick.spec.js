import { test, expect } from '@playwright/test';
import fixture from './fixtures/armageddon/rope-tick.json' with { type: 'json' };
import { nativeRopeBodyTick } from '../src/armageddon/rope-tick.js';

test('constrained body ticks match native gravity, water, retries and damping', { tag: '@logic' }, () => {
  for (const [index, row] of fixture.cases.entries()) {
    const calls = [];
    let terrainCalls = 0, bodyCalls = 0;
    const body = nativeRopeBodyTick(row.body, row.environment, {
      terrain: (x, y) => { calls.push(['terrain', x, y]); return Number(++terrainCalls === row.terrainAt); },
      collide: (x, y) => { calls.push(['collide', x, y]); return ++bodyCalls === row.bodyAt ? 7 : 0; },
      awake: () => { calls.push(['awake']); return row.awake; },
      refresh: () => calls.push(['refresh']),
      waterChanged: () => calls.push(['water']),
      skim: () => calls.push(['skim']),
      bounce: (_, hit) => calls.push(['bounce', hit]),
      earthquake: (_, amount) => calls.push(['earthquake', amount]),
    });
    expect({ body, calls }, `native rope tick ${index}`).toEqual(row.output);
  }
});
