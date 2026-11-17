import { nativeCrateState } from './crate-state.js';

// 004E0F20 event branches separate from physics tick3EA and render3EB.
export function nativeCrateEvent(input, event) {
  const body = { ...input };
  if (event === 0x3ed) {
    const rate = body.state === 101 || body.state === 102 ? 0x51e
      : body.state === 104 ? body.kind === 5 ? 0x28f : 0xa3d : 0;
    body.progress = (body.progress + rate) | 0;
  } else if (event === 0x3ff) {
    if (body.state === 100 || body.state === 101) {
      body.restitutionY = 0x3333;
      return nativeCrateState(body, 104);
    }
  } else if (event === 0x433 || event === 0x444) return nativeCrateState(body, 103);
  else throw new RangeError(`Unsupported crate event ${event}`);
  return body;
}
