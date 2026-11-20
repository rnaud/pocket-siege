// Expedition: a run of generated islands fought by one persistent squad.
// Pure rules only — every function returns a new run and everything is
// derived from the run seed, so a seed (or the daily key) reproduces the
// same route and the same supply offers for everyone.
export const EXPEDITION_KEY = "pocket-siege-expedition-v1";
export const EXPEDITION_BEST_KEY = "pocket-siege-expedition-best-v1";
export const EXPEDITION_LENGTH = 8;
export const SQUAD_NAMES = ["Sprout", "Moss", "Pickle"];
const BOSS_STAGES = new Set([3, 7]);
const CAMP_HEAL = 15;
const MAX_STRIPES = 3;
const STRIPE_HEALTH = 10;

const LAYOUTS = ["fern", "highlands", "archipelago", "forts", "caverns", "bridges"];
const THEMES = [
  "forest", "desert", "snow", "jungle", "pirate", "medieval", "hell", "space",
  "cheese", "tribal", "urban", "dungeon", "fruit", "tools", "time", "music",
];
const NAME_FIRST = [
  "Cinder", "Gull", "Bramble", "Salt", "Ember", "Thistle", "Hollow", "Marrow",
  "Lantern", "Rust", "Kelp", "Quill", "Gravel", "Tallow", "Wren", "Pepper",
];
const NAME_LAST = [
  "Reach", "Shoals", "Rock", "Hook", "Steps", "Teeth", "Anvil", "Crown",
  "Narrows", "Hollow", "Spit", "Ledge", "Cradle", "Bight", "Stack", "Maw",
];
const SKILLS = ["rookie", "regular", "veteran"];

export const MUTATORS = {
  thinAir: { label: "Thin air", text: "Gravity is nearly halved", gravityScale: 0.55 },
  volatile: { label: "Volatile ground", text: "Every blast is a third larger", blastScale: 1.35 },
  shortFuse: { label: "Short fuse", text: "30-second turns", turnTime: 30 },
  storm: { label: "Storm front", text: "Storm winds", weather: "storm" },
  dugIn: { label: "Dug in", text: "Enemy worms +30 health", enemyHp: 30 },
  drilled: { label: "Drilled", text: "Enemy skill up one step", skill: 1 },
  supplied: { label: "Well supplied", text: "Enemy carries extra specials", enemyAmmo: { cluster: 2, banana: 1, homing: 1, airstrike: 1 } },
};

// Supplies are permanent: weapon and kit rewards are re-issued on every
// island, so a run builds an arsenal instead of hoarding single shots.
export const REWARDS = {
  mortars: { label: "Mortar rack", text: "+2 mortars every island", weapons: { mortar: 2 }, weight: 4 },
  sticky: { label: "Tar bombs", text: "+2 sticky bombs every island", weapons: { sticky: 2 }, weight: 4 },
  mines: { label: "Sapper's bag", text: "+2 mines every island", weapons: { mine: 2 }, weight: 3 },
  longbow: { label: "Archers", text: "+2 longbow shots every island", weapons: { longbow: 2 }, weight: 3 },
  sheep: { label: "Flock", text: "+1 sheep every island", weapons: { sheep: 1 }, weight: 3 },
  cluster: { label: "Cluster crate", text: "+1 cluster bomb every island", weapons: { cluster: 1 }, weight: 4 },
  dynamite: { label: "Demolition kit", text: "+1 dynamite every island", weapons: { dynamite: 1 }, weight: 4 },
  bat: { label: "Slugger", text: "+1 bat every island", weapons: { bat: 1 }, weight: 3 },
  homing: { label: "Seeker", text: "+1 homing missile every island", weapons: { homing: 1 }, weight: 3 },
  banana: { label: "Ripe cargo", text: "+1 banana bomb every island", weapons: { banana: 1 }, weight: 2, from: 2 },
  airstrike: { label: "Air cover", text: "+1 air strike every island", weapons: { airstrike: 1 }, weight: 2, from: 2 },
  napalm: { label: "Fire barrels", text: "+1 petrol bomb every island", weapons: { napalm: 1 }, weight: 3, from: 1 },
  minigun: { label: "Heavy gun", text: "+1 minigun every island", weapons: { minigun: 1 }, weight: 2, from: 2 },
  supersheep: { label: "Winged flock", text: "+1 super sheep every island", weapons: { supersheep: 1 }, weight: 1, from: 3 },
  holy: { label: "Relic grenade", text: "+1 holy grenade every island", weapons: { holy: 1 }, weight: 1, from: 3 },
  jetpack: { label: "Flight pack", text: "+1 jet pack every island", utilities: { jetpack: 1 }, weight: 3 },
  teleport: { label: "Beacon", text: "+1 teleport every island", utilities: { teleport: 1 }, weight: 3 },
  girders: { label: "Engineers", text: "+2 girders every island", utilities: { girder: 2 }, weight: 3 },
  overcharge: { label: "Overcharge", text: "+1 double damage every island", utilities: { doubledamage: 1 }, weight: 2, from: 1 },
  freeze: { label: "Cold snap", text: "+1 freeze every island", utilities: { freeze: 1 }, weight: 2 },
  medic: { label: "Field medic", text: "Heal every living worm by 45", heal: 45, weight: 5, needsWounded: true },
  revive: { label: "Second wind", text: "Bring a fallen worm back at 60 health", revive: 60, weight: 9, needsFallen: true },
  drill: { label: "Hard training", text: "+25 maximum health for the squad", maxHp: 25, weight: 3 },
  rations: { label: "Good rations", text: "+10 extra healing at every camp", campHeal: 10, weight: 3 },
};

