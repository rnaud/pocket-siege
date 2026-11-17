import { test, expect } from '@playwright/test';
import fixture from './fixtures/armageddon/rope-length.json' with { type: 'json' };
import { nativeRopeLength } from '../src/armageddon/rope-length.js';
import bungee from './fixtures/armageddon/bungee-auto.json' with { type: 'json' };
import attachment from './fixtures/armageddon/bungee-attach.json' with { type: 'json' };
import spring from './fixtures/armageddon/bungee-tick.json' with { type: 'json' };
import { nativeAutoBungee, nativeAttachBungee, nativeBungeeTick } from '../src/armageddon/bungee.js';

test('rope resizing matches native segment traversal, collision rejection and velocity scaling', { tag: '@logic' }, () => {
  expect(fixture.cases.map(row => nativeRopeLength(row.body, row.length, () => row.accepted)))
    .toEqual(fixture.cases.map(row => row.output));
  for (const row of bungee.cases) {
    let attempts = 0;
    const output = nativeAutoBungee(row.body, row.weapon, row.height, {
      tryPosition: body => {
        const accepted = body.type === 2 || attempts < row.clearSteps;
        attempts++;
        return accepted;
      },
    });
    expect(output).toEqual(row.output);
  }
  for (const row of attachment.cases) {
    expect(nativeAttachBungee(row.body, {
      tryPosition: () => row.accepted,
      constrain: () => row.attached,
      voice: () => 777,
      launchSetup: () => [101, -202, 303, -404],
    })).toEqual(row.output);
  }
  for (const row of spring.cases)
    expect(nativeBungeeTick(row.body, { resize: () => row.accepted })).toEqual(row.output);
});
