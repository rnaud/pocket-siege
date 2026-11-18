//004EF0E0 with004C8C90/004C8CD0 global sparse-list iteration. This is
// Manhattan distance in signed16.16, including original32-bit overflow.
// Enabled state is not tested here; the global membership list is authoritative.
export function nativeNearestBody(bodies, x, y, flags, host) {
  let nearest=null;
  for(const body of bodies) {
    if(body===null || body===undefined)continue;
    if(!(flags & (1 << (host.type(body)&31))))continue;
    const position=host.position(body);
    const dx=(x-position.x)|0,dy=(y-position.y)|0;
    const distance=(Math.abs(dx)+Math.abs(dy))|0;
    if(nearest===null || distance<nearest)nearest=distance;
  }
  return nearest;
}