// Small deterministic generator (mulberry32) keyed by run seed and a label.
function mix(seed, label) {
  let hash = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < label.length; i++) {
    hash ^= label.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}
function generator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (random, list) => list[Math.floor(random() * list.length)];
const clone = (value) => JSON.parse(JSON.stringify(value));

export function expeditionDailySeed(date = new Date()) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { key, seed: mix(0x51e6e, `expedition:${key}`) };
}

function islandNode(seed, index, option) {
  const random = generator(mix(seed, `island:${index}:${option}`));
  const boss = BOSS_STAGES.has(index);
  const risky = option === 1;
  const count = Math.min(3, Math.floor(index / 2)) + (boss ? 1 : 0) + (risky ? 1 : 0);
  const pool = Object.keys(MUTATORS);
  const mutators = [];
  while (mutators.length < count && pool.length)
    mutators.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  const layout = pick(random, LAYOUTS), theme = pick(random, THEMES);
  const name = `${pick(random, NAME_FIRST)} ${pick(random, NAME_LAST)}`;
  return { index, option, seed: mix(seed, `map:${index}:${option}`), layout, theme, name, mutators, boss, risky };
}

export function routeOptions(run) {
  return [0, 1].map((option) => islandNode(run.seed, run.index, option));
}

export function newRun(seed, { daily = null } = {}) {
  return {
    version: 1,
    seed: seed >>> 0,
    daily,
    index: 0,
    status: "route",
    squad: SQUAD_NAMES.map((name) => ({ name, hp: 100, maxHp: 100, stripes: 0, alive: true })),
    weapons: {},
    utilities: {},
    campHeal: 0,
    rewards: [],
    current: null,
    picks: 0,
    offers: [],
    score: 0,
  };
}

export function chooseIsland(run, option) {
  if (run.status !== "route") return run;
  const next = clone(run);
  next.current = routeOptions(run)[option === 1 ? 1 : 0];
  next.status = "battle";
  return next;
}

// Everything the match needs to set up the current island.
export function stageConfig(run) {
  const node = run.current;
  if (!node) return null;
  const effects = node.mutators.map((id) => MUTATORS[id]);
  const sum = (key) => effects.reduce((total, effect) => total + (effect[key] ?? 0), 0);
  const baseSkill = node.index < 2 ? 0 : node.index < 5 ? 1 : 2;
  const skill = Math.min(2, baseSkill + sum("skill") + (node.boss ? 1 : 0));
  const enemyAmmo = {};
  for (const effect of effects)
    for (const [kind, count] of Object.entries(effect.enemyAmmo ?? {}))
      enemyAmmo[kind] = (enemyAmmo[kind] ?? 0) + count;
  return {
    seed: node.seed,
    name: node.name,
    layout: node.layout,
    theme: node.theme,
    boss: node.boss,
    weather: effects.some((effect) => effect.weather === "storm") ? "storm" : "clear",
    turnTime: effects.some((effect) => effect.turnTime === 30) ? 30 : 45,
    gravityScale: effects.reduce((value, effect) => value * (effect.gravityScale ?? 1), 1),
    blastScale: effects.reduce((value, effect) => value * (effect.blastScale ?? 1), 1),
    difficulty: SKILLS[skill],
    enemyHp: Math.round((70 + node.index * 10 + sum("enemyHp")) * (node.boss ? 1.4 : 1)),
    enemyAmmo,
    squad: clone(run.squad),
    weapons: { ...run.weapons },
    utilities: { ...run.utilities },
  };
}

function weightedOffers(run, random, count) {
  const wounded = run.squad.some((worm) => worm.alive && worm.hp < worm.maxHp);
  const fallen = run.squad.some((worm) => !worm.alive);
  const pool = Object.entries(REWARDS).filter(([, reward]) =>
    (reward.from ?? 0) <= run.index &&
    (!reward.needsWounded || wounded) && (!reward.needsFallen || fallen));
  const offers = [];
  while (offers.length < count && pool.length) {
    const total = pool.reduce((sum, [, reward]) => sum + reward.weight, 0);
    let roll = random() * total;
    const at = pool.findIndex(([, reward]) => (roll -= reward.weight) < 0);
    offers.push(pool.splice(at < 0 ? pool.length - 1 : at, 1)[0][0]);
  }
  return offers;
}

