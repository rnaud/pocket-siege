import {nativeCrateContentPool} from './crate-content-pool.js';

//0049D47A..0049DB9A. Scene/world constructors supply geometry and initial
//pool lengths. Mode configuration is the original interface call at49DB4C.
export function nativeInitializeMatchState(scene,configureMode) {
  const view=new DataView(scene.buffer,scene.byteOffset,scene.byteLength);
  const get=o=>view.getInt32(o,true),put=(o,v)=>view.setInt32(o,v,true);
  for(const offset of [0x1b90,0x7f0,0x7f8,0x7fc,0x800,0x7f4,0x1ac4,0x1ac8,0x81c,0x810,0x1ab8,0x1abc,0x1ac0,0x820])put(offset,0);
  put(0x7ec,0x700);put(0x1acc,get(0x11b98));put(0x1ad0,get(0x11b98));
  put(0x804,Math.trunc(Math.imul((100-get(0x1b8b0))|0,0x2b8)/100));
  put(0x808,(get(0x1b8d8)>>16)+40);
  put(0x1b8d8,(get(0x804)+160)<<16);
  if(((get(0x1b8d8)-get(0x1b8d4))&0xffff0000)<0x3000000)put(0x1b8d8,get(0x1b8d4)+0x3000000);
  put(0x808,(get(0x1b8d8)>>16)+40);put(0x80c,get(0x804));put(0x814,1);put(0x818,100);
  const append=(base,countOffset,capacity,value,amount)=>{
    if(amount<0 || ((get(countOffset)+amount)|0)>=capacity+1)return;
    for(let i=0;i<amount;i++){put(base+get(countOffset)*4,value);put(countOffset,get(countOffset)+1);}
  };
  append(0x1434,0x1474,16,0,5);append(0x1434,0x1474,16,1,1);
  let total=0;
  for(const [offset,kind] of [[0x11d52,1],[0x11d53,2],[0x11d54,4]]) {
    total+=scene[offset];append(0x1790,0x1920,100,kind,scene[offset]);
  }
  append(0x1790,0x1920,100,0,100-total);
  append(0x14c0,0x1500,16,0,1);append(0x14c0,0x1500,16,1,1);
  for(let kind=0;kind<4;kind++)append(0x1ad8,0x1b18,16,kind,1);
  put(0x1240c,1);put(0x12410,-1);put(0x12414,-1);
  put(0x1b770,scene[0x11eab]);put(0x1241c,get(0x11b98));put(0x1b8b8,scene[0x11eac]);
  for(const offset of [0x1cad4,0x12418,0x1b76c,0x12490,0x12420,0x12424,0x12428,0x1242c,0x12430,
    0x12474,0x12478,0x1246c,0x12470,0x12464,0x12460,0x12468,0x1b8f0,0x1b8f4,0x1b8b4,0x1b8c0,
    0x1be98,0x1c13c,0x1b8ec,0x12484,0x1248c,0x1c140,0x1c144,0x1c148,0x1c14c,0x1c150,
    0x1c154,0x1c158,0x1c15c,0x1c160,0x1c17c,0x1c180,0x1c184])put(offset,0);
  put(0x1b8bc,65536);put(0x1247c,0x3c00000);put(0x12480,0x15c0000);put(0x12488,65536);
  for(let i=0x14;i<=0x118;i+=0x14)put(0x12490+i,0);
  for(let i=4;i<=0x34;i+=4){put(0x1c0d0+i,0);put(0x1c104+i,0);}
  configureMode(scene[0x11d68]);
  const count=get(0x1668),initial=Array.from({length:count},(_,i)=>get(0x154c+i*4));
  const pool=nativeCrateContentPool(initial,{specialWeapons:scene[0x11d57],tall:get(0x1b8ac),
    environmentDisabled:scene[0x11d62],modeByte:scene[0x11d68],mode:get(0x20)},slot=>get(0x1260c+slot*0x208));
  for(let i=count;i<pool.length;i++)put(0x154c+i*4,pool[i]);
  put(0x1668,pool.length);
}
