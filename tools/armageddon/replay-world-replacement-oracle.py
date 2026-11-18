"""Execute full original snapshot restore through context, environment and populated root reconstruction."""
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
args = parser.parse_args()
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
write(stream+4,buffer);write(stream+8,0xc000);write(stream+0x14,context);write(context+8,0x7654321)
heapBase=0x2400000
cpu.mem_map(heapBase,0x40000)
heap=heapBase;allocations=[];taskAllocations=[];objects=[];buffers=[];calls=[];allocationCalls=[];fail=-1;mode=0;cleanupMode=0
manager=owner+0x800;oldRoot=owner+0x400
environment=0x2500000
cpu.mem_map(environment,0x10000)
write(context+0x7d4,environment);write(environment,environment+0x1000);write(environment+0x1034,0x4c8f80);write(environment+0x3c0,environment+0x2000);write(environment+0x2000+0x3a4,17)

paletteObject=owner+0xe000;surface=owner+0xe400
write(context+0x28,paletteObject);write(paletteObject,paletteObject+0x100);write(paletteObject+0x114,stop+0x400)
write(context+0x2f0,surface);write(surface,surface+0x100)
for offset in [0x14,0x34,0x38,0x3c,0x58]:write(surface+0x100+offset,stop+0x500+offset)
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
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
 elif address==0x492510:allocationCalls.append(['free',read(sp+4)]);ret()
 elif address==0x492590:allocationCalls.append(['release',read(sp+4),read(sp+8)]);ret()
 elif address in [stop+0x400,stop+0x514]:
  pointer=cpu.reg_read(UC_X86_REG_ECX);calls.append(['dimensions',pointer]);write(read(sp+4),1 if address==stop+0x400 else 2);write(read(sp+8),0 if address==stop+0x400 else 2);ret(0,8)
 elif address in [stop+0x534,stop+0x538,stop+0x53c,stop+0x558]:
  method=address-stop-0x500;count={0x34:4,0x38:4,0x3c:5,0x58:3}[method]
  calls.append(['draw',cpu.reg_read(UC_X86_REG_ECX),method,[signed(read(sp+4+i*4)) for i in range(count)]]);ret(0,count*4)
 elif address in [0x4fd5a0,0x500170,0x4ffed0]:
  pointer=cpu.reg_read(UC_X86_REG_ECX);count={0x4fd5a0:4,0x500170:2,0x4ffed0:8}[address]
  calls.append([address,pointer]+[read(sp+4+i*4) for i in range(count)]);write(pointer,{0x4fd5a0:0x527690,0x500170:0x5277c8,0x4ffed0:0x5277c0}[address]);ret(pointer,count*4)
 elif address in [0x4c6610,0x492bc0]:
  pointer=cpu.reg_read(UC_X86_REG_ECX)
  calls.append([address,pointer]+[read(sp+4+i*4) for i in range(3)]);write(pointer,0x5268a4 if address==0x4c6610 else 0x526390);ret(pointer,12)
