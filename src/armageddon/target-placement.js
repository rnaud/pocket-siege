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

// Full00501700. Range is measured from the sprite's top-left using Manhattan
// distance. The two collision layers and sprite overlap operation are ordered.
export function nativeValidateGirderTarget(memory,sceneMemory,x,y,shape,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const [width,height]=host.dimensions(shape);
  const left=(x-Math.trunc(width/2))|0,top=(y-Math.trunc(height/2))|0;
  if(left<0 || top<0 || ((left+width)|0)>1920 || ((top+height)|0)>696)return 0;
  const worm=host.lookup(2,((body.getInt32(0x3c,true)<<4)+body.getInt32(0x4c,true))|0);
  if(!worm)return 0;
  const [wx,wy]=host.position(worm),distance=scene.getUint16(0x11d6c,true);
  const abs=value=>{const sign=value>>31;return ((value^sign)-sign)|0;};
  if(distance && ((abs((left-(wx>>16))|0)+abs((top-(wy>>16))|0))|0)>distance)return 0;
  host.clear();
  host.draw(0,0,0,2,0);
  host.draw(0,0,0,-3,1);
  return Number(host.overlap(left,top,width,height,shape,0,0,5)===0);
}
