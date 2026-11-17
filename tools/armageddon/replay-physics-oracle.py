"""Execute original replay physics list reconstruction."""
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
body=owner+0x1000;registry=owner+0x2000
heap=owner+0x4000

def ret(value=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global heap
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4924d0:
  count=read(sp+8);pointer=heap;heap+=(count+15)&~15
  cpu.mem_write(pointer,bytes(count));ret(pointer)
 elif address==0x492510:ret()
cpu.hook_add(UC_HOOK_CODE,hook)
def pointer(value):return 0 if value is None else body if value==9 else 0x4000000+value*4
def value(pointer):return None if not pointer else 9 if pointer==body else (pointer-0x4000000)//4
def setup(offset,list,storage):
 write(owner+offset+4,list['capacity']);write(owner+offset+0xc,len(list['entries']))
 write(owner+offset+0x10,storage);write(owner+offset+0x14,storage+0x100)
 for i,item in enumerate(list['entries']):write(storage+i*4,pointer(item))
def capture(offset):
 return {'capacity':read(owner+offset+4),'entries':[value(read(read(owner+offset+0x10)+i*4)) for i in range(read(owner+offset+0xc))]}
layouts=[{'capacity':1,'entries':[]},{'capacity':1,'entries':[None]},{'capacity':2,'entries':[2,None]},{'capacity':4,'entries':[2,3,4,5]}]
cases=[]
for allList,category,allIndex,categoryIndex,linkIndex in itertools.product(layouts,layouts,[-1,0,1,4,9],[-1,0,1,4,9],[0,3]):
 heap=owner+0x4000
 setup(0x18,allList,owner+0x3000);setup(0x34+2*0x1c,category,owner+0x3400)
 write(owner+4,77);write(owner+0x3c0,registry)
 links=[0,17,0x7fffffff,0x87654321]
 for i,item in enumerate(links):write(registry+0x3a4+4*i,item)
 write(body+0xe8,allIndex);write(body+0xe4,categoryIndex);write(body+0x3c,2);write(body+0x44,linkIndex)
 sp=stack+0xf000;write(sp,stop);write(sp+4,body);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4c8f80,stop+1,count=100000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('membership restore did not exit')
 cases.append({'input':dict(id=9,all=allList,category=category,allIndex=allIndex,categoryIndex=categoryIndex,links=links,linkIndex=linkIndex),'result':dict(all=capture(0x18),category=capture(0x34+2*0x1c),dirty=read(owner+4),link=read(body+0xf0))})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004C8F80, no list/branch algorithm hooks. Heap allocation/free interfaces substituted with zeroed mapped storage. Original capacity growth and byte copies execute unchanged.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} original physics membership restores')
