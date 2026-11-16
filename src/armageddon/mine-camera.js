import { nativeBodyAwake } from "./motion.js";

//004EA4C5..004EA584: arming, triggered or physically awake mines remain active.
export function nativeMineCameraRequest(body, timer) {
  if (!nativeBodyAwake(body) && !timer.triggered && !timer.arm) return null;
  return [body.submerged ? 10 : 5, body.x, body.y];
}

export function nativeMineCamera(body, timer, orders, index) {
  const request = nativeMineCameraRequest(body, timer);
  const after = [...orders];
  if (request && orders[index]) {
    for (let i = 0; i < orders.length; i++)
      if (orders[i] < orders[index]) after[i] = (orders[i] + 1) | 0;
    after[index] = 0;
  }
  return {
    after,
    requests: request ? [request] : [],
    activity: request ? 12 : 0,
  };
}
