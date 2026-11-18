import {nativeInitializeWorldPresentation} from './world-presentation-create.js';
import {nativeInitializeMatchResources} from './match-resources.js';
import {nativeInitializeReplayPresentationAt} from './replay-presentation-restore.js';
import {nativeCreateEventBufferMemory} from './scene-buffers.js';
import taskTypes from './replay-task-types.json' with {type:'json'};
import {nativeCreatePanelText,nativeCreatePanelImage} from './panel-resources.js';
import {nativeInitializeControllerResources} from './controller-resources.js';
import {nativeCreateControllerPortrait,nativeCreateControllerFrame} from './controller-visual-resources.js';
import {nativeBodyStartSound} from './body-sound.js';
import {nativeInitializeWormResourcesAt} from './worm-resources.js';
import {nativeRegisterPhysicsMemory} from './physics-memory.js';
import {nativeCreateTaskMemory,nativeRegisterTaskMemory} from './task-memory.js';
import {nativeReadTaskChildren} from './replay-restore.js';

//004B1DE0 uses the same owned arrays, parent attachment and registry creation
//as fresh004B1AE0, then restores byte-sized identities before child dispatch.
export function nativeReadTaskMemory(memory,address,parent,stream,host) {
  nativeCreateTaskMemory(memory,address,parent,host);
  stream.readByte();
  memory.put(address+0x2c,stream.readByte());
  const type=stream.readByte(),index=stream.readByte();
  if(type)nativeRegisterTaskMemory(memory,address,type,index,host);
  //The original base constructor ignores the recursive factory return value.
  nativeReadTaskChildren(stream,address,size=>host.allocate(size)||null,
    (schema,child,parent,reader)=>host.restoreChild(schema,child,parent,reader));
  return address;
}

//004ED9A0/004F42D0: restore body fields, rejoin sparse collision lists,
//then allocate saved contact storage before clearing membership indices.
export function nativeReadPhysicsMemory(memory,address,parent,context,stream,host) {
  nativeReadTaskMemory(memory,address,parent,stream,host);
  memory.put(address,0x527478);stream.readByte();memory.put(address+0x38,context);
  memory.put(address,0x527548);stream.readByte();
  memory.range(address+0x3c,0xb0).set(stream.readBlock(0xb0));
  for(const offset of [0xec,0xf4,0xf8,0xf0])memory.put(address+offset,0);
  nativeRegisterPhysicsMemory(memory,memory.get(context+0x7d4),address,host);
  if(memory.get(address+0xc8)) {
    const contacts=host.allocateArray(0x200,0x56f7b8);memory.put(address+0xf8,contacts);
    const size=memory.get(address+0xdc)<<3;memory.range(contacts,size).set(stream.readBlock(size));
  }
  memory.put(address+0xe4,-1);memory.put(address+0xe8,-1);
  return address;
}

//004D6240/004FD330: full saved worm and animation state, team inventory
//pointer and the same presentation resource ownership as fresh construction.
export function nativeReadWormMemory(memory,address,parent,context,stream,host) {
  nativeReadPhysicsMemory(memory,address,parent,context,stream,host);
  memory.put(address,0x526de0);stream.readByte();
  memory.range(address+0xfc,0x23c).set(stream.readBlock(0x23c));
  const animation=host.allocate(0x164);
  if(animation) {
    memory.put(animation,0x527670);stream.readByte();
    memory.range(animation+8,0x15c).set(stream.readBlock(0x15c));
    memory.put(animation+4,memory.get(context+8));
  }
  memory.put(address+0x350,animation);
  const team=memory.get(address+0x170);
  memory.put(address+0x354,team?context+0x125bc+Math.imul(team,0x208):0);
  nativeInitializeWormResourcesAt(memory,address,context,host);
  return address;
}

