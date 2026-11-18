import {nativeAllocateEventRecord,nativeConsumeEventRecord,nativeContainsEventRecord} from './scene-buffers.js';
import {nativeSpriteFrame} from './animation.js';
const word=(m,p)=>m.byte(p)|(m.byte(p+1)<<8);

//00497BA0 only queries membership; it does not consume/free the cache record.
export function nativeReleaseSpriteBlock(memory,block) {
  return nativeContainsEventRecord(memory,memory.get(0x55e3c4),(block-4)>>>0);
}

//004AF6A0: invalidate the first descriptor owning an evicted cache block.
export function nativeInvalidateSpriteBlock(memory,sprite,block) {
  for(let i=0;i<word(memory,sprite+28);i++) {
    const slot=memory.get(sprite+24)+i*12+4;
    if(memory.get(slot)===block){memory.put(slot,0);return;}
  }
}
//00497B20: the shared circular cache stores the owning sprite before its data.
export function nativeAllocateSpriteBlock(memory,sprite,size) {
  let record;
  for(;;) {
    record=nativeAllocateEventRecord(memory,memory.get(0x55e3c4),(size+4)|0);
    if(record)break;
    const head=memory.get(memory.get(0x55e3c4)+24);
    if(head){nativeInvalidateSpriteBlock(memory,memory.get(head+8),head+12);nativeConsumeEventRecord(memory,memory.get(0x55e3c4));}
  }
  memory.put(record,sprite);
  for(const address of [0x7d54e8,0x7d54ec])memory.put(address,memory.get(address)+size);
  return record+4;
}
//004AB3C9: map literals once; overlapping back references copy mapped pixels.
export function nativeDecodeSpriteBlock(memory,destination,source,mapping) {
  for(;;) {
    const command=memory.byte(source++);
    if(!(command&128)){memory.putByte(destination++,memory.byte(mapping+command));continue;}
    const length=(command>>>3)&15;
    let distance=((command&7)<<8)|memory.byte(source++);
    if(!length&&!distance)return;
    const run=length?length+2:memory.byte(source++)+18;
    if(length)distance++;
    for(let i=0;i<run;i++){memory.putByte(destination,memory.byte(destination-distance));destination++;}
  }
}
//00492D60: a borrowed bitmap may be rebound without owning its pixels.
export function nativeRebindSpriteBitmap(memory,bitmap,width,height,pixels,pitch) {
  if(!memory.get(bitmap+4))return 0;
  for(const [offset,value] of [[20,width],[24,height],[8,pixels],[16,pitch],[36,width],[28,0],[32,0],[40,height]])memory.put(bitmap+offset,value);
  return 1;
}
//004AFB00: normalized progress selects the crop and its canvas-center anchor.
export function nativeSelectSpriteFrame(memory,sprite,progress,outputs) {
  memory.put(sprite+52,nativeSpriteFrame(word(memory,sprite+14),word(memory,sprite+12),progress));
  const frame=()=>memory.get(sprite+20)+Math.imul(memory.get(sprite+52),12);
  const signed=p=>word(memory,p)<<16>>16;
  let value=signed(frame()+8)-signed(frame()+4);memory.put(outputs[0],value);memory.put(sprite+56,value);
  value=signed(frame()+10)-signed(frame()+6);memory.put(outputs[1],value);memory.put(sprite+60,value);
  memory.put(outputs[4],0);memory.put(outputs[5],0);
  memory.put(outputs[2],(word(memory,sprite+8)>>>1)-signed(frame()+4));
  memory.put(outputs[3],(word(memory,sprite+10)>>>1)-signed(frame()+6));
  return 1;
}
//004AFA30: decode on first use, then point the bitmap wrapper at the crop.
export function nativePrepareSpriteBitmap(memory,sprite,host={}) {
  const frame=()=>memory.get(sprite+20)+Math.imul(memory.get(sprite+52),12);
  let pixels;
  if(memory.byte(sprite+17)&64) {
    const offset=(memory.get(frame())>>24)*12,descriptor=memory.get(sprite+24)+offset;
    if(!memory.get(descriptor+4)) {
      const size=memory.get(descriptor+8);
      const block=host.allocateSpriteBlock?host.allocateSpriteBlock(memory.get(sprite+64),sprite,size):nativeAllocateSpriteBlock(memory,sprite,size);
      memory.put(descriptor+4,block);
      const current=memory.get(sprite+24)+offset;
      nativeDecodeSpriteBlock(memory,memory.get(current+4),memory.get(sprite+40)+memory.get(current),memory.get(sprite+44));
    }
    pixels=(memory.get(frame())&0xffffff)+memory.get(memory.get(sprite+24)+offset+4);
  } else pixels=memory.get(frame())+memory.get(sprite+40);
  const bitmap=memory.get(sprite+32),width=memory.get(sprite+56),height=memory.get(sprite+60);
  if(host.rebindSpriteBitmap)host.rebindSpriteBitmap(bitmap,width,height,pixels,width);
  else nativeRebindSpriteBitmap(memory,bitmap,width,height,pixels,width);
  return memory.get(sprite+32);
}
