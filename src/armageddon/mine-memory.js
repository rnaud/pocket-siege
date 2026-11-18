import {nativeCreatePhysicsAt} from './physics-memory.js';
import {nativeClaimPresentationSlot} from './presentation-slot-memory.js';
import {nativeQueryCollisionMemory} from './collision-registry.js';
import {nativeCreatePanelText} from './panel-resources.js';
import {nativeSurfaceSlope} from './surface-slope.js';
import {nativeSlopeTurn} from './direction.js';

//004E9A40. Replacement effect and task destruction remain explicit services.
export function nativeRegisterMineAt(memory,address,host) {
  const scene=memory.get(address+0x38);let slot=0;
  while(slot<24&&memory.get(scene+0x450+slot*4))slot++;
  if(slot===24) {
    slot=0;
    for(let i=1;i<24;i++)if((memory.get(memory.get(scene+0x450+i*4)+0xfc)|0)<(memory.get(memory.get(scene+0x450+slot*4)+0xfc)|0))slot=i;
    const previous=memory.get(scene+0x450+slot*4),color=memory.byte(memory.get(previous+0x38)+0x3cd1+memory.get(address+0x144)*3000);
    host.mineReplacementEffect([0,memory.get(previous+0x90)|0,memory.get(previous+0x94)|0,0,0,0,0,0,0x30a+color,0,65536,0xccc]);
    host.deleteTask(previous,1);
  }
  memory.put(scene+0x450+slot*4,address);memory.put(address+0x100,slot);memory.put(address+0xfc,memory.get(scene+0x7f0));
}

//004E9400 with original ownership, numeric fields, placement, text and slots.
export function nativeCreateMineAt(memory,address,parent,record,payload,settle,placed,host) {
  nativeCreatePhysicsAt(memory,address,parent,10,2,host);
  memory.put(address,0x527300);memory.put(address+0x2c,8);
  record.forEach((v,i)=>memory.put(address+0x170+i*4,v));payload.forEach((v,i)=>memory.put(address+0x144+i*4,v));
  const scene=memory.get(address+0x38),environment=memory.get(scene+0x7d4);
  memory.put(address+0x110,nativeClaimPresentationSlot(memory,scene));
  for(const [offset,value] of [[0x104,1],[0x128,0],[0x108,0],[0x124,record[6]],[0x114,record[2]],[0x11c,record[1]],[0x118,record[3]],[0x140,0],[0x130,0],[0x134,0],[0x10c,0],[0x138,0],[0x40,2],[0x120,record[0]],[0x12c,Math.trunc((record[3]|0)/250)],[0x13c,placed]])memory.put(address+offset,value);
  const collide=(x,y)=>nativeQueryCollisionMemory(memory,environment,address,x,y,memory.get(address+0xf0),memory.get(address+0x40),host.collisionOverlap);
  const place=(x,y)=>{if(collide(x,y))return true;memory.put(address+0x90,x);memory.put(address+0x94,y);memory.put(address+0xb8,0);return false;};
  const x=payload[2]|0,y=payload[3]|0;place(x,y);
  for(const [offset,value] of [[0x9c,payload[4]],[0xa0,payload[5]],[0x40,0x421846],[0x80,0],[0x58,65536],[0x4c,0],[0x48,1],[0x60,Math.trunc((Math.trunc(((x+y)|0)/256)&65535)/20)+0xcccc],[0x78,0x9999],[0x7c,0x9999]])memory.put(address+offset,value);
  if((record[1]|0)<=0){memory.put(address+0x4c,1);memory.put(address+0x80,Math.trunc((memory.byte(scene+0x11ba0)<<16)/100));}
  if(settle) {
    let py=(y+65536)|0;
    while((py>>16)<(memory.get(scene+0x804)|0)){if(place(x,py))break;py=(py+65536)|0;}
    const body={flags:memory.get(address+0x40)};
    const slope=nativeSurfaceSlope(body,x,py,4,(px,py,state)=>{memory.put(address+0x40,state.flags);return collide(px,py);});
    memory.put(address+0x40,body.flags);
    if(slope!==null)memory.put(address+0x98,nativeSlopeTurn(slope)&65535);
  }
  const text=host.allocate(0x138);memory.put(address+0x190,text?nativeCreatePanelText(memory,text,memory.get(scene+8),15,16,host):0);
  nativeRegisterMineAt(memory,address,host);return address;
}
