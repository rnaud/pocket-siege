import { nativeWalkPosition } from "./walking-motion.js";

//004F4E60 uses terrain-only flags and up to three one-pixel steps on each
// side. A walk result of -1 still counts as a successful (flat) sample.
// Returns null when unsupported; otherwise signed16.16 average vertical rise.
export function nativeSurfaceSlope(body,x,y,limit,collide) {
  const flags=body.flags;body.flags=2;
  if(!collide(x,(y+65536)|0,body)){body.flags=flags;return null;}
  let sum=0,count=0;
  for(const direction of [-1,1]) {
    let px=x,py=y;
    for(let step=0;step<3;step++) {
      const previousY=py;
      const next=nativeWalkPosition(px,py,direction*65536,limit,(qx,qy)=>collide(qx,qy,body));
      if(!next.result)break;
      px=next.x;py=next.y;count++;
      sum=(sum+(direction<0?previousY-py:py-previousY))|0;
    }
  }
  body.flags=flags;
  return count?Math.trunc(sum/count)|0:null;
}
