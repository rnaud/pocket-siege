"""Execute original populated replay trees through root, recursive factory and concrete constructors."""
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

import itertools
stream=owner+0x1000;buffer=owner+0x2000;context=owner+0x20000
cpu.mem_map(context,0x20000)
write(stream+4,buffer);write(stream+0x14,context);write(context+8,0x7654321)
heapBase=0x2400000
cpu.mem_map(heapBase,0x40000)
heap=heapBase;allocations=[];taskAllocations=[];calls=[];fail=-1
environment=0x2500000
cpu.mem_map(environment,0x10000)
write(context+0x7d4,environment);write(environment,environment+0x1000);write(environment+0x1034,0x4c8f80);write(environment+0x3c0,environment+0x2000);write(environment+0x2000+0x3a4,17)

def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global heap
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4924d0,0x492550]:
  size=read(sp+(8 if address==0x4924d0 else 4));pointer=heap;caller=read(sp)
  resource=address==0x492550 and (0x4eaf40<=caller<0x4eb100 or 0x4b2ea0<=caller<0x4b3110)
  if resource and len(allocations)==fail:pointer=0
  else:
   heap+=(size+15)&~15;cpu.mem_write(pointer,bytes(size))
  if resource:allocations.append({'size':size,'pointer':pointer})
  if address==0x492550 and 0x4b2230<=caller<0x4b2670:taskAllocations.append({'size':size,'pointer':pointer})
  ret(pointer)
 elif address==0x492510:ret()
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
for position,tree,savedIndex in itertools.product([0,1,3],trees,[-1,3]):
 heap=heapBase;allocations.clear();taskAllocations.clear();calls.clear();cpu.mem_write(owner,bytes([0xa5])*0x28c)
 cpu.mem_write(context+0x1b778,bytes(0x168));write(context+0x1b8dc,320)
 for offset,storage in [(0x18,environment+0x3000),(0x34+2*0x1c,environment+0x4000)]:
  write(environment+offset+4,256);write(environment+offset+12,0);write(environment+offset+16,storage);write(environment+offset+20,storage+0x800)
  cpu.mem_write(storage,bytes(2048))
 payload=bytearray([0xcc]*position+[1,6,26,0])
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
  payload.append(tag);block(bytes((i*11+tag)&255 for i in range(schema['block'][1])))
 for item in tree:emit(item)
 payload.extend([0,2,5]);block(bytes((i*13)&255 for i in range(0x5c)))
 payload.append(6);block(bytes((i*17)&255 for i in range(0x138)))
 cpu.mem_write(buffer,bytes(payload));write(stream+0x10,position);write(stream+0xc,len(payload))
 sp=stack+0xf000;write(sp,stop);write(sp+4,stream);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4b2d40,stop+1,count=1000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('tree did not exit')
 def capture(pointer):
  tag=read(pointer+0x2c);size=0x28c if pointer==owner else 0x640 if tag==14 else schemas[tag]['size']
  return {'id':pointer,'type':tag,'parent':read(pointer+4),'capacity':read(pointer+12),'ownsRegistry':bool(read(pointer+0x34)),'sharedRegistry':read(pointer+0x30)==read(owner+0x30),'registryType':read(pointer+0x28),'registryIndex':read(pointer+0x24),'body':list(cpu.mem_read(pointer+0x3c,size-0x3c)),'children':[capture(read(read(pointer+0x18)+i*4)) for i in range(read(pointer+0x14))]}
 registry=[]
 for bucket in range(256):
  link=read(read(owner+0x30)+4+bucket*4)
  while link:
   registry.append([bucket,read(link+8),read(link+12),read(link+16)]);link=read(link+4)
 def listState(offset):return {'capacity':read(environment+offset+4),'entries':[read(read(environment+offset+16)+i*4) or None for i in range(read(environment+offset+12))]}
 result={'tree':capture(owner),'registry':registry,'all':listState(0x18),'category':listState(0x34+2*0x1c),'position':read(stream+0x10),'calls':list(calls)}
 cases.append({'input':{'position':position,'bytes':list(payload),'allocations':list(allocations),'tasks':list(taskAllocations)},'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004B2D40 with original recursive004B2230, base and seven concrete actor types, physics membership, registry and fresh setup children. Only heap and rendering constructors substituted. Empty/mixed/deep/wide trees cover duplicate keys, saved-slot conflicts and list growth.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} populated trees')
