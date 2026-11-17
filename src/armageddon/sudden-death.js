// 004B61E0. Environment activation used by the sudden-death controller.
// These are initialized, receiver-consumed event words, not the uninitialized
// tail of the original 0x124-byte stack record. Receivers retain event order.
export function nativeSuddenDeathActivation({ waterY, rise, dose }) {
  const calls = [
    { operation: 'event', event: 0x3f8, record: [0] },
    { operation: 'camera', point: [0x3c00000, waterY << 16] },
    { operation: 'event', event: 0x441, record: [rise & 255, 8] },
    { operation: 'event', event: 0x442, record: [8] },
    { operation: 'sound', request: [7, 8, 65536, 65536, 0] },
  ];
  const signedDose = (dose << 16) >> 16;
  if (signedDose > 0) calls.push({ operation: 'event', event: 0x439, record: [signedDose] });
  return calls;
}

// 004D97F0 event423 (004DADEC..004DAEA5). Negative scheme doses
// reduce health to one; nonnegative doses subtract with a one-HP floor.
// Unlike poison event426, this receiver does not exempt frozen worms.
export function nativeSuddenDeathHealth(hp, amount) {
  if (amount < 0) return [[(hp - 1) | 0, 0, 1]];
  const target = Math.max(1, (hp - amount) | 0);
  return target < hp ? [[(hp - target) | 0, 0, 1]] : [];
}

// 004B64B0 pending environmental stage,004B72E1..004B7386.
// Caller must enter this only after native settlement/announcement gates.
export function nativeSuddenDeathRepeat({ pending, rise, dose, nuclear }) {
  if (!pending) return { pending, handled: false, calls: [] };
  const calls = [{ operation: 'event', event: 0x441, record: [rise & 255, 1] }];
  const amount = (dose << 16) >> 16;
  if (amount > 0 && !(nuclear & 255)) calls.push(
    { operation: 'event', event: 0x423, record: [amount] },
    { operation: 'refresh', entry: '004C30F0' },
    { operation: 'refresh', entry: '004C30D0' },
  );
  return { pending: 0, handled: true, calls };
}
