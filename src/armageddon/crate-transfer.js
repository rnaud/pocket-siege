import { nativeInventoryAdd, nativeInventorySet } from './inventory.js';
// 004F5A12..004F5A45 +004C2CC0/004C2E10: no maximum-health clamp.
export const nativePickupHealth = (hp, amount) => (hp + amount) | 0;

// 004F596C..004F5B49. Inventory primitives and presentation are supplied by
// their native stores/adapters. Preserve add-before-clear for donor aliases.
export function nativeCrateTransfer(record, team, worm, interfaces) {
  const addAmmo=interfaces.addAmmo ?? ((...args)=>nativeInventoryAdd(interfaces.inventory,...args));
  const setAmmo=interfaces.setAmmo ?? ((...args)=>nativeInventorySet(interfaces.inventory,...args));
  if (record.kind === 1 || record.kind === 4) {
    addAmmo(team, record.weapon, record.quantity);
    interfaces.weaponMessage?.(team, record.weapon, record.quantity);
  } else if (record.kind === 2) {
    interfaces.setHealth(team, worm, nativePickupHealth(interfaces.health(team, worm), record.health));
    interfaces.healthMessage?.(team, record.health);
  } else if (record.kind === 5) {
    for (let slot = 0; slot < 71; slot++) {
      const amount = record.inventory[slot];
      if (!amount) continue;
      addAmmo(team, slot, amount);
      setAmmo(record.donorTeam, slot, 0);
      interfaces.weaponMessage?.(team, slot, amount);
    }
  }
}

// 004F5B57..004F5B82 resolves team speech slot7 except for donor kind5.
// Worm virtual+48 (004DD5D0) owns the sound and inserts priority3.
export function nativeCratePickupAudio(kind, team, resolveVoice) {
  if (kind === 5) return [{ operation: 'sound', request: [21, 3, 65536, 65536, 0] }];
  return [
    { operation: 'voice', team, slot: 7 },
    { operation: 'sound', request: [resolveVoice(team, 7), 3, 65536, 65536, 0] },
  ];
}

// Transfer branches004F596C..004F5B49 normalize weapon AND utility to1.
// The completion dispatcher returns this category, not the queried crate kind.
export function nativePickupCategory(kind) {
  return kind === 1 || kind === 4 ? 1 : kind === 2 || kind === 5 ? kind : 0;
}

// 004F5B9D..004F5C18 calls the four004C33A0..004C3460 counters.
// Category4 is supported by the dispatcher but normalized to1 by transfer.
export function nativeRecordPickup(stats, category) {
  const field = { 1: 'weaponCrates', 2: 'healthCrates', 4: 'utilityCrates', 5: 'donorCrates' }[category];
  if (field) stats[field] = (stats[field] + 1) | 0;
}
