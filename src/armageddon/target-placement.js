// Full00501630. Fixed-point placement uses the original 1920x696 field,
// truncating sprite half-sizes and retaining fractions during edge correction.
export function nativeClampPlacementTarget(x,y,width,height,ceiling) {
  const left=((x>>16)-Math.trunc(width/2))|0;
  const top=((y>>16)-Math.trunc(height/2))|0;
  const minimum=ceiling?0:16;
  if(left<0)x=(x-(left<<16))|0;
  if(top<minimum)y=(y+((minimum-top)<<16))|0;
  // Both checks use the original top-left, even for oversized sprites.
  if(((width+left)|0)>1920)x=(x+((1920-left-width)<<16))|0;
  if(((height+top)|0)>696)y=(y+((696-top-height)<<16))|0;
  return [x|0,y|0];
}

// Full00501880. Query7D1 may adjust coordinates even on rejection. Reuse its
// buffer, resetting only Y for each candidate, just like the native routine.
export function nativeFindTeleportTarget(x,y,ceiling,query) {
  const payload=new Uint8Array(0x154),view=new DataView(payload.buffer);
  view.setInt32(0,x>>16,true);view.setInt32(4,y>>16,true);
  const attempt=()=>query(0x7d1,payload);
  const accepted=()=>({accepted:1,x:view.getInt32(0,true)<<16,y:view.getInt32(4,true)<<16});
  if(attempt())return accepted();
  for(let distance=1;distance<32;distance++) {
    const candidate=((y>>16)-distance)|0;
    view.setInt32(4,candidate,true);
    if(ceiling && candidate<8)break;
    if(attempt())return accepted();
  }
  for(let distance=1;distance<32;distance++) {
    view.setInt32(4,((y>>16)+distance)|0,true);
    if(attempt())return accepted();
  }
  return {accepted:0,x:x|0,y:y|0};
}
