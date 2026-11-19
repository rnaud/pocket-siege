import { nativeSkipTurnSpeech, nativeNearbyReactionTeam, nativeDamageRevealReaction, nativeDamageReactionEvent, nativeReactionWeaponUse, nativeDamageReactionVoice } from "../src/armageddon/damage-reactions.js";
import { nextLogicRandom } from "../src/armageddon/numeric.js";
import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/damage-accounting.json" with { type: "json" };
import { nativeRecordDamageReaction, nativeRecordMatchDamage, nativeDamageAccounting, nativeHealthDisplayTick, nativeHealthDisplayReveal } from "../src/armageddon/damage-accounting.js";
test("health, cumulative/displayed damage and events match original damage routine", { tag: "@logic" }, () => {
  for (const row of fixture.skipCases)
    expect(nativeSkipTurnSpeech(row.active, row.used, () => row.nearby)).toEqual(row.speech);
  for (const row of fixture.nearbyCases)
    expect(nativeNearbyReactionTeam(row.actors, row.excluded, row.x, row.y)).toBe(row.result);
  for (const row of fixture.reactionEvents) {
    const state = { ...row.input };
    nativeDamageReactionEvent(state, row.source, row.event, row.value);
    expect(state).toEqual(row.result);
  }
  for (const row of fixture.weaponUse) {
    const state = { ...row.input };
    nativeReactionWeaponUse(state, row.flag);
    expect(state).toEqual(row.result);
  }
  for (const [rows, select] of [[fixture.voices, nativeDamageReactionVoice], [fixture.revealVoices, nativeDamageRevealReaction]])
  for (const row of rows) {
    let random = row.seed;
    expect(select(row.input, {
      sourceTeam: row.source, sourceWorm: 1, turnTeam: row.turn, usedWeapon: row.used,
      teamAlive: () => row.alive, nearbyTeam: () => row.nearby,
      nextRandom: () => (random = nextLogicRandom(random, row.frame)),
    })).toEqual(row.result);
    expect(random).toBe(row.random);
  }
  for (const row of fixture.statistics) {
    const match = { ...row.match }, roster = structuredClone(row.roster);
    nativeRecordMatchDamage(match, roster[0], row.source === null ? null : roster[row.source], row.damage);
    expect({ match, roster }).toEqual(row.result);
    const reaction = { ...row.reactionBefore };
    nativeRecordDamageReaction(reaction, roster[0], row.source === null ? null : roster[row.source], row.damage);
    expect(reaction).toEqual(row.reactionAfter);
  }
  expect(fixture.cases).toHaveLength(288);
  for (const row of fixture.presentation)
    expect(nativeHealthDisplayTick(row.input, row.hp)).toEqual(row.result);
  for (const row of fixture.reveals)
    expect(nativeHealthDisplayReveal(row.input, row.hp)).toEqual(row.result);
  for (const row of fixture.cases) {
    expect(
      nativeDamageAccounting(
        {
          hp: row.hp,
          total: 7,
          displayed: 9,
          reset: 12,
          resetActive: 1,
          team: 2,
          worm: 3,
          state: row.state,
        },
        row.damage,
        row,
      ),
    ).toEqual(row.result);
  }
});

test("live native damage totals reveal after settlement and lethal accounting stays capped", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  // Damage reveal waits for all tasks, including the unrelated initial supply drop.
  await page.evaluate(() => {
    window.siege.debug.setCrateKind("grenade");
    window.siege.debug.collectCrate();
  });
  await page.evaluate(() => window.siege.debug.stageMeleeTargets());
  await page.evaluate(() => {
    window.siege.debug.hit(0, 6);
    window.siege.debug.hit(0, 4);
  });
  const labels = page.locator('.native-damage-number:visible');
  // Read one frame atomically: the native totals expire after 72 simulation ticks.
  await expect.poll(() => labels.evaluateAll(canvases => canvases.map(c => ({
    label: c.getAttribute('aria-label'),
    painted: c.width > 0,
    animation: getComputedStyle(c).animationName,
  })))).toEqual(Array.from({ length: 3 }, () => ({
    label: '10 damage', painted: true, animation: 'none',
  })));
  await expect(labels).toHaveCount(0);
  const result = await page.evaluate(() => {
    const initial = window.siege.getState();
    const before = initial.worms.slice(3).map(w => w.hp);
    window.siege.debug.hit(1, 200);
    const after = window.siege.getState();
    return {before, hp: after.worms.slice(3).map(w => w.hp),
      damageTaken: after.worms.slice(3).map(w => w.damageTaken),
      statisticsBefore: initial.matchStatistics, statistics: after.matchStatistics,
      reactionBefore: initial.damageReaction, reaction: after.damageReaction,
      attackerBefore: initial.worms[0].matchStats, attacker: after.worms[0].matchStats,
      victims: after.worms.slice(3).map(w => w.matchStats)};
  });
  expect(result.hp).toEqual([0, 0, 0]);
  expect(result.damageTaken).toEqual(result.before);
  const damage = result.before.reduce((sum, hp) => sum + hp, 0);
  expect(result.statistics.damage - result.statisticsBefore.damage).toBe(damage);
  expect(result.statistics.deaths - result.statisticsBefore.deaths).toBe(3);
  expect(result.reaction.damage - result.reactionBefore.damage).toBe(damage);
  expect(result.reaction.kills - result.reactionBefore.kills).toBe(3);
  expect(result.reaction.maxVictimTeam).toBe(2);
  expect(result.reaction.selfTeam).toBe(0);
  expect(result.reaction.friendlyTeam).toBe(0);
  expect(result.reactionBefore.firstBlood).toBe(1);
  expect(result.attacker.enemyDamage - result.attackerBefore.enemyDamage).toBe(damage);
  expect(result.attacker.enemyKills - result.attackerBefore.enemyKills).toBe(3);
  expect(result.attacker.turnKills - result.attackerBefore.turnKills).toBe(3);
  expect(result.victims.map(w => [w.lastAttackerTeam, w.lastAttackerWorm])).toEqual([[1, 1], [1, 1], [1, 1]]);
});
