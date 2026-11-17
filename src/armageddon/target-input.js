import { nativeCollectTargetActivation } from './controller-input.js';
import { nativeClampPlacementTarget } from './target-placement.js';

//004E6420 initializes the cursor and claims priority-2 pointer ownership.
export function nativeBeginTargeting(memory,sceneMemory,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const get=o=>body.getInt32(o,true),put=(o,v)=>body.setInt32(o,v,true);
  const read=o=>scene.getInt32(o,true),write=(o,v)=>scene.setInt32(o,v,true);
  if(host.wormState(get(0x3c),get(0x4c))===100) {
    write(0x12480,Math.min(read(0x12480),(read(0x804)-24)<<16));
    host.cameraMode(14);host.cameraTarget(read(0x1247c),read(0x12480));
  } else {
    const worm=host.lookup(2,((get(0x3c)<<4)+get(0x4c))|0);
    const p=host.wormQuery(worm,0x7d0,0x154),v=new DataView(p.buffer,p.byteOffset,p.byteLength);
    write(0x1247c,v.getInt32(0,true));write(0x12480,(v.getInt32(4,true)-0x200000)|0);
  }
  put(0xb4,get(0x98)?get(0xdc)<<13:0xa000);put(0xb0,get(0x98)?get(0xdc)<<13:0);
  if(scene.getInt8(0x11d7c)!==get(0x44)){put(0xbc,1);return;}
  put(0xac,1);if(get(0xe8)>=0)return;
  const free=scene.getInt16(0x1b798,true);if(!free){put(0xe8,-1);return;}
  scene.setInt16(0x1b798,free-1,true);
  const handle=scene.getInt16(0x1b778+(free-1)*2,true),count=scene.getInt16(0x1b7da,true);
  let index=0;while(index<count && scene.getInt16(0x1b79a+index*2,true)>=3)index++;
  for(let i=count;i>index;i--) {
    scene.setInt16(0x1b79a+i*2,scene.getInt16(0x1b79a+(i-1)*2,true),true);
    scene.setInt16(0x1b7ba+i*2,scene.getInt16(0x1b7ba+(i-1)*2,true),true);
  }
  scene.setInt16(0x1b79a+index*2,2,true);scene.setInt16(0x1b7ba+index*2,handle,true);
  scene.setInt16(0x1b7da,count+1,true);put(0xe8,handle);
}

//004E6380. Clear target flags even if the pointer owner is absent; only a
// matched owner returns to the free stack and gets its handle invalidated.
export function nativeEndTargeting(memory,sceneMemory) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  body.setInt32(0xac,0,true);body.setInt32(0xbc,0,true);
  const owner=body.getInt32(0xe8,true), count=scene.getInt16(0x1b7da,true);
  if(owner<0 || count<=0)return;
  let index=0;
  while(index<count && scene.getInt16(0x1b7ba+index*2,true)!==owner)index++;
  if(index===count)return;
  const free=scene.getInt16(0x1b798,true);
  scene.setInt16(0x1b778+free*2,owner,true);scene.setInt16(0x1b798,free+1,true);
  for(let i=index;i<count-1;i++) {
    scene.setInt16(0x1b79a+i*2,scene.getInt16(0x1b79a+(i+1)*2,true),true);
    scene.setInt16(0x1b7ba+i*2,scene.getInt16(0x1b7ba+(i+1)*2,true),true);
  }
  body.setInt32(0xe8,-1,true);scene.setInt16(0x1b7da,count-1,true);
}

