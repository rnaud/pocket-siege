//004CBC50: fixed-capacity insertion rejects nonpositive weights and duplicates.
export function nativeAddSpawn(entries,capacity,position,weight) {
  position|=0;weight|=0;capacity|=0;
  if(weight<1 || entries.length>=capacity || entries.some(entry=>(entry.position|0)===position))return 0;
  entries.push({position,weight});return 1;
}
//004A5350 initializes 64 slots from terrain-provided integer coordinate pairs.
export function nativeBuildSpawnPool(positions) {
  const entries=[];
  for(const {x,y} of positions)nativeAddSpawn(entries,64,((x<<16)+y)|0,1);
  return entries;
}
//004CBCD0: weighted thresholds use signed32-bit shifts/division, not floats.
export function nativeSelectSpawn(entries,random,output) {
  if(!entries.length)return 0;
  let total=0,cumulative=0;
  for(const entry of entries)total=(total+entry.weight)|0;
  for(const entry of entries) {
    cumulative=(cumulative+entry.weight)|0;const numerator=cumulative<<16;
    if(!total || (numerator===-2147483648 && total===-1))throw new RangeError('Native spawn weight division fault');
    if((random&65535)<Math.trunc(numerator/total)){output.value=entry.position;return 1;}
  }
  return 0;
}
//004CBD60/004CBD80 retain output on an empty list.
export function nativeSelectSideSpawn(entries,right,output) {
  if(!entries.length)return 0;
  output.value=entries[right?entries.length-1:0].position;return 1;
}
//004CBDB0 removes only the first matching packed coordinate, preserving order.
export function nativeReserveSpawn(entries,position) {
  const index=entries.findIndex(entry=>(entry.position|0)===(position|0));
  if(index<0)return 0;entries.splice(index,1);return 1;
}
//004EE900 uses the scene's spawn stream, without the simulation-frame addend.
export function nativeSpawnRandom(sceneMemory) {
  const scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const next=(Math.imul(scene.getInt32(0x1241c,true),0x19660d)+0x3c6ef35f)>>>0;
  scene.setUint32(0x1241c,next,true);return next;
}

// Address-backed004CBCD0/004CBD60/004CBD80 access the original packed pool.
export function nativeSelectSpawnAt(memory,address,random,output) {
  const count=memory.get(address+4)|0,entries=memory.get(address+12),rows=[];
  for(let i=0;i<count;i++)rows.push({position:memory.get(entries+i*8)|0,weight:memory.get(entries+i*8+4)|0});
  return nativeSelectSpawn(rows,random,output);
}
export function nativeSelectSideSpawnAt(memory,address,right,output) {
  const count=memory.get(address+4)|0;if(!count)return 0;
  output.value=memory.get(memory.get(address+12)+(right?count-1:0)*8)|0;return 1;
}
//004CBDB0 preserves inactive trailing storage while shifting both record words.
export function nativeReserveSpawnAt(memory,address,position) {
  const count=memory.get(address+4)|0,entries=memory.get(address+12);
  for(let i=0;i<count;i++)if((memory.get(entries+i*8)|0)===(position|0)) {
    memory.put(address+4,count-1);
    for(let j=i;j<count-1;j++)for(const offset of [0,4])memory.put(entries+j*8+offset,memory.get(entries+(j+1)*8+offset));
    return 1;
  }
  return 0;
}

//004CBB90: retain allocator contents in inactive records.
export function nativeCreateSpawnPoolAt(memory,address,capacity,host) {
  memory.put(address,0x526918);memory.put(address+8,capacity);
  const entries=host.allocateArray(capacity<<3,0x567600);
  memory.put(address+12,entries);memory.put(address+4,0);
  return address;
}
//004CBC50: signed capacity/weight checks and ordered packed-coordinate lookup.
export function nativeAddSpawnAt(memory,address,position,weight) {
  position|=0;weight|=0;
  if(weight<1)return 0;
  const count=memory.get(address+4)|0;
  if(count>=(memory.get(address+8)|0))return 0;
  const entries=memory.get(address+12);
  for(let i=0;i<count;i++)if((memory.get(entries+i*8)|0)===position)return 0;
  memory.put(entries+count*8,position);
  memory.put(memory.get(address+12)+(memory.get(address+4)|0)*8+4,weight);
  memory.put(address+4,(memory.get(address+4)+1)|0);
  return 1;
}
