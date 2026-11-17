//004AAC50. Output order follows the native pointer arguments, which map to
// controller8C,90,94,98,9C,A4,A8,A0 in the weapon-selection event handler.
export const nativeWeaponInputOffsets=[0x8c,0x90,0x94,0x98,0x9c,0xa4,0xa8,0xa0];
export function nativeWeaponInputFlags(memory) {
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const get=o=>view.getInt32(o,true),flags=Array(8).fill(0),kind=get(0x68);
  const projectile=offset=>{
    if(!get(0x78+offset))flags[4]=1;
    if(!get(0xc4+offset))flags[0]=1;
    if(get(0xd8+offset))flags[6]=1;
    if(get(0xdc+offset)===1)flags[2]=1;
    else if(get(0xdc+offset)===2 && !get(0xe4+offset))flags[1]=1;
    if(get(0x128+offset)===1) {
      if(!get(0x188+offset))flags[0]=1;
      if(get(0x19c+offset))flags[6]=1;
      if(get(0x1a0+offset)===1)flags[2]=1;
      else if(get(0x1a0+offset)===2 && !get(0x1a8+offset))flags[1]=1;
    }
  };
  if(kind===1){if(get(0x70)===3)projectile(0);}
  else if(kind===2){if(get(0x6c))flags[7]=1;if(get(0x70)===2)projectile(0);}
  else if(kind===3) {
    if(get(0x84)===2)projectile(0x14);
    flags[5]=1;if(get(0x7c))flags[3]=1;else flags[2]=1;
  } else if(kind===4 && [10,17].includes(get(0x6c))){flags[5]=1;flags[2]=1;}
  return flags;
}
export function nativeApplyWeaponInputFlags(controller,descriptor) {
  const view=new DataView(controller.buffer,controller.byteOffset,controller.byteLength);
  nativeWeaponInputFlags(descriptor).forEach((value,i)=>view.setInt32(nativeWeaponInputOffsets[i],value,true));
}
