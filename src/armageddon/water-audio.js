// 004F4FC0 / 004F4FE0 / 004E2220. Return the original five-word
// sound request; mixer scheduling and gain conversion belong to the host.
const abs = (value) => {
  const sign = value >> 31;
  return ((value ^ sign) - sign) | 0;
};
export function nativeWaterSound(body, skim = false) {
  if (skim)
    return {
      sound: [0x3a, 0, 65536, 65536, 0],
      suppress: body.splashSuppress ?? 0,
    };
  const sound = body.splashSuppress
    ? null
    : [
        0x39,
        0,
        65536,
        (Math.trunc(((abs(body.vx) + abs(body.vy)) | 0) / 5) + 0x8000) | 0,
        0,
      ];
  return { sound, suppress: 0 };
}
// 004EDC90 queues at most sixteen requests during one native frame.
export function enqueueNativeSound(queue, request) {
  if (queue.length >= 16) return 0;
  queue.push([...request]);
  return 1;
}
