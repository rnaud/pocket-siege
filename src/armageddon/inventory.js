// WA 3.0.0.0 runtime inventory primitives, verified against original x86.
// 004C2FB0: negative stock remains unchanged; negative additions grant -1.
export function addNativeAmmo(count, amount) {
  count |= 0;
  amount |= 0;
  return count < 0 ? count : amount < 0 ? -1 : (count + amount) | 0;
}
// 004C3010: only positive stock is decremented.
export function spendNativeAmmo(count) {
  count |= 0;
  return count > 0 ? count - 1 : count;
}
// 004C2EE0 ordinary-weapon path. Weapon 0x3B additionally checks live worms.
export function availableNativeAmmo(count, delay = 0, bypass = false) {
  return (delay | 0) !== 0 && !bypass ? 0 : count | 0;
}
// Bridge the existing browser inventory's Infinity representation. New native
// data may use negative counts directly; both must keep unlimited stock intact.
export const addAmmo = (count, amount) =>
  count === Infinity || amount === Infinity
    ? Infinity
    : addNativeAmmo(count ?? 0, amount);
export const spendAmmo = (count) =>
  count === Infinity ? Infinity : spendNativeAmmo(count ?? 0);
export const displayAmmo = (count) => (count < 0 ? Infinity : count);
