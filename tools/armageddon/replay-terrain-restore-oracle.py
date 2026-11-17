"""Execute original terrain replay reconstruction including queue and hash buffer constructors."""
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
stream=owner+0x4000;buffer=owner+0x8000;context=owner+0x20000
cpu.mem_map(context,0x20000)
write(stream+4,buffer);write(stream+0x14,context)
heap=owner+0x6000;allocations=[];failSize=0

def ret(value=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global heap
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4924d0,0x492550]:
  size=read(sp+(8 if address==0x4924d0 else 4));pointer=heap;caller=read(sp)
  resource=any(low<=caller<high for low,high in [(0x4cd180,0x4cd2a0),(0x49c650,0x49c690),(0x4af2f0,0x4af390),(0x4cbb90,0x4cbbd0)])
  if resource and size==failSize:pointer=0
  else:
   heap+=(size+15)&~15;cpu.mem_write(pointer,bytes(size))
  if resource:allocations.append({'size':size,'pointer':pointer})
  ret(pointer)
 elif address==0x492510:ret()
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for position,seed,failSize in itertools.product([0,1,2,3],[0,17,255],[0,8,32,16]):
 heap=owner+0x6000;allocations.clear()
 cpu.mem_write(owner,bytes([0xa5])*0x2dd4)
 payload=bytearray([0xcc]*position+[1,31,21,3,0,2,31])
 while len(payload)%4:payload.append(255)
 payload.extend((i*13+seed)&255 for i in range(0x2ce8))
 cpu.mem_write(buffer,bytes(payload));write(stream+0x10,position);write(stream+0xc,len(payload))
 sp=stack+0xf000;write(sp,stop);write(sp+4,0);write(sp+8,stream);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4cd180,stop+1,count=100000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('terrain constructor did not exit')
 queue=read(owner+0x2dc4);ring=read(queue+4) if queue else 0;table=read(owner+0x2dcc)
 ringState={'pointer':ring,'dataPointer':read(ring+4),'capacity':read(ring+8),'count':read(ring+12),'writeOffset':read(ring+16),'readOffset':read(ring+20),'head':read(ring+24),'tail':read(ring+28),'bytes':list(cpu.mem_read(read(ring+4),256))} if ring else None
 tableState={'pointer':table,'dataPointer':read(table+12),'capacity':read(table+8),'count':read(table+4),'bytes':list(cpu.mem_read(read(table+12),568))} if table else None
 result={'body':list(cpu.mem_read(owner+0x3c,0x2d98)),'position':read(stream+0x10),'queue':{'pointer':queue,'ring':ringState} if queue else None,'table':tableState}
 cases.append({'input':{'position':position,'bytes':list(payload),'allocations':list(allocations)},'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004CD180 including original base/derived constructors,0049C650 queue,004AF2F0 ring and004CBB90 hash table. Only heap allocation/free substituted; captures all body and allocated data bytes and nested buffer state, including three allocation-failure branches.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} terrain restores')
