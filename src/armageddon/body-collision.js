import { fixedMultiply, fixedDivide } from "./numeric.js";
const abs = (value) => {
  const sign = value >> 31;
  return ((value ^ sign) - sign) | 0;
};
const add = (a, b) => (a + b) | 0;
const stop = (body) =>
  add(abs(body.vx), abs(body.vy)) < 0x6666 ? { ...body, vx: 0, vy: 0 } : body;
// 004F4990. The contacted body is `receiver`; the incoming body is `incoming`.
// Only the contact-normal momentum is exchanged. Tangential damping happens
// before the same-direction early return, which deliberately skips final stops.
export function nativeBodyCollision(receiver, incoming, side) {
  let a = { vx: receiver.vx, vy: receiver.vy },
    b = { vx: incoming.vx, vy: incoming.vy };
  let impulseX = 0,
    impulseY = 0;
  const vertical = side === 1 || side === 3,
    horizontal = side === 2 || side === 4;
  if (vertical || horizontal) {
    const axis = vertical ? "vy" : "vx",
      tangent = vertical ? "vx" : "vy";
    const incomingMomentum = fixedMultiply(b[axis], incoming.mass);
    const receiverMomentum = fixedMultiply(a[axis], receiver.mass);
    b[tangent] = fixedMultiply(b[tangent], receiver.tangent);
    if (abs(b[tangent]) < 0x6666) b[tangent] = 0;
    if (
      Math.sign(receiverMomentum) === Math.sign(incomingMomentum) &&
      abs(b[axis]) <= abs(a[axis])
    )
      return { receiver: a, incoming: b, result: 1 };
    let impulse = (incomingMomentum - receiverMomentum) | 0;
    if (abs(impulse) > 0x6665) impulse = fixedMultiply(impulse, 0x8000);
    if (vertical) impulseY = impulse;
    else impulseX = impulse;
  }
  a.vx = add(a.vx, fixedDivide(impulseX, receiver.mass));
  a.vy = add(a.vy, fixedDivide(impulseY, receiver.mass));
  b.vx = add(b.vx, -fixedDivide(impulseX, incoming.mass));
  b.vy = add(b.vy, -fixedDivide(impulseY, incoming.mass));
  return { receiver: stop(a), incoming: stop(b), result: 1 };
}
