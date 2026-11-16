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
