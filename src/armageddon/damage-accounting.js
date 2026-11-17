import { fixedMultiply } from './numeric.js';

// 004DCEF0. Health presentation is independent of actual damage accounting.
export function nativeHealthDisplayTick(input, hp) {
  const body = { ...input }, calls = [];
  if (body.active) {
    calls.push({ operation: 'busy' });
    body.progress = (body.progress + 0x395) | 0;
    if (body.progress >= 0x10000) body.progress = body.active = 0;
  } else if ((body.value >> 16) < hp) body.target = hp << 16;
  if (body.target !== body.value) {
    body.value = (fixedMultiply(body.value, 0xe666) + fixedMultiply(body.target, 0x1999)) | 0;
    const difference = (body.target - body.value) | 0;
    const sign = difference >> 31;
    if ((((difference ^ sign) - sign) | 0) < 0x10000) body.value = body.target;
    calls.push({ operation: 'healthText', value: Math.max(0, Math.min(9999, body.value >> 16)) });
  }
  return { body, calls };
}

// Event0x42c prefix004DAFB9..004DB035, before render-order changes.
export function nativeHealthDisplayReveal(input, hp) {
  if (!input.pending) return { body: { ...input }, calls: [] };
  return {
    body: { ...input, target: hp << 16, progress: 0, active: 1, pending: 0 },
    calls: [{ operation: 'damageText', value: input.pending }, { operation: 'clearDamageTotal' }],
  };
}

// 004D8440. Team health and cumulative damage are supplied by the host store;
// displayed is worm+0x188, reset is +0x180, resetActive is +0x184.
export function nativeDamageAccounting(body, damage, options = {}) {
  const {
    multiplier = 1,
    immune = false,
    force = false,
    uncapped = false,
  } = options;
  const next = {
    hp: body.hp,
    total: body.total,
    displayed: body.displayed,
    reset: body.reset,
    events: [],
  };
  if (immune && !force) return next;
  const amount = Math.imul(damage, multiplier);
  if (uncapped) next.displayed = (next.displayed + amount) | 0;
  if (amount > 0 && next.hp > 0) {
    const hp = Math.max(0, (next.hp - amount) | 0);
    const actual = (next.hp - hp) | 0;
    if (!uncapped) next.displayed = (next.displayed + actual) | 0;
    next.total = (next.total + actual) | 0;
    next.hp = hp;
    if (body.resetActive) next.reset = 0;
    if (actual)
      next.events.push([
        body.team,
        body.worm,
        actual,
        body.state !== 0x6d ? 1 : 0,
      ]);
  }
  return next;
}

export function createNativeWormMatchStats(team, worm, alliance = team, hp = 100) {
  return { team, worm, alliance, hp, shots: 0, misses: 0, maxShotKills: 0, maxShotDamage: 0, damageReceived: 0, allyDamage: 0, allyKills: 0,
    enemyDamage: 0, enemyKills: 0, turnKills: 0, lastAttackerTeam: 0, lastAttackerWorm: 0 };
}

// 004C2A00. The event0x430 receiver checks source presence and reportability
// before calling this routine. Victim HP is the already-updated native health.
// Source and victim may be the same object (self damage).
export function nativeRecordMatchDamage(match, victim, source, damage) {
  match.damage = (match.damage + damage) | 0;
  victim.damageReceived = (victim.damageReceived + damage) | 0;
  if (victim.hp === 0) match.deaths = (match.deaths + 1) | 0;
  if (!source?.team || !source.worm) return;
  if (victim.alliance === source.alliance) {
    source.allyDamage = (source.allyDamage + damage) | 0;
    if (victim.hp === 0) source.allyKills = (source.allyKills + 1) | 0;
  } else {
    victim.lastAttackerTeam = source.team;
    victim.lastAttackerWorm = source.worm;
    source.enemyDamage = (source.enemyDamage + damage) | 0;
    if (victim.hp === 0) {
      source.enemyKills = (source.enemyKills + 1) | 0;
      source.turnKills = (source.turnKills + 1) | 0;
    }
  }
}

export function createNativeDamageReaction() {
  return { firstBlood: 0, shot: 0, perfectTeam: 0, amazingTeam: 0, excellentTeam: 0, brilliantTeam: 0, fatality: 0,
    kills: 0, damage: 0, revengeTeam: 0, friendlyTeam: 0, selfTeam: 0,
    maxDamage: 0, maxVictimTeam: 0 };
}

// 004B42B0 runs after004C2A00 for the same reportable damage event.
export function nativeRecordDamageReaction(state, victim, source, damage) {
  if (!source?.team || !source.worm) return;
  if (state.maxVictimTeam === 0 || state.maxDamage < damage) {
    state.maxDamage = damage;
    state.maxVictimTeam = victim.team;
  }
  if (victim.team === source.lastAttackerTeam && victim.worm === source.lastAttackerWorm)
    state.revengeTeam = source.team;
  if (victim.alliance === source.alliance) {
    if (victim.team === source.team && victim.worm === source.worm) state.selfTeam = source.team;
    else state.friendlyTeam = source.team;
  }
  state.damage = (state.damage + damage) | 0;
  if (victim.hp === 0) state.kills = (state.kills + 1) | 0;
}
