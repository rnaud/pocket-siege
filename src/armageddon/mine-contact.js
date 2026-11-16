//004E9CB0 delegates collision handling to004F4C30, then marks a forced dud.
export function nativeMineContact(body, timer, side, suppress, hooks) {
  if (!suppress) {
    const speed = (Math.abs(body.vx) + Math.abs(body.vy)) | 0;
    hooks.sound([0x6b, 65536, Math.trunc(speed / 5), 0]);
  }
  if (!hooks.receive(side)) hooks.bounce(side);
  if (timer.forceBlast && timer.dud) body.state = 1;
}
