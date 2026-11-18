"""Execute playback entry composed with complete native snapshot reconstruction."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('executable', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--physics',action='store_true')
parser.add_argument('--water-sounds',action='store_true')
parser.add_argument('--contacts',action='store_true')
parser.add_argument('--masks',action='store_true')
args = parser.parse_args()
if args.masks:args.contacts=True
if args.contacts:args.water_sounds=True
if args.water_sounds:args.physics=True
data = args.executable.read_bytes()
digest = hashlib.sha256(data).hexdigest()
if digest != '0bf49876be886c8d213b8e28c761dbbfa5e030da38344cb6af9a2f162186ab56':
    parser.error('Executable differs from verified WA 3.0.0.0')
pe = struct.unpack_from('<I',data,0x3c)[0]
optional = pe+24
base = struct.unpack_from('<I',data,optional+28)[0]
size = struct.unpack_from('<I',data,optional+56)[0]
cpu = Uc(UC_ARCH_X86, UC_MODE_32)
cpu.mem_map(base,(size+0xfff)&~0xfff)
cpu.mem_write(base,data[:struct.unpack_from('<I',data,optional+60)[0]])
headers = optional+struct.unpack_from('<H',data,pe+20)[0]
for i in range(struct.unpack_from('<H',data,pe+6)[0]):
    _,rva,size,offset=struct.unpack_from('<IIII',data,headers+40*i+8)
    if size: cpu.mem_write(base+rva,data[offset:offset+size])
owner, stack, stop = 0x2000000, 0x2100000, 0x2200000
for address in [owner, stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000

import itertools,base64,zlib
stream=owner+0x1000;buffer=owner+0x2000;context=owner+0x20000
cpu.mem_map(context,0x20000)
write(stream+4,buffer);write(stream+8,32768);write(stream+0x14,context);write(context+8,0x7654321)
devices=0x2600000
cpu.mem_map(devices,0x10000)
write(devices,devices+0x100);write(devices+0x13c,stop+0x300)
channels=0x2700000;cpu.mem_map(channels,0x10000)
inputQueue=channels;recordQueue=channels+0x100
write(devices+0x13c,stop+0x300)
for offset,target in [(0x30,0x350),(0x34,0x390),(0x40,0x360),(0x44,0x380),(0x48,0x370)]:write(devices+0x100+offset,stop+target)
for offset,target in [(0x1c,0x320),(8,0x330),(12,0x340)]:write(devices+0x300+offset,stop+target)
write(devices+0x200,devices+0x300);write(devices+0x32c,stop+0x310)
heapBase=0x2400000
cpu.mem_map(heapBase,0x40000)
heap=heapBase;allocations=[];taskAllocations=[];objects=[];buffers=[];calls=[];allocationCalls=[];fail=-1;mode=0;cleanupMode=0
manager=owner+0x800;oldRoot=owner+0x400
environment=0x2500000
cpu.mem_map(environment,0x10000)
write(context+0x7d4,environment);write(environment,environment+0x1000);write(environment+0x1034,0x4c8f80);write(environment+0x3c0,environment+0x2000);write(environment+0x2000+0x3a4,17)

if args.contacts:
 write(devices+0x310,stop+0x410);write(devices+0x328,stop+0x420)
contactCounts={'overlap':0,'start':0,'stop':0,'contact':0,'bounce':0,'step':0}
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
childHandlers={read(int(row['vtable'],16)+8) for row in json.loads(Path('src/armageddon/replay-task-types.json').read_text())}|{read(0x5277e0+8)}
def hook(cpu,address,size,user):
 global heap
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4924d0,0x492550]:
  size=read(sp+(8 if address==0x4924d0 else 4));pointer=heap;caller=read(sp)
  resource=address==0x492550 and (0x4eaf40<=caller<0x4eb100 or 0x4b2ea0<=caller<0x4b3110)
  objectAllocation=address==0x492550 and 0x4a1d20<=caller<0x4a1e10
  if objectAllocation and ((mode==1 and size==0x28c) or mode==2):pointer=0
  elif resource and len(allocations)==fail:pointer=0
  else:
   heap+=(size+15)&~15;cpu.mem_write(pointer,bytes(size))
  allocationCalls.append(['array',size,read(sp+4),pointer] if address==0x4924d0 else ['allocate',size,pointer])
  if objectAllocation:objects.append({'size':size,'pointer':pointer})
  if address==0x4924d0 and (0x4c8d10<=caller<0x4c8d60 or 0x4c8e40<=caller<0x4c8ee0):buffers.append(size)
  if resource:allocations.append({'size':size,'pointer':pointer})
  if address==0x492550 and 0x4b2230<=caller<0x4b2670:taskAllocations.append({'size':size,'pointer':pointer})
  ret(pointer)
 elif address in [stop+0x200,stop+0x210,stop+0x220,stop+0x230]:
  calls.append([address,cpu.reg_read(UC_X86_REG_ECX)]+([read(sp+4)] if address in [stop+0x210,stop+0x230] else []))
  if address==stop+0x200 and cleanupMode&1:write(manager+4,0)
  if address==stop+0x220 and cleanupMode&2:write(context+0x7d4,0)
  ret(0,4 if address in [stop+0x210,stop+0x230] else 0)
 elif address==stop+0x300:calls.append(['ready']);ret(1)
 elif address==stop+0x310:calls.append(['audioReset']);ret()
 elif address in [stop+0x320,stop+0x330,stop+0x340]:
  if address==stop+0x320:calls.append(['volume',signed(read(sp+4))]);ret(0,4)
  elif address==stop+0x330:calls.append(['speed',read(sp+4)]);ret(0,4)
  else:calls.append(['sound']+[signed(read(sp+4+i*4)) for i in range(5)]);ret(0,20)
 elif address in [stop+0x350,stop+0x360,stop+0x370,stop+0x380,stop+0x390]:
  offset={0x350:0x30,0x360:0x40,0x370:0x48,0x380:0x44,0x390:0x34}[address-stop]
  calls.append(['device',offset]);ret({0x30:1,0x48:17}.get(offset,0))
 elif address in childHandlers and read(sp+8)==0x3e9:
  calls.append(['child',cpu.reg_read(UC_X86_REG_ECX),read(sp+4),read(sp+8),read(sp+12)]);ret(0,16)
 elif address==0x4ca320:
  calls.append(['body',cpu.reg_read(UC_X86_REG_ECX),read(sp+4),read(sp+8)])
  if not args.physics:ret(0,8)
 elif args.physics and address in [0x4f4fe0,0x4f4fc0]:
  if not args.water_sounds:
   calls.append(['waterChanged' if address==0x4f4fe0 else 'skim',cpu.reg_read(UC_X86_REG_ECX)]);ret()
 elif args.masks and address==0x4cc310:contactCounts['overlap']+=1
 elif args.masks and address in [stop+0x500,stop+0x510]:
  bitmap=cpu.reg_read(UC_X86_REG_ECX);dimensions=address==stop+0x500
  calls.append(['dimensions' if dimensions else 'storage',bitmap])
  values=[read(bitmap+4),read(bitmap+8)] if dimensions else [read(bitmap+12),1,read(bitmap+16)]
  for i,value in enumerate(values):write(read(sp+4+i*4),value)
  ret(0,len(values)*4)
 elif args.contacts and address in [0x4f4c30,0x4f4860,0x4d1260]:
  contactCounts[{0x4f4c30:'contact',0x4f4860:'bounce',0x4d1260:'step'}[address]]+=1
 elif args.contacts and address==stop+0x400:
  mask=cpu.reg_read(UC_X86_REG_ECX)
  values=[signed(read(sp+4+i*4)) for i in range(5)]
  calls.append(['overlap',mask]+values);contactCounts['overlap']+=1
  ret(int(values[0]>=signed(read(mask+4))+2 or values[1]>=signed(read(mask+8))+2),20)
 elif args.contacts and address==stop+0x410:
  values=[signed(read(sp+4+i*4)) for i in range(5)]
  calls.append(['impactStart']+values);contactCounts['start']+=1
  handle=read(devices+0x400)+1;write(devices+0x400,handle);ret(handle,20)
 elif args.contacts and address==stop+0x420:
  calls.append(['impactStop',signed(read(sp+4))]);contactCounts['stop']+=1;ret(1,4)
 elif address==0x4b4ce0:
  root=cpu.reg_read(UC_X86_REG_ECX);event,length,pointer=read(sp+8),read(sp+12),read(sp+16)
  if event==0x3ec:calls.append(['collect',root,event,length,read(pointer)==inputQueue])
  else:calls.append(['dispatch',root,event,list(cpu.mem_read(pointer,length)) if length else []])
  if event!=0x3e9:ret(0,16)
 elif address==0x4b7970:
  calls.append(['query',cpu.reg_read(UC_X86_REG_ECX),read(sp+4),read(sp+8)])
 elif address in [0x4b2a00,0x4ca7e0]:calls.append(['flushRoot' if address==0x4b2a00 else 'flushEnvironment',cpu.reg_read(UC_X86_REG_ECX)])
 elif address==0x49fc60:calls.append(['render']);ret()
 elif address==0x492510:allocationCalls.append(['free',read(sp+4)]);ret()
 elif address in [0x4c6610,0x492bc0]:
  pointer=cpu.reg_read(UC_X86_REG_ECX)
  calls.append([address,pointer]+[read(sp+4+i*4) for i in range(3)]);ret(pointer,12)
cpu.hook_add(UC_HOOK_CODE,hook)
def short(address,value):cpu.mem_write(address,struct.pack('<H',value&65535))
schemas={row['tag']:row for row in json.loads(Path('src/armageddon/replay-task-types.json').read_text())}
tags=[7,9,21,23,25,26,30]
def node(tag,children=[]):return {'tag':tag,'children':children}
trees=[[],[node(tag) for tag in tags],[node(7,[node(9,[node(21,[node(30)])]),node(25)])],[node(tags[i%7]) for i in range(20)],[node(23,[node(tags[i%7]) for i in range(18)])]]
cases=[]
combinations=[row+(0,) for row in itertools.product([0,7],trees,[0,1,2])]+[(0,trees[1],0,flag) for flag in [1,2,3]]
for initialPosition,tree,mode,cleanupMode,sound in [row+(sound,) for row in combinations if row[2]==0 for sound in [0,1]]:
 position=0;savedIndex=-1;environment=0x2500000
 heap=heapBase;allocations.clear();taskAllocations.clear();objects.clear();buffers.clear();calls.clear();allocationCalls.clear();cpu.mem_write(owner,bytes([0xa5])*0x28c)
 cpu.mem_write(context+0x1b778,bytes(0x168));write(context+0x1b8dc,320)
 for offset,storage in [(0x18,environment+0x3000),(0x34+2*0x1c,environment+0x4000)]:
  write(environment+offset+4,256);write(environment+offset+12,0);write(environment+offset+16,storage);write(environment+offset+20,storage+0x800)
  cpu.mem_write(storage,bytes(2048))
 cpu.mem_write(manager,bytes(0x2a4))
 for offset in [0x1240c,0x1b8ec,0x1cad4,0x1d428,0x1d42c,0x1d430,0x1d438,0x1d43c,0x1d440,0x1d448]:write(context+offset,0)
 cpu.mem_write(channels,bytes(0x10000))
 for wrapper,dataAddress in [(inputQueue,channels+0x1000),(recordQueue,channels+0x3000)]:
  ring=wrapper+32;write(wrapper,0x526544);write(wrapper+4,ring);write(ring,0x5266a0);write(ring+4,dataAddress);write(ring+8,4096)
  cpu.mem_write(dataAddress,bytes([0xcc])*4096)
 #Two initial playback records, including an ordinary event and frame boundary.
 ring=recordQueue+32;dataAddress=channels+0x3000
 for offset,value in [(12,28),(20,dataAddress+16),(24,dataAddress),(28,2)]:write(ring+offset,value)
 for offset,value in [(0,8),(4,dataAddress+16),(8,0x499),(12,0x04030201),(16,4),(20,0),(24,0x3ea)]:write(dataAddress+offset,value)
 write(manager+0x30,inputQueue);write(manager+0x34,recordQueue);write(0x561ec8,1234)
 write(manager+4,oldRoot);write(manager+0x2a0,context);write(context+0x7d4,environment)
 write(manager+8,stream);write(manager+0x26c,1);write(manager+0x270,-1)
 write(context+0x24,devices);write(context+0xc,devices+0x200 if sound else 0)
 write(context+0x12488,61604);write(context+0x7f0,12345678);write(context+0x1d434,99);write(context+0x1d444,0)
 cpu.mem_write(context+0x1c188,bytes([0xa5])*0x950)
 cpu.mem_write(context+0x1cad8,bytes((i*17+31)&255 for i in range(0x950)))
 write(context+0x7dc,owner+0xf000);write(owner+0xf000,0x526828);write(owner+0xf004,0)
 write(context+0x1d424,0) #Saved presentation has no queued sound requests.
 write(oldRoot,owner+0x500);write(owner+0x518,stop+0x200);write(owner+0x500,stop+0x210)
 write(environment+0x1018,stop+0x220);write(environment+0x1000,stop+0x230)
 write(context+0x3a4,17)
 payload=bytearray((i*17+len(tree))&255 for i in range(0x3fbc))
 if args.physics:struct.pack_into("<I",payload,0x1ac4-0x7ec,0)
 payload.append(33)
 while len(payload)%4:payload.append(255)
 payload.extend(struct.pack("<iii",179,0x3d70,0x1000) if args.physics else bytes(range(12)));payload.extend([6,1,6,26,0])
 def block(data):
  while len(payload)%4:payload.append(255)
  payload.extend(data)
 def emit(item):
  tag=item['tag'];schema=schemas[tag]
  payload.extend([tag,1,tag,26,0])
  for child in item['children']:emit(child)
  payload.extend([0,2])
  if schema['physics']:
   payload.append(3);body=bytearray((i*13+tag)&255 for i in range(0xb0))
   for offset,value in [(0x3c,2),(0x44,0),(0xc8,0),(0xdc,0),(0xe4,savedIndex),(0xe8,savedIndex)]:struct.pack_into('<I',body,offset-0x3c,value&0xffffffff)
   if args.physics:
    fields={0x40:0x400000,0x48:1,0x54:0,0x58:65536,0x5c:65536,0x60:0xcccc,0x64:0xf000,0x68:65536,0x6c:65536,
      0x90:(100+tag)<<16,0x94:(180 if tag in [9,21] else 160)<<16,0x98:0,0x9c:1000000 if tag==9 else 65536,0xa0:10000 if tag==9 else -65536,
      0xa4:0,0xb4:65536,0xb8:0,0xbc:0,0xc0:0,0xc4:0}
    for offset,value in fields.items():struct.pack_into('<I',body,offset-0x3c,value&0xffffffff)
   block(body)
  payload.append(tag);block(bytes((i*11+tag)&255 for i in range(schema['block'][1])))
 for item in tree:emit(item)
 payload.extend([0,2,5]);block(bytes((i*13)&255 for i in range(0x5c)))
 payload.append(6);block(bytes((i*17)&255 for i in range(0x138)))
 cpu.mem_write(buffer,bytes(payload));write(stream+0x10,initialPosition);write(stream+0xc,len(payload))
 def snapshot():return bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))+bytes(cpu.mem_read(heapBase,0x40000))+bytes(cpu.mem_read(0x2500000,0x10000))+bytes(cpu.mem_read(devices,0x10000))+bytes(cpu.mem_read(channels,0x10000))
 if args.masks:
  shape=next(row for row in json.loads(Path('tests/fixtures/armageddon/collision-mask.json').read_text())['cases'] if row['shape']==3)
  cpu.mem_write(owner+0xa000,bytes(0x3000))
  for offset,value in {0:owner+0xa180,4:1,12:shape['width'],16:shape['height'],20:shape['anchorX'],24:shape['anchorY']}.items():write(owner+0xa000+offset,value)
  write(owner+0xa18c,0x4cc310);write(owner+0xa114,stop+0x500);write(owner+0xa120,stop+0x510)
  for i,plane in enumerate(shape['planes']):
   bitmap=owner+0xa200+i*32;storage=owner+0xa600+i*256;stride=((plane['width']+31)//32)*4
   write(owner+0xa01c+i*4,bitmap)
   for offset,value in {0:owner+0xa100,4:plane['width'],8:plane['height'],12:storage,16:stride}.items():write(bitmap+offset,value)
   for x,y in plane['points']:
    address=storage+y*stride+(x//32)*4;write(address,read(address)|(1<<(x%32)))
 if args.contacts:write(devices+0x400,100)
 initial=snapshot();frames=[]
 for frame in range(23):
  if frame==16:
   #Exercise real cleanup after restore: a task hole and sparse physics holes.
   root=read(manager+4);write(root+16,1)
   if read(root+20)>1:write(read(root+24)+4,0)
   restoredEnvironment=read(context+0x7d4)
   for offset in [0x18,0x34+2*0x1c]:
    entry=restoredEnvironment+offset;write(entry+8,1)
    if read(entry+12):write(read(entry+16),0)
  if args.contacts and frame==16:
   if not args.masks:write(owner+0xb00c,stop+0x400)
   listing=read(context+0x7d4)+0x18
   for i in range(read(listing+12)):
    actor=read(read(listing+16)+i*4)
    if not actor:continue
    mask=owner+0xa000 if args.masks else owner+0xa000+i*16
    if not args.masks:write(mask,owner+0xb000);write(mask+4,100+i*8);write(mask+8,160)
    for offset,value in {0x40:4,0x4c:i%2,0x78:0x8000,0x7c:0x6000,0x80:0xc000,0x88:0x8000,
      0x90:(100+i*8)<<16,0x94:160<<16,0x9c:4<<16,0xa0:1<<16,0xf0:mask}.items():write(actor+offset,value)
  if args.water_sounds and initialPosition==7 and frame==17:
   write(context+0x1cad4,15)
   for i in range(15):
    for j,value in enumerate([0x39,0,65536,32768,0]):write(context+0x1c994+i*20+j*4,value)
  if frame==20:write(context+0x1d438,1)
  calls.clear();allocationCalls.clear()
  sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,manager)
  try:cpu.emu_start(0x4a30a0,stop+1,count=1000000)
  except Exception:
   print('fault',frame,hex(cpu.reg_read(UC_X86_REG_EIP)),hex(cpu.reg_read(UC_X86_REG_ECX)),calls[-5:]);raise
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('frame did not exit')
  frames.append(dict(sha256=hashlib.sha256(snapshot()).hexdigest(),calls=list(calls),allocations=list(allocationCalls),globalCounter=read(0x561ec8),root=read(manager+4),environment=read(context+0x7d4)))
 cases.append(dict(masks=args.masks,contacts=args.contacts,waterSounds=args.water_sounds,primedSounds=args.water_sounds and initialPosition==7,physics=args.physics,inputMemory=base64.b64encode(zlib.compress(initial)).decode(),sound=sound,clearRoot=bool(cleanupMode&1),clearEnvironment=bool(cleanupMode&2),frames=frames))
if args.contacts:
 assert all(contactCounts.values()),contactCounts
 print(contactCounts)
args.output.write_text(json.dumps(dict(executable_sha256=digest,contactCounts=contactCounts if args.contacts else None,method='26 original004A30A0 sequences of23 frames: populated snapshot reconstruction, fade completion, queued playback events, ordinary input/dispatch and recapture. Full640KiB memory and ordered allocator/root/device/render/audio calls every frame. Real stream/queue/serializer/constructor/frame algorithms plus recursive task cleanup and environment compaction execute. Dirty task/physics lists are seeded with holes on frame16; native frame-begin child forwarding, sparse physics traversal, match-status queries and nested panel lookup also execute; only old-object cleanup, child gameplay/body stepping, other root events, renderer, devices and heap remain interfaces. With --water-sounds, original water/skim handlers and004EDC90 sound enqueue also execute through frame flush/playback and recapture, including seeded near-capacity queues in half the ordinary sequences. With --physics, valid moving bodies are restored and original004CA320 executes with original water, air, sweep, collision cache/query and awake routines across all frames and recapture. Water/skim virtual responses remain explicit interfaces; category22 is empty so these scenes do not exercise shape overlap or bounce. With --contacts, frame16 seeds restored body masks, motion and category2 collision flags; shape overlap alone is substituted while contact entry, receiver momentum, bounce/step, sound replacement and recapture execute. With --masks, original shape3 packed planes replace controlled overlap; original004CC310/004CC0C0 execute, leaving only bitmap dimension/storage getters as interfaces. Root task simulation itself is not exercised.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} restored frame sequences')
