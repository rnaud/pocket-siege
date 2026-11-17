// 004E0270 ->004F4C30. The contacted body gets first refusal before bounce.
export function nativeCrateContact(body, side, suppress, interfaces) {
  if (!suppress) {
    const speed = (Math.abs(body.vx) + Math.abs(body.vy)) | 0;
    interfaces.sound([110, 65536, Math.trunc(speed / 5), 0]);
  }
  if (!interfaces.receive(side)) interfaces.bounce(side);
}
