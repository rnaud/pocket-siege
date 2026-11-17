"""Execute original walking position and slope-search instructions in Unicorn.

Collision queries are recorded with their real calling convention. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP
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
context=0x2300000
cpu.mem_map(context,0x10000)
manager,vt,probe=owner+0x1000,owner+0x2000,owner+0x3000
write(owner+0x38,context);write(context+0x7d4,manager);write(manager,vt);write(vt+0xc,probe)
cpu.mem_write(probe,b'\xc2\x0c\x00')
queries=[];pattern=[]
def observe(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if read(sp+4)!=owner:raise RuntimeError('Wrong collision owner')
 queries.append(list(struct.unpack('<2i',cpu.mem_read(sp+8,8))))
 cpu.reg_write(UC_X86_REG_EAX,pattern[(len(queries)-1)%len(pattern)])
cpu.hook_add(UC_HOOK_CODE,observe,begin=probe,end=probe)
cases=[]
for x,y in [(0x400000,0x200000),(0x7fffffff,-0x7fffffff)]:
 for dx in [-0x20000,0,0x8000,0x20000]:
  for limit in [-1,0,1,8]:
   for pattern in [[0],[1],[0,0,1],[1,1,0],[0,0,0,0,0,0,0,0,1]]:
    write(owner+0x4000,x&0xffffffff);write(owner+0x4004,y&0xffffffff)
    cpu.mem_write(stack+0xff00,struct.pack('<5I',stop,owner+0x4000,owner+0x4004,dx&0xffffffff,limit&0xffffffff))
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    queries=[];cpu.emu_start(0x4f4d80,stop,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Walk position did not return')
    result=cpu.reg_read(UC_X86_REG_EAX);result=result if result<0x80000000 else result-0x100000000
    out_x,out_y=struct.unpack('<2i',cpu.mem_read(owner+0x4000,8))
    cases.append({'input':[x,y,dx,limit],'pattern':pattern,'queries':queries,'output':{'x':out_x,'y':out_y,'result':result}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004F4D80','method':'Original position solver executes unchanged; collision manager answers from the recorded pattern.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} walk position cases')
