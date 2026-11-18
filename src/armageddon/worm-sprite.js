import slopeSprites from './worm-slope-sprites.json' with {type:'json'};
const slopes=new Set(slopeSprites);
//004DB780. Preserve native query order and signed32-bit intermediate values.
export function nativeResolveWormSprite(body,host) {
  let {x,y}=host.position();
  let {sprite,progress}=host.current();
  if(host.state()===0x78) {
    if(body.hangDirection>=0)sprite^=0x40000;
    return {x,y,sprite,progress};
  }
  if(host.state()===0x66 && sprite===0x20)x=body.xOverride;
  if(host.state()===0x71 && sprite===0x7d)x=body.xOverride;
  if(sprite===0x18e)progress=(body.teleportProgress<0x8000?body.teleportProgress*2:(0x10000-body.teleportProgress)*2)|0;
  if([0x215,0x218,0x21b].includes(sprite))progress=(Math.max(0x4000,Math.min(0xc000,progress))*2-0x8000)|0;
  if(slopes.has(sprite)) {
    if(body.slope<0)sprite=(sprite+1)|0;
    if(body.slope>0)sprite=(sprite+2)|0;
  } else if(sprite===0x7d) {
    const variant=Math.max(2,Math.min(4,((Math.imul(body.toolAngle,6)+0x8000)|0)>>16));
    if(variant===4)sprite++;
    if(variant===2)sprite+=2;
  }
  if(sprite===13) {
    let variant=Math.trunc((((x+y)|0)>>16)/20)&3;
    if(variant>=3)variant=4-variant;
    sprite+=variant;
  }
  if(body.facing>0)sprite^=0x40000;
  return {x,y,sprite,progress};
}
