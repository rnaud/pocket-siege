"""Execute full original physics task reconstruction with base task and environment restoration."""
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
context=owner+0x20000;environment=owner+0x30000
cpu.mem_map(context,0x10000);cpu.mem_map(environment,0x10000)
write(stream+4,buffer);write(stream+8,2048);write(stream+0x14,context);write(context+0x7d4,environment)
write(environment,environment+0x1000);write(environment+0x1034,0x4c8f80);write(environment+0x3c0,environment+0x2000)
heap=owner+0x4000;contactPointer=None;allocations=[];calls=[]
def ret(value=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global heap,contactPointer
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4924d0,0x492550]:
  size=read(sp+(8 if address==0x4924d0 else 4));pointer=heap;heap+=(size+15)&~15
  calls.append(['array',size,read(sp+4)] if address==0x4924d0 else ['allocate',size])
  cpu.mem_write(pointer,bytes(size))
  if address==0x4924d0 and read(sp+4)==0x56f7b8:
   contactPointer=pointer;allocations.append(size)
  ret(pointer)
 elif address==0x492510:calls.append(['free',read(sp+4)]);ret()
cpu.hook_add(UC_HOOK_CODE,hook)
def pointer(value):return 0 if value is None else owner if value==9 else 0x4000000+value*4
def value(pointer):return None if not pointer else 9 if pointer==owner else (pointer-0x4000000)//4
def setup(offset,list,storage):
 write(environment+offset+4,list['capacity']);write(environment+offset+0xc,len(list['entries']))
 write(environment+offset+0x10,storage);write(environment+offset+0x14,storage+0x100)
 for i,item in enumerate(list['entries']):write(storage+i*4,pointer(item))
def capture(offset):
 return {'capacity':read(environment+offset+4),'entries':[value(read(read(environment+offset+0x10)+i*4)) for i in range(read(environment+offset+0xc))]}
layouts=[{'capacity':1,'entries':[]},{'capacity':2,'entries':[2,None]}]
cases=[]
for position,enabled,count,allIndex,categoryIndex,layout in itertools.product([0,1,3],[0,1],[0,2,64],[-1,3],[-1,2],layouts):
 heap=owner+0x4000;contactPointer=None;allocations.clear();calls.clear()
 cpu.mem_write(owner,bytes([0xa5])*0xfc)
 setup(0x18,layout,environment+0x3000);setup(0x34+2*0x1c,layout,environment+0x3400);write(environment+4,77)
 links=[17,0x87654321]
 for i,item in enumerate(links):write(environment+0x2000+0x3a4+4*i,item)
 body=bytearray((i*13+count)&255 for i in range(0xb0))
 for offset,number in [(0x3c,2),(0x44,1),(0xc8,enabled),(0xdc,count),(0xe4,categoryIndex),(0xe8,allIndex)]:struct.pack_into('<I',body,offset-0x3c,number&0xffffffff)
 payload=bytearray([0xcc]*position+[1,18,21,3,0,2,3])
 while len(payload)%4:payload.append(255)
 payload.extend(body)
 contacts=bytes((i*17+enabled)&255 for i in range(count*8))
 if enabled:payload.extend(contacts)
 cpu.mem_write(buffer,bytes(payload));write(stream+0x10,position);write(stream+0xc,len(payload))
 initial=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x10000))+bytes(cpu.mem_read(environment,0x10000))
 sp=stack+0xf000;write(sp,stop);write(sp+4,0);write(sp+8,stream);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4f42d0,stop+1,count=100000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('physics constructor did not exit')
 result={'body':list(cpu.mem_read(owner+0x3c,0xc0)),'position':read(stream+0x10),'contacts':list(cpu.mem_read(contactPointer,512)) if contactPointer else [],'allocations':list(allocations),'all':capture(0x18),'category':capture(0x34+2*0x1c),'dirty':read(environment+4),'type':read(owner+0x2c),'registryType':read(owner+0x28),'registryIndex':read(owner+0x24)}
 final=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x10000))+bytes(cpu.mem_read(environment,0x10000))
 cases.append({'inputMemory':base64.b64encode(zlib.compress(initial)).decode(),'sha256':hashlib.sha256(final).hexdigest(),'calls':list(calls),'input':{'position':position,'bytes':list(payload),'layout':layout,'links':links,'contactPointer':contactPointer},'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004F42D0 including004B1DE0/004ED9A0 constructors, original registry and004C8F80 membership restore, stream reads and full contact copy. Only heap interfaces substituted; no body/list/constructor algorithm hooks. Complete192KiB owner/context/environment memory and ordered allocation/free requests additionally captured.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} complete physics task restores')
