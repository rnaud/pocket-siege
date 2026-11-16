import { fixedDivide } from "./numeric.js";
import { nativeWormBodyCollision } from "./body-collision.js";
const abs = (v) => ((v ^ (v >> 31)) - (v >> 31)) | 0;

// 004D6AD0. State entry and sound playback are emitted interfaces.
// Attribution is the incoming body's event7D3 record, resolved by the caller.
export function nativeWormReceiver(input, incomingInput, side, environment) {
  const receiver = { ...input }, incoming = { ...incomingInput }, calls = [];
  const result = (value) => ({ receiver, incoming, calls, result: value });
  const setState = (target) => {
    receiver.state = target;
    calls.push({ operation: "state", target });
  };
  if (receiver.state === 0x88) return result(0);
  if (incoming.type === 3 && incoming.state >= 0x7f && incoming.state <= 0x81) {
    if (!environment.recordAvailable) return result(0);
    let impulse = incoming.vx;
    if (environment.marked && environment.matched)
      impulse = Math.trunc(Math.imul(environment.scale, impulse) / 100) | 0;
    // Original004F4CB0 declines impulses on suspended bodies, but the
    // receiver still enters the incoming state and plays its contact voice.
    if (!receiver.suspended)
      receiver.vx = (receiver.vx + fixedDivide(impulse, receiver.mass)) | 0;
    if (receiver.state !== incoming.state) setState(incoming.state);
    calls.push({ operation: "random" });
    calls.push({ operation: "voice", team: receiver.team, slot: ((environment.random & 255) % 3) + 0x26 });
    if (receiver.soundHandle)
      calls.push({ operation: "stopSound", handle: receiver.soundHandle });
    calls.push({ operation: "sound", request: [environment.voiceId, 3, 65536, 65536, 0] });
    receiver.soundHandle = environment.soundHandle;
    return result(1);
  }
  if (incoming.type === 4) {
    const dx = (incoming.x - receiver.x) | 0, dy = (incoming.y - receiver.y) | 0;
    if (dy > 0x80000 && abs(fixedDivide(dx, dy)) < 0x10000) {
      setState(0x80);
      receiver.vx = 0;
      receiver.vy = incoming.vy;
      return result(1);
    }
  }
  const response = nativeWormBodyCollision(receiver.state, receiver, incoming, side);
  Object.assign(receiver, response.receiver);
  Object.assign(incoming, response.incoming);
  return result(response.result);
}
