// Native ownership lists: free stack, signed count, priorities, owners, count.
export function nativeAcquireInputOwner(scene,base) {
  const get=o=>scene.getInt16(base+o,true),put=(o,v)=>scene.setInt16(base+o,v,true);
  const free=get(0x20);if(!free)return -1;
  put(0x20,free-1);const owner=get((free-1)*2),count=get(0x62);
  let index=0;while(index<count && get(0x22+index*2)>=3)index++;
  for(let i=count;i>index;i--){put(0x22+i*2,get(0x22+(i-1)*2));put(0x42+i*2,get(0x42+(i-1)*2));}
  put(0x22+index*2,2);put(0x42+index*2,owner);put(0x62,count+1);return owner;
}
export function nativeReleaseInputOwner(body,scene,offset,base) {
  const owner=body.getInt32(offset,true),get=o=>scene.getInt16(base+o,true),put=(o,v)=>scene.setInt16(base+o,v,true);
  const count=get(0x62);if(owner<0 || count<=0)return;
  let index=0;while(index<count && get(0x42+index*2)!==owner)index++;
  if(index===count)return;
  const free=get(0x20);put(free*2,owner);put(0x20,free+1);
  for(let i=index;i<count-1;i++){put(0x22+i*2,get(0x22+(i+1)*2));put(0x42+i*2,get(0x42+(i+1)*2));}
  body.setInt32(offset,-1,true);put(0x62,count-1);
}
