// 004D97F0 event42F. Only the identified worm gets the pickup latch.
export function nativeWormPickupEvent(input, record) {
  return { ...input, field154: input.team === record[0] && input.worm === record[1]
    ? 1 : input.field154 };
}

// 004DDAB0 and the equivalent call in004DE0E4: the flag gates a32px query.
export function nativeWormPickupQuery(body, query) {
  return body.field154 ? query(body.team, body.worm, 0x200000) : 0;
}

// 004DE0E4..004DE12E. Query first, then clear on inactive idle or field188.
// Native state-entry clearing is separately implemented in worm-state.js.
export function nativeWormPickupTick(input, query) {
  const body = { ...input };
  nativeWormPickupQuery(body, query);
  if ((!body.field104 && body.state === 0x65) || body.field188) body.field154 = 0;
  return body;
}

// 004D7730 state-entry latch clearing, shared by native body and host adapter.
export function nativeWormPickupTransition(flag, active, next) {
  return !active && ![0x6f, 0x77, 0x79, 0x7a, 0x7e].includes(next) ? 0 : flag;
}
