// 004F9220 enters animation197. 004F9250 advances through swing19A and
// recovery19D. Hit requests repeat while the swing is between25% and100%;
// the native recipient type mask excludes worms already in their hurt state.
export function nativeAxeTick({ sprite, progress, x, y, facing, percent }) {
  if (sprite === 0x197) return progress >= 65536
    ? [{ operation: 'clear' }, { operation: 'queue', sprite: 0x19a },
       { operation: 'sound', request: [0x22,65536,65536,0] }] : [];
  if (sprite === 0x19a) {
    if (progress >= 65536) return [{ operation:'clear' }, { operation:'queue',sprite:0x19d }];
    if (progress >= 16384) return [{ operation:'area', request:[
      (x + Math.imul(facing, 0x140000)) | 0, y, 0x1c0000, 0x1e0000,
      percent & 255, 0, 0xa0000, 10, 0x21, 0, 0x21844, 1,
    ] }];
    return [];
  }
  return sprite !== 0x19d || progress >= 65536 ? [{operation:'state',value:0x65}] : [];
}