export function expeditionScore(run) {
  const health = run.squad.reduce((sum, worm) => sum + (worm.alive ? worm.hp : 0), 0);
  const stripes = run.squad.reduce((sum, worm) => sum + worm.stripes, 0);
  const bosses = [...BOSS_STAGES].filter((stage) => stage < run.index).length;
  return run.index * 100 + bosses * 150 + health + stripes * 25 +
    (run.status === "won" ? 500 : 0);
}

// survivors: remaining health of each squad slot after the battle (0 = lost).
export function resolveBattle(run, { won, survivors }) {
  if (run.status !== "battle") return run;
  const next = clone(run);
  next.squad.forEach((worm, slot) => {
    if (!worm.alive) return;
    const hp = Math.max(0, Math.round(survivors?.[slot] ?? 0));
    if (hp <= 0) { worm.alive = false; worm.hp = 0; return; }
    worm.hp = Math.min(worm.maxHp, hp);
  });
  if (!won || !next.squad.some((worm) => worm.alive)) {
    next.status = "lost";
    next.score = expeditionScore(next);
    return next;
  }
  const cleared = next.current;
  next.index += 1;
  for (const worm of next.squad) {
    if (!worm.alive) continue;
    if (worm.stripes < MAX_STRIPES) { worm.stripes += 1; worm.maxHp += STRIPE_HEALTH; }
    worm.hp = Math.min(worm.maxHp, worm.hp + CAMP_HEAL + next.campHeal);
  }
  if (next.index >= EXPEDITION_LENGTH) {
    next.status = "won";
    next.current = null;
    next.score = expeditionScore(next);
    return next;
  }
  next.status = "draft";
  next.picks = 1 + (cleared.risky ? 1 : 0) + (cleared.boss ? 1 : 0);
  next.offers = weightedOffers(next, generator(mix(next.seed, `draft:${next.index}:${next.picks}`)), 3);
  next.current = null;
  next.score = expeditionScore(next);
  return next;
}

export function takeReward(run, offer) {
  if (run.status !== "draft" || !run.offers[offer]) return run;
  const next = clone(run);
  const id = next.offers[offer], reward = REWARDS[id];
  for (const [kind, count] of Object.entries(reward.weapons ?? {}))
    next.weapons[kind] = (next.weapons[kind] ?? 0) + count;
  for (const [kind, count] of Object.entries(reward.utilities ?? {}))
    next.utilities[kind] = (next.utilities[kind] ?? 0) + count;
  if (reward.heal)
    for (const worm of next.squad)
      if (worm.alive) worm.hp = Math.min(worm.maxHp, worm.hp + reward.heal);
  if (reward.revive) {
    const worm = next.squad.find((member) => !member.alive);
    if (worm) { worm.alive = true; worm.hp = Math.min(worm.maxHp, reward.revive); }
  }
  if (reward.maxHp)
    for (const worm of next.squad) {
      worm.maxHp += reward.maxHp;
      if (worm.alive) worm.hp += reward.maxHp;
    }
  if (reward.campHeal) next.campHeal += reward.campHeal;
  next.rewards.push(id);
  next.picks -= 1;
  if (next.picks > 0) {
    next.offers = weightedOffers(next, generator(mix(next.seed, `draft:${next.index}:${next.picks}`)), 3);
  } else {
    next.offers = [];
    next.status = "route";
  }
  next.score = expeditionScore(next);
  return next;
}

function storageOf(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage; } catch { return null; }
}
export function loadRun(storage) {
  try {
    const run = JSON.parse(storageOf(storage)?.getItem(EXPEDITION_KEY) || "null");
    if (!run || run.version !== 1 || !Array.isArray(run.squad) || run.squad.length !== SQUAD_NAMES.length) return null;
    if (!["route", "battle", "draft", "won", "lost"].includes(run.status)) return null;
    // Supplies renamed or removed since the run was saved are dropped.
    run.rewards = (run.rewards ?? []).filter((id) => REWARDS[id]);
    run.offers = (run.offers ?? []).filter((id) => REWARDS[id]);
    if (run.status === "draft" && !run.offers.length) run.status = "route";
    return run;
  } catch { return null; }
}
export function saveRun(run, storage) {
  try {
    if (run) storageOf(storage)?.setItem(EXPEDITION_KEY, JSON.stringify(run));
    else storageOf(storage)?.removeItem(EXPEDITION_KEY);
  } catch { /* storage unavailable: the run lasts for this visit only */ }
}
export function readBest(storage) {
  try { return Math.max(0, Number(storageOf(storage)?.getItem(EXPEDITION_BEST_KEY)) || 0); } catch { return 0; }
}
export function recordBest(score, storage) {
  const best = Math.max(readBest(storage), score | 0);
  try { storageOf(storage)?.setItem(EXPEDITION_BEST_KEY, String(best)); } catch { /* ignore */ }
  return best;
}
