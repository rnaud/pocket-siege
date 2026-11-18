"""Execute original worm replay reconstruction and resource setup with renderer constructors exposed as interfaces."""
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
write(stream+4,buffer);write(stream+8,2048);write(stream+0x14,context);write(context+0x7d4,environment);write(context+8,0x7654321)
write(environment,environment+0x1000);write(environment+0x1034,0x4c8f80);write(environment+0x3c0,environment+0x2000)
write(environment+0x2000+0x3a4,17)
heap=owner+0x6000;resourceAllocations=[];calls=[];allocationCalls=[];fail=-1

def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global heap
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4924d0,0x492550]:
  size=read(sp+(8 if address==0x4924d0 else 4));pointer=heap
  resource=address==0x492550 and size in [0x164,0x138,0x34]
  if resource and len(resourceAllocations)==fail:pointer=0
  else:
   heap+=(size+15)&~15;cpu.mem_write(pointer,bytes(size))
  allocationCalls.append(['array',size,read(sp+4),pointer] if address==0x4924d0 else ['allocate',size,pointer])
  if resource:resourceAllocations.append({'size':size,'pointer':pointer})
  ret(pointer)
 elif address==0x492510:allocationCalls.append(['free',read(sp+4)]);ret()
 elif address in [0x4c6610,0x4fd5a0]:
  count=3 if address==0x4c6610 else 4
  pointer=cpu.reg_read(UC_X86_REG_ECX)
  calls.append([address,pointer]+[read(sp+4+i*4) for i in range(count)])
  ret(pointer,count*4)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for position,team,active,fail in itertools.product([0,1,3],[0,1,5],[0,1],range(-1,8)):
 heap=owner+0x6000;resourceAllocations.clear();calls.clear();allocationCalls.clear()
 cpu.mem_write(owner,bytes([0xa5])*0x390)
 for offset,storage in [(0x18,environment+0x3000),(0x34+2*0x1c,environment+0x3400)]:
  write(environment+offset+4,256);write(environment+offset+12,0);write(environment+offset+16,storage);write(environment+offset+20,storage+0x100)
 write(context+0x12460,0x7fffffff);write(context+0x1b76c,0x87654321)
 body=bytearray((i*13+team)&255 for i in range(0xb0))
 for offset,number in [(0x3c,2),(0x44,0),(0xc8,0),(0xdc,0),(0xe4,-1),(0xe8,-1)]:struct.pack_into('<I',body,offset-0x3c,number&0xffffffff)
 payload=bytearray([0xcc]*position+[1,18,21,3,0,2,3])
 while len(payload)%4:payload.append(255)
 payload.extend(body);payload.append(18)
 while len(payload)%4:payload.append(255)
 derived=bytearray((i*11+team)&255 for i in range(0x23c))
 struct.pack_into('<I',derived,0x170-0xfc,team);struct.pack_into('<I',derived,0x13c-0xfc,active)
 payload.extend(derived);payload.append(32)
 while len(payload)%4:payload.append(255)
 payload.extend((i*17+active)&255 for i in range(0x15c))
 cpu.mem_write(buffer,bytes(payload));write(stream+0x10,position);write(stream+0xc,len(payload))
 initial=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))+bytes(cpu.mem_read(environment,0x10000))
 sp=stack+0xf000;write(sp,stop);write(sp+4,0);write(sp+8,stream);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4d6240,stop+1,count=100000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('worm constructor did not exit')
 animation=read(owner+0x350)
 result={'animationRenderer':read(animation+4) if animation else None,'body':list(cpu.mem_read(owner+0x3c,0x354)),'animation':list(cpu.mem_read(animation+8,0x15c)) if animation else [],'position':read(stream+0x10),'calls':list(calls),'activeCount':signed(read(context+0x12460))}
 final=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))+bytes(cpu.mem_read(environment,0x10000))
 cases.append({'inputMemory':base64.b64encode(zlib.compress(initial)).decode(),'sha256':hashlib.sha256(final).hexdigest(),'allocationCalls':list(allocationCalls),'input':{'position':position,'bytes':list(payload),'allocations':list(resourceAllocations)},'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004D6240 with original base/physics/registry/membership constructors,004FD330 animation read,004EDAD0 team lookup and004D64F0 resource setup. Only heap allocation/free and rendering constructors004C6610/004FD5A0 substituted; resource interface requests and all body bytes captured. Complete256KiB owner/context/environment memory and allocator ordering also captured, including every animation/text/panel allocation failure.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} worm restores')
