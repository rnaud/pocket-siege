// 004ECCF0, the world's 0x446 handler (Scales of Justice). The living teams'
// total health is split evenly by alliance (count from the scheme, so an
// alliance with no living team forfeits its share), then by living team in
// that alliance, then by living worm, carrying each remainder forward one
// unit at a time. There is no cap. Each worm is set to its share (004C2E10);
// a worm that lost health is reported with 0x430 {team, worm, loss, 1}.
// `teams` are {alliance, hp: [...]} in team order; 1-based ids in calls.
export function nativeScalesOfJustice(alliances, input) {
  const teams = input.map((t) => ({ alliance: t.alliance, hp: [...t.hp] }));
  const calls = [];
  const health = (t) => t.hp.reduce((sum, hp) => sum + (hp > 0 ? hp : 0), 0);
  const living = new Array(Math.max(alliances, 0)).fill(0);
  let total = 0;
  for (const t of teams) {
    const h = health(t);
    if (h > 0) { living[t.alliance] = (living[t.alliance] ?? 0) + 1; total += h; }
  }
  const perAlliance = Math.trunc(total / alliances);
  for (let a = 0; a < alliances; a++) {
    const count = living[a];
    if (!count) continue;
    let base = Math.trunc(perAlliance / count);
    const extra = perAlliance % count;
    let teamCarry = 0;
    teams.forEach((t, ti) => {
      if (t.alliance !== a || health(t) <= 0) return;
      const alive = t.hp.filter((hp) => hp > 0).length;
      let share = base;
      teamCarry += extra;
      if (teamCarry >= count) { share++; teamCarry %= count; }
      const perWorm = Math.trunc(share / alive), wormExtra = share % alive;
      let wormCarry = 0;
      t.hp.forEach((hp, wi) => {
        if (hp <= 0) return;
        let value = perWorm;
        wormCarry += wormExtra;
        if (wormCarry >= alive) { value++; wormCarry %= alive; }
        t.hp[wi] = value;
        calls.push({ operation: "set", request: [ti + 1, wi + 1, value] });
        if (hp > value) calls.push({ operation: "report", event: 0x430, request: [ti + 1, wi + 1, hp - value, 1] });
      });
    });
  }
  return { hp: teams.map((t) => t.hp), calls };
}

// 004FCFF8: the user's announcement through 004EEEE0 over the English table
// +0x2E0 (00558DE0), formatted with the worm's name, font 0x17.
export const SCALES_MESSAGES = Object.freeze([
  "%s considers it even!", "%s balances the odds.", "%s it's honours even.",
  "%s readdresses the balance.", "%s settles the scores.", "Even Stevens.",
]);
export function nativeScalesAnnouncement(name, nextRandom) {
  const text = SCALES_MESSAGES[(nextRandom() & 255) % SCALES_MESSAGES.length];
  return { text: text.replace("%s", () => name), font: 0x17 };
}
