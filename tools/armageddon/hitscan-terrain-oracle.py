"""Execute original hitscan spread instructions in Unicorn.

Original hitscan spread instructions execute; RNG is supplied and playback is captured. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]



bitmap,vtable,sample=owner+0x2000,owner+0x3000,owner+0x4000
write(owner+0x908,bitmap);write(bitmap,vtable);write(vtable+0x54,sample)
cpu.mem_write(sample,b'\xc2\x08\x00')
queries=[];shape='empty'
def capture(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);x,y=struct.unpack('<2i',cpu.mem_read(sp+4,8));queries.append([x,y])
 hit={'empty':False,'wall':x==5,'floor':y==5,'pixel':x==3 and y==3,'negative':x<0 or y<0}[shape]
 cpu.reg_write(UC_X86_REG_EAX,int(hit))
cpu.hook_add(UC_HOOK_CODE,capture,begin=sample,end=sample)
cases=[]
for x,y in [[0,0],[5,5],[-2,4],[32767,32767]]:
 for dx,dy in [[65536,0],[-65536,0],[0,65536],[46340,46340],[100000,23000]]:
  for limit in [-1,0,5,12]:
   for shape in ['empty','wall','floor','pixel','negative']:
    queries.clear();sp=stack+0xf000
    for i,value in enumerate([stop,x,y,dx,dy,limit]):write(sp+i*4,value&0xffffffff)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4a8fb0,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Terrain ray failed to return')
    result=cpu.reg_read(UC_X86_REG_EAX);result=result if result<0x80000000 else result-0x100000000
    cases.append(dict(x=x,y=y,dx=dx,dy=dy,limit=limit,shape=shape,queries=list(queries),distance=result))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A8FB0',method='Original terrain-ray loop; bitmap virtual +0x54 records signed integer pixel queries and supplies occupancy.',cases=cases),indent=2)+'\n')
print(f'Captured {len(cases)} terrain rays')
