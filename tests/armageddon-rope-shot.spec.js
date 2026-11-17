import { test, expect } from '@playwright/test';
import fixture from './fixtures/armageddon/rope-shot.json' with { type: 'json' };
import { nativeRopeShotTick } from '../src/armageddon/rope-shot.js';

test('rope shot matches native extension, attachment attempts and action events', { tag: '@logic' }, () => {
  const results = fixture.cases.map(row => {
    let attempts = 0, attachments = 0;
    const output = nativeRopeShotTick(row.body, {
      ray: () => row.options.distance,
      tryPosition: () => row.options.positions[attempts++ % row.options.positions.length],
      attach: () => ++attachments === row.options.attachAt,
      state: body => { if (row.options.activateOnState) body.ropeActive = 1; },
    });
    return { output, attempts, attachments };
  });
  expect(results).toEqual(fixture.cases.map(({ output, attempts, attachments }) => ({ output, attempts, attachments })));
});