cpu.hook_add(UC_HOOK_CODE,hook)
def short(address,value):cpu.mem_write(address,struct.pack('<H',value&65535))
schemas={row['tag']:row for row in json.loads(Path('src/armageddon/replay-task-types.json').read_text())}
tags=[7,9,21,23,25,26,30]
def node(tag,children=[]):return {'tag':tag,'children':children}
trees=[[],[node(tag) for tag in tags],[node(7,[node(9,[node(21,[node(30)])]),node(25)])],[node(tags[i%7]) for i in range(20)],[node(23,[node(tags[i%7]) for i in range(18)])]]
trees.append([node(tag) for tag in schemas])
extraBlocks={13:(0x3c,0xc04),16:(0x3c,0x24),22:(0x3c,0x28),27:(0x3c,0x1c),29:(0x3c,0x28)}
cases=[]
combinations=[row+(0,0,captureMode) for row in itertools.product([0,7],trees) for captureMode in [False,True]]
for initialPosition,tree,mode,cleanupMode,captureMode in combinations:
 position=0;savedIndex=-1;environment=0x2500000
 heap=heapBase;allocations.clear();taskAllocations.clear();objects.clear();buffers.clear();calls.clear();allocationCalls.clear();cpu.mem_write(owner,bytes([0xa5])*0x28c)
 cpu.mem_write(context+0x1b778,bytes(0x168));write(context+0x1b8dc,320)
 for offset,storage in [(0x18,environment+0x3000),(0x34+2*0x1c,environment+0x4000)]:
  write(environment+offset+4,256);write(environment+offset+12,0);write(environment+offset+16,storage);write(environment+offset+20,storage+0x800)
  cpu.mem_write(storage,bytes(2048))
 write(manager+4,oldRoot);write(manager+0x2a0,context);write(context+0x7d4,environment)
 write(oldRoot,owner+0x500);write(owner+0x518,stop+0x200);write(owner+0x500,stop+0x210)
 write(environment+0x1018,stop+0x220);write(environment+0x1000,stop+0x230)
 write(context+0x3a4,17)
 payload=bytearray(0x3fbc)
 payload.append(33)
 while len(payload)%4:payload.append(255)
 payload.extend(range(12));payload.extend([6,1,6,26,0])
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
   block(body)
  payload.append(tag);block(bytes(extraBlocks.get(tag,schema['block'])[1]))
  if tag==18:payload.append(32);block(bytes(0x15c))
 for item in tree:emit(item)
 payload.extend([0,2,5]);block(bytes((i*13)&255 for i in range(0x5c)))
 payload.append(6);block(bytes((i*17)&255 for i in range(0x138)))
 cpu.mem_write(buffer,bytes(payload));write(stream+0x10,initialPosition);write(stream+0xc,len(payload))
 initial=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))+bytes(cpu.mem_read(heapBase,0x40000))+bytes(cpu.mem_read(0x2500000,0x10000))
 sp=stack+0xf000;write(sp,stop);write(sp+4,stream);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,manager)
 cpu.emu_start(0x4a1d20,stop+1,count=1000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('snapshot did not exit')
 #Replace the real restored world twice; original cleanup/destruction runs.
 for cycle in range(1 if len(tree)==21 else 2):
  write(stream+16,initialPosition)
  before=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))+bytes(cpu.mem_read(heapBase,0x40000))+bytes(cpu.mem_read(0x2500000,0x10000))
  cursor=heap;calls.clear();allocationCalls.clear();captured=None
  if captureMode:
   def invoke(entry,at,values=[]):
    for i,value in enumerate([stop]+values):write(sp+i*4,value)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,at);cpu.emu_start(entry,stop+1,count=1000000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('capture did not exit')
   invoke(0x4c7370,stream);invoke(0x4c7480,stream,[context+0x7ec,0x3fbc])
   env=read(context+0x7d4);invoke(read(read(env)+0x10),env,[stream]);invoke(0x4b2d80,read(manager+4),[stream])
   saved=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))+bytes(cpu.mem_read(heapBase,0x40000))+bytes(cpu.mem_read(0x2500000,0x10000))
   captured=dict(sha256=hashlib.sha256(saved).hexdigest(),length=read(stream+12),position=read(stream+16))
  write(sp,stop);write(sp+4,stream);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,manager)
  cpu.emu_start(0x4a1d20,stop+1,count=1000000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('replacement did not exit')
  after=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))+bytes(cpu.mem_read(heapBase,0x40000))+bytes(cpu.mem_read(0x2500000,0x10000))
  cases.append(dict(cycle=cycle,captured=captured,cursor=cursor,inputMemory=base64.b64encode(zlib.compress(before)).decode(),sha256=hashlib.sha256(after).hexdigest(),calls=list(calls),allocationCalls=list(allocationCalls),root=read(manager+4),environment=read(context+0x7d4),position=read(stream+16)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='44 original004A1D20 replacements: two consecutive replacements of each restored empty/mixed/deep/wide seven-kind tree at two stream offsets. Real recursive cleanup, world destruction, environment compaction/destruction and reconstruction execute. Four cases additionally replace a flat world containing all21 recovered concrete actor kinds, including worm animation, controller resources, terrain history and weather presentation. Half of cases first serialize current scene, environment and concrete root through original stream and virtual writers, then replace from that generated snapshot; intermediate capture memory and length also compared. Full512KiB memory, pointers, stream cursor and ordered heap/render requests match. Text/image/panel/frame/portrait construction and surface drawing are minimal resource interfaces; destruction executes original routines. Heap/render services remain interfaces, and full runtime gameplay states/browser integration are not covered.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'native world replacements')
