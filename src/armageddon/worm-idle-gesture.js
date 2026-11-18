import { nativeSelectSpawn } from './spawn-pool.js';
import { nativeWormIdleAnimation } from './worm-animation-sync.js';

//004DD7D0, called before the player's tick in the original worm update.
// Memory offsets retain the original cooldown, damage reaction and sound owner.
export function nativeWormIdleGesture(memory, sceneMemory, host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const get=o=>body.getInt32(o,true),put=(o,v)=>body.setInt32(o,v,true);
  const {sprite,progress}=host.current();
  if(get(0x104)||get(0x108)||host.state()!==0x65)return;
  if(![0x23,0x26,0x29].includes(sprite))return;
  if(get(0x2c8)){put(0x2c8,get(0x2c8)-1);return;}
  if(0x10000-(progress&65535)>0x1999)return;
  put(0x2c8,(host.random()&65535)%100+200);
  let entries=[];
  if(sprite===0x23) {
    if(get(0x20c)) {entries=[[get(0x20c)<26?0x58:0x49,10]];put(0x20c,0);}
    else entries=[[0x3a,50],[0x3d,20],[0x40,50],[0x43,20],[0x46,20],
      [0x4c,30],[0x4f,50],[0x52,20],[0x55,30],[0x5b,20],[0x5e,5],[0x61,5],[0x64,5]];
  } else if(sprite===0x29)entries=[[0x2c,10]];
  const selected={};
  if(!nativeSelectSpawn(entries.map(([position,weight])=>({position,weight})),host.random()>>>8,selected))return;
  const team=get(0xfc),base=team*3000;
  const {loop}=nativeWormIdleAnimation({team,worm:get(0x100),field14c:get(0x14c),field148:get(0x148)},
    {color:sceneMemory[base+0x3cd1],marked:sceneMemory[base+0x3cd2]},host);
  host.queue(selected.value);host.queue(loop);
  const index=get(0x158),priority=scene.getInt32(0x1030+index*4,true);
  if(priority) {
    for(let i=0;i<scene.getInt32(0x102c,true);i++) {
      const offset=0x1030+scene.getInt32(0xc2c+i*4,true)*4,value=scene.getInt32(offset,true);
      if(value<priority)scene.setInt32(offset,value+1,true);
    }
    scene.setInt32(0x1030+index*4,0,true);
  }
  if(selected.value===0x2c) {
    const sound=(host.random()&255)%6+14;
    if(get(0x38c))host.stopSound(get(0x38c));
    put(0x38c,host.sound(sound,3,65536,65536,0));
  }
}
