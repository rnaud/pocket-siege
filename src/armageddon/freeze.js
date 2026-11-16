// Original Freeze (weapon 0x3C, utility action 0x14) sends its user's team ID
// in event 0x411. Team handler 004E6810 forwards only to that team's worms.
export function freezeTeam(worms, team) {
  for (const worm of worms)
    if (worm.team === team && worm.hp > 0) worm.frozen = 1;
}

// 004F5C80 queues these sprite IDs when entering worm state 0x88.
export function nativeFreezeAnimation(previousSpriteId) {
  return previousSpriteId === 0x23f
    ? { clear: false, sprites: [0x242, 0x248] }
    : { clear: true, sprites: [0x23c, 0x248] };
}
