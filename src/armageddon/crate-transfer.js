// 004F5A12..004F5A45 +004C2CC0/004C2E10: no maximum-health clamp.
export const nativePickupHealth = (hp, amount) => (hp + amount) | 0;

// 004F596C..004F5B49. Inventory primitives and presentation are supplied by
// their native stores/adapters. Preserve add-before-clear for donor aliases.
export function nativeCrateTransfer(record, team, worm, interfaces) {
  if (record.kind === 1 || record.kind === 4) {
    interfaces.addAmmo(team, record.weapon, record.quantity);
    interfaces.weaponMessage?.(team, record.weapon, record.quantity);
  } else if (record.kind === 2) {
    interfaces.setHealth(team, worm, nativePickupHealth(interfaces.health(team, worm), record.health));
    interfaces.healthMessage?.(team, record.health);
  } else if (record.kind === 5) {
    for (let slot = 0; slot < 71; slot++) {
      const amount = record.inventory[slot];
      if (!amount) continue;
      interfaces.addAmmo(team, slot, amount);
      interfaces.setAmmo(record.donorTeam, slot, 0);
      interfaces.weaponMessage?.(team, slot, amount);
    }
  }
}
