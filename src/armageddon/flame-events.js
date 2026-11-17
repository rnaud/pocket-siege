// 004D4590. Persistent fire loses strength on event400; deletion remains
// deferred to the next event3EA. Event3FD permanently disables terrain burns.
export function nativeFlameEvent(input, record, event) {
  const body = { ...input };
  if (event === 0x3fd) body.enabled = 0;
  else if (event === 0x400 && record[10])
    body.strength = (body.strength - 0x1999) | 0;
  return body;
}
