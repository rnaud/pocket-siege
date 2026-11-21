import { test, expect } from "./helpers/shared-page.js";
import fixture from './fixtures/armageddon/rope-contact.json' with { type: 'json' };
import { nativeRopeContact } from '../src/armageddon/rope-contact.js';

test('rope contacts match native rebound, interception, sound and impulse', { tag: '@logic' }, () => {
  for (const [index, row] of fixture.cases.entries()) {
    const calls = [];
    const body = nativeRopeContact(row.body, row.otherType, {
      intercept: (...args) => { calls.push(['intercept', ...args]); return row.accept; },
      stopSound: handle => calls.push(['stopSound', handle]),
      sound: (...args) => { calls.push(['sound', ...args]); return 123; },
    });
    expect({ body, calls }, `native rope contact ${index}`).toEqual(row.output);
  }
});
