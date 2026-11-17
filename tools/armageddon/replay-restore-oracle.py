"""Execute original base task reconstruction and registry insertion."""
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
parent=owner+0x1000;registry=owner+0x2000;stream=owner+0x3000;buffer=owner+0x3200
heap=owner+0x4000

def ret(value=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global heap
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4924d0,0x492550]:
  count=read(sp+(8 if address==0x4924d0 else 4));pointer=heap;heap+=(count+15)&~15
  cpu.mem_write(pointer,bytes(count));ret(pointer)
 elif address==0x492510:ret()
cpu.hook_add(UC_HOOK_CODE,hook)
def pointer(value):return 0 if value is None else owner if value==9 else 0x4000000+value*4
def value(pointer):return None if not pointer else 9 if pointer==owner else (pointer-0x4000000)//4
layouts=[None,{'capacity':1,'children':[]},{'capacity':1,'children':[2]},{'capacity':2,'children':[2,3]},{'capacity':4,'children':[None,2]}]
cases=[]
for layout,typeValue,registryType,registryIndex,marker,childTag in itertools.product(layouts,[0,6,255],[0,1,255],[0,1,255],[1,254],[0,6]):
 heap=owner+0x4000
 cpu.mem_write(owner,bytes(0x80));cpu.mem_write(parent,bytes(0x80));cpu.mem_write(registry,bytes(0x404))
 bucket=(registryIndex*17+registryType)&255
 if layout is not None:
  write(parent+0xc,layout['capacity']);write(parent+0x14,len(layout['children']));write(parent+0x18,owner+0x3400);write(parent+0x1c,owner+0x3500);write(parent+0x30,registry)
  for i,item in enumerate(layout['children']):write(owner+0x3400+4*i,pointer(item))
  node=owner+0x3600;write(registry+4+bucket*4,node);write(node+4,0);write(node+8,registryType);write(node+12,registryIndex);write(node+16,pointer(2))
 payload=bytes([marker,typeValue,registryType,registryIndex,childTag,0xaa])
 cpu.mem_write(buffer,payload);write(stream+4,buffer);write(stream+0x10,0);write(stream+0xc,len(payload))
 sp=stack+0xf000;write(sp,stop);write(sp+4,parent if layout is not None else 0);write(sp+8,stream);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4b1de0,stop+1,count=100000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('base task restore did not exit')
 reg=read(owner+0x30);entries=[]
 for slot in range(256):
  node=read(reg+4+slot*4)
  while node:
   entries.append({'bucket':slot,'type':read(node+8),'index':read(node+12),'id':value(read(node+16))});node=read(node+4)
 parentResult=None if layout is None else {'capacity':read(parent+0xc),'children':[value(read(read(parent+0x18)+4*i)) for i in range(read(parent+0x14))]}
 result=dict(type=read(owner+0x2c),registryType=read(owner+0x28),registryIndex=read(owner+0x24),ownsRegistry=bool(read(owner+0x34)),sharedRegistry=layout is not None and reg==registry,capacity=read(owner+0xc),childCount=read(owner+0x14),parent=parentResult,registry=entries,position=read(stream+0x10),returnedSelf=cpu.reg_read(UC_X86_REG_EAX)==owner)
 cases.append({'input':dict(parent=layout,bytes=list(payload),bucket=bucket,existing={'type':registryType,'index':registryIndex,'id':2}),'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004B1DE0 with original004CCDB0 registry construction,004CCE30 hash insertion, stream reads and004B2230 child termination/unknown-tag paths. Only heap allocation/free substituted; native list growth/copy and linked registry entries unchanged.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} original base task restores')
