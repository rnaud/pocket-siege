"""Execute original radial blast damage instructions in Unicorn.

Original radial blast damage instructions execute; body/context inputs are supplied and impulses captured. No game entry point runs.
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




# Verify generated table formula against every original lookup byte.
import math
for address,multiplier in [(0x567658,1),(0x56b658,2)]:
 assert bytes(cpu.mem_read(address,16384)) == bytes(math.isqrt((16384+i)*multiplier) for i in range(16384))
context,vtable,impulse=owner+0x4000,owner+0x2000,owner+0x3000
write(owner+0x38,context);write(owner,vtable);write(vtable+0x118,impulse);cpu.mem_write(impulse,b'\xc2\x0c\x00')
requests=[]
def capture(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);requests.append(list(struct.unpack('<3i',cpu.mem_read(sp+4,12))))
cpu.hook_add(UC_HOOK_CODE,capture,begin=impulse,end=impulse)
cases=[]
for x,y in [(0,0),(1,0),(10<<16,0),(0,-10<<16),(20<<16,20<<16),(63<<16,0),(64<<16,0),(100<<16,0),(123456,-456789)]:
 for damage in [0,1,30,100]:
  for push in [0,50,100]:
   for factor in [0,1,2]:
    for scale in [65536,32768]:
     write(owner+0x90,x&0xffffffff);write(owner+0x94,y&0xffffffff);write(owner+0xd8,scale);write(context+0x814,factor)
     requests=[];sp=stack+0xf000
     for i,value in enumerate([stop,push,damage,0,0]):write(sp+i*4,value)
     cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4f4560,stop,count=10000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Blast did not return')
     result=cpu.reg_read(UC_X86_REG_EAX);result=result if result<0x80000000 else result-0x100000000
     cases.append(dict(x=x,y=y,damage=damage,push=push,factor=factor,scale=scale,result=result,impulses=requests))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004F4560',method='Original radial falloff, vector normalization, integer square root and fixed arithmetic; captured virtual body impulse.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} radial blast cases')
