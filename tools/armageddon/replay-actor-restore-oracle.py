"""Execute original concrete replay actor constructors with rendering text allocation as an explicit interface."""
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
stream=owner+0x1000;buffer=owner+0x2000
context=owner+0x20000;environment=owner+0x40000
cpu.mem_map(context,0x20000);cpu.mem_map(environment,0x10000)
write(stream+4,buffer);write(stream+8,4096);write(stream+0x14,context);write(context+0x7d4,environment);write(context+8,0x7654321)
write(environment,environment+0x1000);write(environment+0x1034,0x4c8f80);write(environment+0x3c0,environment+0x2000)
write(environment+0x2000+0x3a4,17)
heap=owner+0x6000;resourceAllocations=[];calls=[];sounds=[];allocationCalls=[];fail=-1

def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global heap
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4924d0,0x492550]:
  size=read(sp+(8 if address==0x4924d0 else 4));pointer=heap
  resource=address==0x492550 and size in [0x164,0x138,0x34,0x170,0x3c]
  if resource and len(resourceAllocations)==fail:pointer=0
  else:
   heap+=(size+15)&~15;cpu.mem_write(pointer,bytes(size))
  allocationCalls.append(['array',size,read(sp+4),pointer] if address==0x4924d0 else ['allocate',size,pointer])
  if resource:resourceAllocations.append({'size':size,'pointer':pointer})
  ret(pointer)
 elif address==stop+0x100:
  sounds.append([read(sp+4+i*4) for i in range(5)]);ret(0x654321,20)
 elif address==0x492510:allocationCalls.append(['free',read(sp+4)]);ret()
 elif address in [0x4c6610,0x4fd5a0,0x500170,0x4ffed0]:
  count={0x4c6610:3,0x4fd5a0:4,0x500170:2,0x4ffed0:8}[address]
  pointer=cpu.reg_read(UC_X86_REG_ECX)
  calls.append([address,pointer]+[read(sp+4+i*4) for i in range(count)])
  ret(pointer,count*4)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
schemas=json.loads(Path('src/armageddon/replay-task-types.json').read_text())
tags=[7,8,9,10,11,13,15,16,17,21,22,23,24,25,26,27,29,30]
extraBlocks={13:(0x3c,0xc04),16:(0x3c,0x24),22:(0x3c,0x28),27:(0x3c,0x1c),29:(0x3c,0x28)}
counters=[0x12420,0x12424,0x12428,0x1242c,0x12430,0x1b8f0,0x1b8f4]
combinations=itertools.product(tags,[0,1,3],[0,1,3],[-1,0,1,2])
for tag,position,seed,fail,audioMode in (row+(mode,) for row in combinations for mode in (range(4) if row[0]==11 else [0])):
 schema=next(row for row in schemas if row['tag']==tag)
 heap=owner+0x6000;resourceAllocations.clear();calls.clear();sounds.clear();allocationCalls.clear()
 cpu.mem_write(owner,bytes([0xa5])*schema['size'])
 for offset,storage in [(0x18,environment+0x3000),(0x34+2*0x1c,environment+0x3400)]:
  write(environment+offset+4,256);write(environment+offset+12,0);write(environment+offset+16,storage);write(environment+offset+20,storage+0x100)
 write(context+0x1d448,int(audioMode>=2));write(context+0xc,environment+0x4000 if audioMode%2 else 0)
 write(environment+0x4000,environment+0x4100);write(environment+0x4110,stop+0x100)
 write(context+0x12434+7*4,0x12345678);write(context+0x12434+8*4,0x87654321)
 for offset in counters:write(context+offset,0x7fffffff)
 for i in range(4):write(context+0x450+i*4,0);write(context+0x4b0+i*4,0)
 payload=bytearray([0xcc]*position+[1,tag,21,3,0,2])
 if schema['physics']:
  payload.append(3)
  while len(payload)%4:payload.append(255)
  body=bytearray((i*13+seed)&255 for i in range(0xb0))
  for offset,number in [(0x3c,2),(0x44,0),(0xc8,0),(0xdc,0),(0xe4,-1),(0xe8,-1)]:struct.pack_into('<I',body,offset-0x3c,number&0xffffffff)
  payload.extend(body)
 payload.append(tag)
 while len(payload)%4:payload.append(255)
 start,length=extraBlocks.get(tag,schema['block'])
 derived=bytearray((i*11+seed)&255 for i in range(length))
 fields={11:[(0x31c,seed),(0x138,0x7fffffff),(0x13c,seed),(0x140,0x7fffffff),(0x144,seed)],8:[(0x100,seed)],15:[(0x124,seed),(0x260,seed)],24:[(0x80,seed)]}.get(tag,[])
 for offset,number in fields:struct.pack_into('<I',derived,offset-start,number)
 payload.extend(derived)
 cpu.mem_write(buffer,bytes(payload));write(stream+0x10,position);write(stream+0xc,len(payload))
 initial=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))+bytes(cpu.mem_read(environment,0x10000))
 sp=stack+0xf000;write(sp,stop);write(sp+4,0);write(sp+8,stream);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(int(schema['constructor'],16),stop+1,count=100000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('actor constructor did not exit')
 result={'body':list(cpu.mem_read(owner+0x3c,schema['size']-0x3c)),'position':read(stream+0x10),'calls':list(calls),'sounds':list(sounds),'counters':{str(offset):signed(read(context+offset)) for offset in counters},'teamSlots':[read(context+0x450+i*4) for i in range(4)],'effectSlots':[read(context+0x4b0+i*4) for i in range(4)]}
 final=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))+bytes(cpu.mem_read(environment,0x10000))
 cases.append({'inputMemory':base64.b64encode(zlib.compress(initial)).decode(),'sha256':hashlib.sha256(final).hexdigest(),'allocationCalls':list(allocationCalls),'input':{'tag':tag,'audioSuppressed':audioMode>=2,'audioPresent':bool(audioMode%2),'position':position,'bytes':list(payload),'allocations':list(resourceAllocations)},'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full18 concrete constructors including original base/physics/registry/membership, resource setup004DFFA0/004E2050/004E5380 and audio routing004EDB90. Only heap, rendering constructors and sound device call substituted. Full derived bytes, context counters/slots, stream cursor and resource requests captured. Complete256KiB owner/context/environment memory and ordered allocator/free calls also captured.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} actor restores')
