"""Execute full original replay root/controller restoration and setup."""
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
heap=owner+0x4000;allocations=[];calls=[];fail=-1

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
  ret(pointer)
 elif address==0x492510:ret()
 elif address in [0x4c6610,0x492bc0]:
  pointer=cpu.reg_read(UC_X86_REG_ECX)
  calls.append([address,pointer]+[read(sp+4+i*4) for i in range(3)]);ret(pointer,12)
cpu.hook_add(UC_HOOK_CODE,hook)
def short(address,value):cpu.mem_write(address,struct.pack('<H',value&65535))
layouts=[([],[]),([100],[3,2,0,-1]),([100,-7,32767],[])]
cases=[]
for position,layoutA,layoutB,fail,regType in itertools.product([0,1,3],layouts,layouts,range(-1,8),[0,26]):
 heap=owner+0x4000;allocations.clear();calls.clear();cpu.mem_write(owner,bytes([0xa5])*0x28c)
 cpu.mem_write(context+0x1b778,bytes([0xa5])*0x168)
 for offset,layout in [(0x1b778,layoutA),(0x1b848,layoutB)]:
  available,ranks=layout
  for i,value in enumerate(available):short(context+offset+i*2,value)
  short(context+offset+0x20,len(available));short(context+offset+0x62,len(ranks))
  for i,value in enumerate(ranks):short(context+offset+0x22+i*2,value);short(context+offset+0x42+i*2,10+i)
 write(context+0x1b8dc,320)
 scene=list(cpu.mem_read(context+0x1b778,0x168))
 payload=bytearray([0xcc]*position+[1,6,regType,0,0,2,5])
 while len(payload)%4:payload.append(255)
 payload.extend((i*13)&255 for i in range(0x5c));payload.append(6)
 while len(payload)%4:payload.append(255)
 payload.extend((i*17)&255 for i in range(0x138))
 cpu.mem_write(buffer,bytes(payload));write(stream+0x10,position);write(stream+0xc,len(payload))
 sp=stack+0xf000;write(sp,stop);write(sp+4,stream);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4b2d40,stop+1,count=100000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('controller constructor did not exit')
 children=[]
 for i in range(read(owner+0x14)):
  child=read(read(owner+0x18)+i*4)
  children.append({'id':child,'type':read(child+0x2c),'registryType':read(child+0x28),'registryIndex':read(child+0x24),'context':read(child+0x38),'parent':read(child+4),'ownsRegistry':bool(read(child+0x34)),'sharedRegistry':read(child+0x30)==read(owner+0x30),'capacity':read(child+0xc),'childCount':read(child+0x14),'last':read(child+(0xc3c if read(child+0x2c)==13 else 0x63c))})
 registry=[]
 for bucket in range(256):
  node=read(read(owner+0x30)+4+bucket*4)
  while node:
   registry.append([bucket,read(node+8),read(node+12),read(node+16)]);node=read(node+4)
 result={'body':list(cpu.mem_read(owner+0x3c,0x250)),'position':read(stream+0x10),'scene':list(cpu.mem_read(context+0x1b778,0x168)),'calls':list(calls),'children':children,'registry':registry}
 cases.append({'input':{'position':position,'bytes':list(payload),'scene':scene,'allocations':list(allocations)},'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004B2D40 with004EADB0/004EAF40,004B2EA0, original normal child constructors004E1500/005029A0, base constructors/registry and scene-pool insertion. Only heap and rendering constructors004C6610/00492BC0 substituted.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} root restores')
