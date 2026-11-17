import { test, expect } from '@playwright/test';
import fixture from './fixtures/armageddon/rope-length.json' with { type: 'json' };
import { nativeRopeLength } from '../src/armageddon/rope-length.js';

test('rope resizing matches native segment traversal, collision rejection and velocity scaling', { tag: '@logic' }, () => {
  expect(fixture.cases.map(row => nativeRopeLength(row.body, row.length, () => row.accepted)))
    .toEqual(fixture.cases.map(row => row.output));
});
