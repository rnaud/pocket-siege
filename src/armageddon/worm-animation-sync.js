import transitions from "./worm-animation-transitions.json" with { type: "json" };
import { fixedMultiply } from "./numeric.js";

//004F5EF0 resolves idle entry/loop strips in native priority order.
export function nativeWormIdleAnimation(body,team,host) {
  if(body.field14c)return {entry:0,loop:0x67};
  if(host.teamStatus(body.team))return {entry:0x134,loop:0x137};
  if(team.marked)return {entry:team.color+0x13d,loop:team.color+0x140};
  if(body.field148)return {entry:0x2f,loop:0x29};
  return {entry:0,loop:host.health(body.team,body.worm)>29?0x23:0x26};
}
//004F6010 preserves protected strips and their original transition timing.
export function nativeSynchronizeWormAnimation(body,team,host) {
  const {sprite,progress}=host.current();
  const {entry,loop}=nativeWormIdleAnimation(body,team,host);
  if((entry && sprite===entry)||sprite===loop)return;
  if(transitions.some(row=>row[1]===sprite)) {
    if((progress&0xffff0000)>=65536)host.queue(loop);
    return;
  }
  const transition=transitions.find(row=>row[0]===sprite && row[2]);
  if(transition) {
    if(progress===0x8000)host.queue(transition[1]);
    else {
      const delta=(progress-0x8000)|0,absolute=((delta^(delta>>31))-(delta>>31))|0;
      host.progress(absolute<0x71c?0x8000:(fixedMultiply(0xb333,progress)+fixedMultiply(0x4ccc,0x8000))|0);
    }
    return;
  }
  if(transitions.some(row=>row[0]===sprite))return;
  if(sprite>=0x3a && sprite<=100 && (sprite-0x3a)%3===0 || sprite===0x2c)return;
  host.reset();if(entry)host.queue(entry);host.queue(loop);
}

export function nativeSynchronizeWormMemory(memory,sceneMemory,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const team=body.getInt32(0xfc,true),base=team*3000;
  const state={team,worm:body.getInt32(0x100,true),
    field14c:body.getInt32(0x14c,true),field148:body.getInt32(0x148,true)};
  const teamState={color:sceneMemory[base+0x3cd1],marked:sceneMemory[base+0x3cd2]};
  if(host.player)nativeSynchronizeWormPlayer(state,teamState,host.player,host.metadata,host);
  else nativeSynchronizeWormAnimation(state,teamState,host);
}

// Compose the original synchronization requests with the recovered16-slot
// player. Metadata resolution remains owned by the loaded sprite resources.
export function nativeSynchronizeWormPlayer(body,team,player,metadata,queries) {
  nativeSynchronizeWormAnimation(body,team,{
    ...queries,
    current:()=>({sprite:player.current.id,progress:player.current.progress}),
    progress:value=>player.setProgress(value),reset:()=>player.clear(),
    queue:sprite=>player.enqueue(sprite,metadata(sprite)),
  });
}
