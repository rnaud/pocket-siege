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
