//004DDBD0 block004DEDA7–004DEE66: only dirty grounded poses resample;
// slope variants retain their sign until crossing zero, then use547A to enter.
export function nativeWormSlopeTick(previous,facing,x,y,host) {
  const next={...previous};
  if(next.pending && !host.airborne()) {
    const slope=host.sample(x,y,8);
    if(slope===null)next.slope=0;
    else {next.pending=0;next.slope=slope;}
  }
  const directed=Math.imul(next.slope,facing);
  if(next.variant===-1 && directed>=0 || next.variant===1 && directed<=0)next.variant=0;
  else if(next.variant===0) {
    if(directed>0x547a)next.variant=1;
    if(directed< -0x547a)next.variant=-1;
  }
  return next;
}
