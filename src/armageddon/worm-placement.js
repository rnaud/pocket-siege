import { nativeInitializePhysics } from "./physics-create.js";
//004D5A40 placement block: first terrain-only, then full native flags,
// retrying downward from the original coordinate until blocked or at water.
export function nativeInitializeWormPlacement(memory,x,y,deployment,water,collide) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const put=(o,v)=>body.setInt32(o,v,true),get=o=>body.getInt32(o,true);
  put(0x288,0x420cc6);put(0x40,2);
  const place=()=>{if(collide(x,y))return true;put(0x90,x);put(0x94,y);put(0xb8,0);return false;};
  place();put(0x40,get(0x288));put(0x78,0x9999);put(0x7c,0);
  put(0x60,Math.trunc(((Math.trunc(((x+y)|0)/256)|0)&65535)/20)+0xc000);
  put(0xb4,0x20000);put(0x4c,1);put(0x48,1);
  if(!deployment && (y>>16)<water) {
    do {if(place())break;y=(y+65536)|0;} while((y>>16)<water);
  }
}

// Numeric scene adapter shares the constructor's placement block. Task/resource
// ownership is supplied elsewhere; callers consume the resulting coordinates.
export function nativePlaceWormAt(x,y,water,friction,collide,memory=new Uint8Array(0x390)) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength),scene=new Uint8Array(0x11ba1);
  scene[0x11ba0]=friction;
  nativeInitializePhysics(memory,scene,2,3,{initializeTask:()=>{},registerPhysics:()=>{}});
  nativeInitializeWormPlacement(memory,x,y,false,water,(px,py)=>collide(px,py,{
    type:2,shape:3,flags:body.getInt32(0x40,true),enabled:body.getInt32(0x48,true),
    x:body.getInt32(0x90,true),y:body.getInt32(0x94,true),
  }));
  return {x:body.getInt32(0x90,true),y:body.getInt32(0x94,true),physics:{
    waterDrag:body.getInt32(0x60,true),tangent:body.getInt32(0x80,true),
    restitutionX:body.getInt32(0x78,true),restitutionY:body.getInt32(0x7c,true),
    skimScale:body.getInt32(0xb4,true),
  }};
}
