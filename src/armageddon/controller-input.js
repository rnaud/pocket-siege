// Full005010E0, reached by controller event3EC. Collectors own their event
// payloads; this routine preserves the native gates, order and repeated queries.
export function nativeCollectControllerInput(memory, sceneMemory, queue, host) {
  const body = new DataView(memory.buffer, memory.byteOffset, memory.byteLength);
  const scene = new DataView(sceneMemory.buffer, sceneMemory.byteOffset, sceneMemory.byteLength);
  const get = offset => body.getInt32(offset, true);
  if (scene.getInt8(0x11d7c) !== get(0x44) || scene.getInt32(0x1d444,true) || !get(0x40)) return;
  if (get(0x70)) {
    if (host.menu) host.menu(queue);
    else nativeCollectMenuInput(memory,sceneMemory,queue,host);
  }
  if (get(0x48) || get(0x74)) return;
  if (host.pointer) host.pointer(queue);
  else nativeCollectPointerInput(memory,sceneMemory,queue,host);
  host.keyboard(queue);
  const controller = get(0xf0);
  if (controller < 0) return;
  const count = scene.getInt16(0x1b8aa,true);
  let index = 0;
  while (index < count && scene.getInt16(0x1b88a + index * 2,true) !== controller) index++;
  if (index >= count || index !== 0) return;
  if (get(0x84) && host.wormState(get(0x3c),get(0x4c)) !== 100) {
    if (host.weapon) host.weapon(queue);
    else nativeCollectWeaponInput(memory,queue,host);
  }
  if (!get(0xac) && host.wormState(get(0x3c),get(0x4c)) !== 100) {
    if (host.movement) host.movement(queue);
    else nativeCollectMovementInput(memory,queue,host);
  }
}

// Full00501FF0 with004AAAB0 key classification. Query0x7D3's word at1C
// chooses the alternate confirm binding alongside rope/parachute worm states.
export function nativeCollectMenuInput(memory, sceneMemory, queue, host) {
  const body = new DataView(memory.buffer, memory.byteOffset, memory.byteLength);
  const scene = new DataView(sceneMemory.buffer, sceneMemory.byteOffset, sceneMemory.byteLength);
  const get = offset => body.getInt32(offset,true);
  const team = get(0x3c), controller = get(0xf0), count = scene.getInt16(0x1b8aa,true);
  if (controller < 0 || count < 1 || scene.getInt16(0x1b88a,true) !== controller) return;
  const worm = host.lookup(2, ((get(0x3c) << 4) + get(0x4c)) | 0);
  const info = host.wormQuery(worm,0x7d3,0x154);
  const state = host.wormState(get(0x3c),get(0x4c));
  const view = new DataView(info.buffer,info.byteOffset,info.byteLength);
  const key = [0x78,0x7b,0x7c,0x7d].includes(state) || view.getInt32(0x1c,true) ? 0x1d : 0x1b;
  const payload = new Uint8Array(4);
  new DataView(payload.buffer).setInt32(0,team,true);
  if (get(0x78)) {
    if (host.key(key)) {
      if (!get(0x108)) { host.consume(key); queue.writeEvent(0x414,payload); }
    } else body.setInt32(0x108,0,true);
  }
  if (!get(0x74)) return;
  if (host.key(0x22)) queue.writeEvent(0x415,payload);
  if (host.key(0x23)) queue.writeEvent(0x416,payload);
}
// Full00502220. Preserve key consumption and latch changes even when the
// replay ring rejects a command. State is queried again after primary input.
export function nativeCollectMovementInput(memory, queue, host) {
  const body = new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const get = offset => body.getInt32(offset,true);
  const special = state => [0x78,0x7b,0x7c,0x7d].includes(state);
  const payload = new Uint8Array(4);
  new DataView(payload.buffer).setInt32(0,get(0x3c),true);
  const emit = event => queue.writeEvent(event,payload);
  const latch = value => body.setInt32(0x108,value,true);
  const state = host.wormState(get(0x3c),get(0x4c));
  if (get(0xac) || get(0xe4)) return;
  const primary = special(state) ? 0x1d : 0x1b;
  if (state === 0x73 || get(0x64)) {
    if (state === 0x73 || special(state) || state === 0x79) {
      if (host.key(primary)) { emit(0x40e);emit(0x40f);host.consume(primary); }
    } else if (host.key(primary)) {
      if (!get(0x108)) { emit(0x40e);latch(1); }
    } else if (get(0x108)) { emit(0x40f);latch(0); }
  }
  const secondary = special(host.wormState(get(0x3c),get(0x4c))) ? 0x1b : 0x1d;
  if (secondary === 0x1b && get(0x108) && host.key(0x1b)) { host.consume(0x1b);latch(0); }
  if (host.key(secondary)) { emit(0x40c);host.consume(secondary); }
  if (host.key(0x28)) { host.consume(0x28);emit(0x40d); }
  for (const [key,event] of [[0x24,0x408],[0x25,0x409],[0x22,0x406],[0x23,0x407]]) {
    if (host.key(key)) emit(event);
  }
  if (!host.wormBusy(get(0x3c),get(0x4c)) && host.key(0x1a)) { emit(0x42b);host.consume(0x1a); }
}

