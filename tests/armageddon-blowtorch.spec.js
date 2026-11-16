import { test, expect } from '@playwright/test';
import fixture from './fixtures/armageddon/blowtorch.json' with { type: 'json' };
import { nativeBlowtorchEntry } from '../src/armageddon/blowtorch.js';

test('blowtorch entry matches native snapping, counters, animation and duration', { tag: '@logic' }, () => {
  for (const row of fixture.cases)
    expect(nativeBlowtorchEntry(row.body, row.record, row.stats, row.accepted)).toEqual(row.output);
});

import ticks from './fixtures/armageddon/blowtorch-tick.json' with { type: 'json' };
import { nativeBlowtorchTick } from '../src/armageddon/blowtorch.js';
test('blowtorch ticks match native movement, masks, damage and collision exits', { tag: '@logic' }, () => {
  for (const row of ticks.cases) {
    let cursor = 0;
    const result = nativeBlowtorchTick(row.body, row.record, row.slope,
      () => row.pattern[cursor++ % row.pattern.length]);
    expect(result).toEqual(row.output);
    expect(cursor).toBe(row.attemptCount);
  }
});
