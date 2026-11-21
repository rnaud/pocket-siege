import { test, expect } from "./helpers/shared-page.js";
import fixture from './fixtures/armageddon/rope-constraint.json' with { type: 'json' };
import { nativeRopeConstraint } from '../src/armageddon/rope-constraint.js';

test('rope constraints match native placement, retry, length limits and segment initialization', { tag: '@logic' }, () => {
  expect(fixture.cases.map(row => {
    let attempts = 0;
    const output = nativeRopeConstraint(row.body, ...row.anchor,
      () => row.pattern[attempts++ % row.pattern.length]);
    return { output, attempts };
  })).toEqual(fixture.cases.map(({ output, attempts }) => ({ output, attempts })));
});