// Full00502550 and004E8590. Weapon selection queues a command; it does not
// change the equipped slot while the remaining category keys are collected.
export function nativeCollectWeaponInput(memory, queue, host) {
  const body = new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const get = offset => body.getInt32(offset,true);
  if (get(0x50) || host.wormBusy(get(0x3c),get(0x4c)) || get(0x74) || get(0x78)) return;
  const emit = (event,words) => {
    const payload = new Uint8Array(words.length*4), view = new DataView(payload.buffer);
    words.forEach((word,index)=>view.setInt32(index*4,word,true));
    queue.writeEvent(event,payload);
  };
  for (let category=1;category<=12;category++) {
    const key = category+13;
    if (!host.key(key)) continue;
    host.consume(key);
    const slots = [];
    for (let slot=1;slot<71;slot++) {
      if (host.weaponAvailable(get(0x3c),slot) && host.weaponCategory(slot) === category) slots.push(slot);
    }
    if (!slots.length) continue;
    const selected = slots[(slots.indexOf(get(0x64))+1)%slots.length];
    emit(0x41b,[get(0x3c),get(0x4c),selected,1]);
  }
  const mode = get(0x8c) ? 0x417 : get(0xa0) ? 0x418 : 0;
  if (mode) {
    const team = get(0x3c), worm = get(0x4c);
    for (let i=0;i<5;i++) {
      if (host.key(i+5)) { emit(mode,[team,worm,i+(mode===0x418?1:0)]);host.consume(i+5); }
    }
  }
  if (!get(0x90)) return;
  const team = get(0x3c), worm = get(0x4c);
  if (host.key(0x1f) || host.key(0x20)) {
    emit(0x419,[team,worm,0]);host.consume(0x1f);host.consume(0x20);
  } else if (host.key(0x21) || host.key(0x1e)) {
    emit(0x419,[team,worm,1]);host.consume(0x21);host.consume(0x1e);
  }
}

// 004E5E30/004E5EE0 acquire/release the arsenal's priority-2 pointer owner.
// Lists contain signed shorts, including the free-list stack and counts.
function nativeArsenalOwnership(body, scene, open) {
  const get = offset => body.getInt32(offset,true);
  const short = offset => scene.getInt16(offset,true);
  const put = (offset,value) => scene.setInt16(offset,value,true);
  body.setInt32(0xe4,open?1:0,true);
  const owner = get(0xf4), count = short(0x1b7da);
  if (open) {
    if (owner >= 0) return;
    const freeCount = short(0x1b798);
    if (!freeCount) { body.setInt32(0xf4,-1,true);return; }
    put(0x1b798,freeCount-1);
    const id = short(0x1b778+(freeCount-1)*2);
    let index=0;
    while(index<count && short(0x1b79a+index*2)>=3)index++;
    for(let i=count;i>index;i--) {
      put(0x1b79a+i*2,short(0x1b79a+(i-1)*2));
      put(0x1b7ba+i*2,short(0x1b7ba+(i-1)*2));
    }
    put(0x1b79a+index*2,2);put(0x1b7ba+index*2,id);
    put(0x1b7da,count+1);body.setInt32(0xf4,id,true);
  } else {
    if(owner<0 || count<=0)return;
    let index=0;while(index<count && short(0x1b7ba+index*2)!==owner)index++;
    if(index===count)return;
    const freeCount=short(0x1b798);
    put(0x1b778+freeCount*2,owner);put(0x1b798,freeCount+1);
    for(let i=index;i<count-1;i++) {
      put(0x1b79a+i*2,short(0x1b79a+(i+1)*2));
      put(0x1b7ba+i*2,short(0x1b7ba+(i+1)*2));
    }
    body.setInt32(0xf4,-1,true);put(0x1b7da,count-1);
  }
}

// Full00501370 including005011F0 and004E5340. Pointer reset operations
// remain explicit device interfaces; UI ownership and cursor state are native.
export function nativeCollectPointerInput(memory,sceneMemory,queue,host) {
  const body = new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const scene = new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const get = offset => body.getInt32(offset,true);
  const firstOwner = (start,count,id) => scene.getInt16(count,true)>0 && scene.getInt16(start,true)===id;
  if(get(0xec)<0 || host.wormBusy(get(0x3c),get(0x4c)))return;
  if(!firstOwner(0x1b822,0x1b842,get(0xec)))return;
  if(!get(0xe4)) {
    if(host.wormBusy(get(0x3c),get(0x4c)) || get(0xe4) || !get(0x84) || get(0x50))return;
    const {buttons}=host.pointerSample();
    const state=host.wormState(get(0x3c),get(0x4c));
    if(state===100 || !(buttons&2))return;
    let slot=1;while(slot<71 && !host.weaponAvailable(get(0x3c),slot))slot++;
    if(slot===71)return;
    host.pointerResetA();host.pointerResetB();
    nativeArsenalOwnership(body,scene,true);body.setInt32(0xd8,65536,true);
    return;
  }
  if(!firstOwner(0x1b7ba,0x1b7da,get(0xf4)))return;
  const {dx,dy,buttons}=host.pointerSample();
  host.pointerResetA();host.pointerResetB();
  // Keys are still queried when right-click already requests closing.
  const keyClose=[0x1d,0x1b,0x22,0x23,0x24,0x25,0x28,0x1a].some(key=>host.key(key));
  if((buttons&2) || keyClose) {
    nativeArsenalOwnership(body,scene,false);body.setInt32(0xd8,0,true);return;
  }
  for(const [offset,delta,limit,copy] of [[0x1246c,dx,0xc0,0x12474],[0x12470,dy,0xc4,0x12478]]) {
    const value=Math.min(Math.max(0,(scene.getInt32(offset,true)+(delta<<16))|0),get(limit)<<16);
    scene.setInt32(offset,value,true);scene.setInt32(copy,value,true);
  }
  if(!queue || !(buttons&1))return;
  host.sound(get(0x118)?0x77:0x78,8,65536,65536,0);
  if(get(0x118)) {
    const payload=new Uint8Array(16),view=new DataView(payload.buffer);
    [get(0x3c),get(0x4c),get(0x118),1].forEach((value,i)=>view.setInt32(i*4,value,true));
    queue.writeEvent(0x41b,payload);
  }
}
