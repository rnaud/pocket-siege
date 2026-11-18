import { nativeResolveWormSprite } from "./worm-sprite.js";
//004D8B20 composes the resolved pose with team/poison flags and draw priority.
// Default to004DB780 pose resolution;004EEDF0 queue submission remains supplied.
export function nativeDrawWorm(body,host) {
  const {x,y,sprite,progress}=host.sprite?host.sprite():nativeResolveWormSprite(body,host);
  let flagged=sprite|0;
  if(host.teamFlags(body.team)&8)flagged|=0x1000000;
  if(body.poison)flagged|=0x4000000;
  const state=host.state();
  const action=state>=0x68 && state<=0x75 && state!==0x73;
  host.draw((Math.imul(body.rank,4)+(action?0xc0000:0xd0000))|0,x,y,0,flagged,progress);
}