//Concrete readers include saved blocks whose writers intentionally emit nothing.
const restoreOnlyBlocks={13:[0x3c,0xc04],16:[0x3c,0x24],22:[0x3c,0x28],27:[0x3c,0x1c],29:[0x3c,0x28]};
function nativeReplayChildHost(memory,context,host) {
  return host.restoreChild?host:{...host,restoreChild:(schema,child,parent,reader)=>nativeReadActorMemory(memory,schema.tag,child,parent,context,reader,host)};
}
export function nativeReadActorMemory(memory,tag,address,parent,context,stream,host) {
  host=nativeReplayChildHost(memory,context,host);
  if(tag===18)return nativeReadWormMemory(memory,address,parent,context,stream,host);
  const schema=taskTypes.find(row=>row.tag===tag);
  if(!schema)throw new RangeError(`Addressed replay constructor not connected: ${tag}`);
  if(schema.physics)nativeReadPhysicsMemory(memory,address,parent,context,stream,host);
  else {
    nativeReadTaskMemory(memory,address,parent,stream,host);
    memory.put(address,0x527478);stream.readByte();memory.put(address+0x38,context);
  }
  if(tag===31) {
    memory.put(address,0x527518);memory.put(address+0xd0,65536);memory.put(address+0x40,0);memory.put(address+0xc4,0);memory.put(address+0x3c,0x12345678);
  }
  memory.put(address,Number(schema.vtable));
  const get=offset=>memory.get(address+offset)|0,put=(offset,value)=>memory.put(address+offset,value);
  const increment=offset=>memory.put(context+offset,memory.get(context+offset)+1);
  const counter={16:0x12424,22:0x12428,27:0x12420}[tag];if(counter)increment(counter);
  stream.readByte();const [offset,size]=restoreOnlyBlocks[tag]??schema.block;
  memory.range(address+offset,size).set(stream.readBlock(size));
  const constructText=host.constructText??((at,...args)=>nativeCreatePanelText(memory,at,...args,host));
  const text=(offset,font,width)=>{const at=host.allocate(0x138);put(offset,at?constructText(at,memory.get(context+8),font,width):0);};
  if(tag===8) {memory.put(context+0x450+get(0x100)*4,address);text(0x190,15,16);}
  else if(tag===10)nativeInitializeControllerResources(memory.range(address,schema.size),{
    allocateResource:size=>host.allocate(size),context,renderer:memory.get(context+8),
    palette:Array.from({length:9},(_,i)=>memory.get(context+0x12434+i*4)),constructText,
    constructPortrait:host.constructPortrait??((at,...args)=>nativeCreateControllerPortrait(memory,at,...args,host)),
    constructFrame:host.constructFrame??((at,...args)=>nativeCreateControllerFrame(memory,at,...args,host)),
  });
  else if(tag===11) {
    text(0x3d0,15,48);text(0x3cc,15,16);put(0x3d8,0);put(0x3d4,0);
    if(get(0x31c)) {
      const device=memory.get(context+12);
      put(0x3d8,nativeBodyStartSound(memory.get(context+0x1d448),device?{start:(...args)=>host.startSound(device,...args)}:null,[get(0x31c),4,65536,65536,0]));
    }
    put(0x3dc,(get(0x140)+Math.trunc(((get(0x138)+get(0x13c))|0)/25)+get(0x144))&65535);
  } else if(tag===15) {
    put(0x264,0);text(0x268,15,256);text(0x26c,15,48);text(0x270,15,48);
    if(get(0x260))increment(get(0x124)===3?0x1b8f4:0x1b8f0);increment(0x1242c);
  } else if(tag===24) {
    memory.put(context+0x4b0+get(0x80)*4,address);put(0xb0,memory.get(context+0x12430)&255);increment(0x12430);put(0xb4,0);
  } else if(tag===28)nativeInitializeReplayPresentationAt(memory,address,context,host);
  else if(tag===29)text(0x64,23,48);
  else if(tag===31) {
    put(0x2dc8,0);const queue=host.allocate(8);
    put(0x2dc4,queue?nativeCreateEventBufferMemory(memory,queue,256,host):0);
    const table=host.allocate(16);
    if(table){memory.put(table,0x526918);memory.put(table+8,71);memory.put(table+12,host.allocateArray(568,0x567600));memory.put(table+4,0);}
    put(0x2dcc,table);put(0x2dd0,0);
  }
  return address;
}

//004B2D40/004EADB0: recursively restore the world before recreating its
//transient presentation children and match resources in the original order.
export function nativeReadRootMemory(memory,address,context,stream,host) {
  host=nativeReplayChildHost(memory,context,host);
  nativeReadTaskMemory(memory,address,0,stream,host);
  memory.put(address,0x527478);stream.readByte();memory.put(address+0x38,context);
  memory.put(address,0x527458);stream.readByte();
  memory.range(address+0x3c,0x5c).set(stream.readBlock(0x5c));
  nativeInitializeWorldPresentation(memory,address,host);
  memory.put(address,0x526720);stream.readByte();
  memory.range(address+0xd8,0x138).set(stream.readBlock(0x138));
  nativeInitializeMatchResources(memory.range(address,0x28c),memory.range(context,0x20000),{
    allocateResource:size=>host.allocate(size),renderer:memory.get(context+8),
    constructText:host.constructText??((at,...args)=>nativeCreatePanelText(memory,at,...args,host)),
    constructSurface:(at,...args)=>{(host.constructSurface??((at,...args)=>nativeCreatePanelImage(memory,at,...args,host)))(at,...args);memory.put(at,0x5249b0);},
  });
  return address;
}