//005019C0. Device input, worm queries and validation are host interfaces;
// ownership gates, selection, cursor, teardown and command bytes are native.
export function nativeCollectTargetInput(memory,sceneMemory,queue,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const get=o=>body.getInt32(o,true), put=(o,v)=>body.setInt32(o,v,true);
  const read=o=>scene.getInt32(o,true), write=(o,v)=>scene.setInt32(o,v,true);
  const first=(start,count,id)=>scene.getInt16(count,true)>0 && scene.getInt16(start,true)===id;
  const emit=(event,words)=>{const p=new Uint8Array(words.length*4),v=new DataView(p.buffer);words.forEach((w,i)=>v.setInt32(i*4,w,true));queue.writeEvent(event,p);};
  if(host.wormBusy(get(0x3c),get(0x4c)) || get(0xec)<0 || !first(0x1b822,0x1b842,get(0xec)))return;
  if(!get(0xac)){nativeCollectTargetActivation(memory,queue,host);return;}
  if(get(0xf0)<0 || get(0xe8)<0)return;
  const worm=host.lookup(2,((get(0x3c)<<4)+get(0x4c))|0);
  const info=host.wormQuery(worm,0x7d3,0x154), status=new DataView(info.buffer,info.byteOffset,info.byteLength);
  const allowZero=status.getInt32(0x18,true)>0 && status.getInt32(0x14,true)>0;
  if(first(0x1b88a,0x1b8aa,get(0xf0))) {
    if(host.key(0x22) && get(0x98)){host.consume(0x22);emit(0x3fb,[get(0x3c),-1]);}
    else if(host.key(0x23) && get(0x98)){host.consume(0x23);emit(0x3fb,[get(0x3c),1]);}
    else if(host.key(0x22) && [0x22,0x24].includes(get(0x64))) {
      host.repeatKey(0x22);let value=(get(0xe0)-1)|0;if(value<0)value=18;if(value===0 && !allowZero)value=18;
      put(0xe0,value);emit(0x3fa,[get(0x3c),value]);
    } else if(host.key(0x23) && [0x22,0x24].includes(get(0x64))) {
      host.repeatKey(0x23);let value=(get(0xe0)+1)|0;if(value>18)value=0;if(value===0 && !allowZero)value=1;
      put(0xe0,value);emit(0x3fa,[get(0x3c),value]);
    }
  }
  const {dx,dy,buttons}=host.pointerSample();host.pointerResetA();host.pointerResetB();
  if(!first(0x1b7ba,0x1b7da,get(0xe8)))return;
  if(!(buttons&1)) {
    write(0x1247c,(read(0x1247c)+(dx<<16))|0);write(0x12480,(read(0x12480)+(dy<<16))|0);
    write(0x1247c,Math.max(read(0x1247c),read(0x1b8cc)));
    write(0x1247c,Math.min(read(0x1247c),(read(0x1b8d0)-0x80000)|0));
    write(0x12480,Math.max(read(0x12480),read(0x1b8ac)?0:-0x1000000));
    write(0x12480,Math.min(read(0x12480),(read(0x804)-24)<<16));
    if([0x22,0x24].includes(get(0x64))) {
      const shape=host.targetShape(get(0xe0));
      const [x,y]=nativeClampPlacementTarget(read(0x1247c),read(0x12480),shape.width,shape.height,read(0x1b8ac));
      write(0x1247c,x);write(0x12480,y);
    }
    if(dx || dy)emit(0x3f9,[get(0x3c),read(0x1247c)>>16,read(0x12480)>>16]);
    return;
  }
  if(get(0x64)===0x28) {
    const targetWorm=host.lookup(2,((get(0x3c)<<4)+get(0x4c))|0);if(!targetWorm)return;
    const target=host.teleportTarget(read(0x1247c),read(0x12480),targetWorm);
    write(0x1247c,target.x);write(0x12480,target.y);
    if(!target.accepted){host.sound(0x78,8,65536,65536,0);return;}
  } else if([0x22,0x24].includes(get(0x64)) && !host.girderTarget(read(0x1247c)>>16,read(0x12480)>>16,get(0xe0))) {
    host.sound(0x78,8,65536,65536,0);return;
  }
  const payload=new Uint8Array(20),v=new DataView(payload.buffer);
  v.setInt32(0,get(0x3c),true);v.setInt32(4,get(0x4c),true);
  v.setInt16(8,read(0x1247c)>>16,true);v.setInt16(10,read(0x12480)>>16,true);
  v.setInt32(12,get(0xdc),true);v.setInt32(16,get(0xe0),true);queue.writeEvent(0x41a,payload);
  if(![0x22,0x24,0x28].includes(get(0x64)))host.sound(0x77,8,65536,65536,0);
  const state=host.wormState(get(0x3c),get(0x4c));
  if(get(0xa4) && [0x67,0x78,0x7b,0x7c,0x7d,100].includes(state)) {
    emit(0x40e,[get(0x3c)]);emit(0x40f,[get(0x3c)]);
  } else if(host.endTargeting)host.endTargeting();
  else nativeEndTargeting(memory,sceneMemory);
}
