import { test, expect } from "./helpers/shared-page.js";
import fixture from './fixtures/armageddon/rope-input.json' with { type: 'json' };
import { nativeRopeInput } from '../src/armageddon/rope-input.js';

test('rope input matches native impulses, resize requests and key precedence', { tag: '@logic' }, () => {
  expect(fixture.cases.map(row => nativeRopeInput(row.body)))
    .toEqual(fixture.cases.map(row => row.output));
});
