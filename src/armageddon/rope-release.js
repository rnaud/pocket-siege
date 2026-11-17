// Original event40C state7B branch,004DA552..004DA59F. State entry
// owns constraint teardown and animation; the saved body angle is from
// before that callback. This is the jump/release event, not fire input.
export function nativeRopeRelease(input, savedAngle, schemeByte, changeState) {
  const body = { ...input, field15c: schemeByte & 255 };
  changeState(body, 0x73);
  body.ropeAngle = Math.max(0x6666, Math.min(0x9999, (savedAngle + 0x8000) & 65535));
  return body;
}
