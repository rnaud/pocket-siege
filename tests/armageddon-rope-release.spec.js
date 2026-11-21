import { test, expect } from "./helpers/shared-page.js";
import fixture from './fixtures/armageddon/rope-release.json' with { type: 'json' };
import { nativeRopeRelease } from '../src/armageddon/rope-release.js';

test('rope release matches native state-entry order and saved-angle clamp', { tag: '@logic' }, () => {
  const actual = fixture.cases.map(row => {
    const calls = [];
    const body = nativeRopeRelease(row.body, row.body.angle, row.schemeByte, (body, state) => {
      calls.push(['state', state]); body.state = state; body.angle = 12345;
    });
    return { body, calls };
  });
  expect(actual).toEqual(fixture.cases.map(row => row.output));
});
