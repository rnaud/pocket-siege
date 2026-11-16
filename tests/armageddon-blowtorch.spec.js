import { test, expect } from '@playwright/test';
import fixture from './fixtures/armageddon/blowtorch.json' with { type: 'json' };
import { nativeBlowtorchEntry } from '../src/armageddon/blowtorch.js';

test('blowtorch entry matches native snapping, counters, animation and duration', { tag: '@logic' }, () => {
  for (const row of fixture.cases)
    expect(nativeBlowtorchEntry(row.body, row.record, row.stats, row.accepted)).toEqual(row.output);
});
