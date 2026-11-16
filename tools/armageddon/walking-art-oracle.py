"""Execute original walking animation instructions in Unicorn.

Animation interface calls are recorded with their real calling convention. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP
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
animator,vtable,progress_call=owner+0x800,owner+0x3000,owner+0x5000
write(owner+0x350,animator);write(animator,vtable);write(vtable+0x10,progress_call)
cpu.mem_write(progress_call,b'\xc2\x04\x00')
cpu.mem_write(0x4edb90,b'\x31\xc0\xc2\x14\x00')
cases=[]
for previous in [i*0xf5c for i in range(60)]+[-1,0x8000,0xffff,2147483647,-2147483648]:
 for cycle in [-1,previous>>16]:
  write(owner+0x1f8,previous&0xffffffff);write(owner+0x1f4,cycle&0xffffffff);write(owner+0x38c,0)
  cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xfe00)
  cpu.emu_start(0x4dc9d0,0x4dca92,count=1000)
  if cpu.reg_read(UC_X86_REG_EIP)!=0x4dca92:raise RuntimeError('Walk block did not finish')
  cases.append({'previous':previous,'cycle':cycle,'progress':struct.unpack('<i',cpu.mem_read(owner+0x1f8,4))[0],'next_cycle':struct.unpack('<i',cpu.mem_read(owner+0x1f4,4))[0]})
slopes=[]
for slope in [-2147483648,-10,-1,0,1,10,2147483647]:
 write(owner+0x1b4,slope&0xffffffff);write(owner+0x4000,0x20)
 cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESI,owner+0x4000);cpu.reg_write(UC_X86_REG_ECX,0x20)
 cpu.emu_start(0x4db89d,0x4db8e4,count=100)
 slopes.append({'slope':slope,'sprite':read(owner+0x4000)})
args.output.write_text(json.dumps({'executable_sha256':digest,'blocks':['004DC9D0–004DCA92','004DB89D–004DB8E4'],'method':'Original progress and slope instructions execute; animation setter and audio backend stubbed.','cases':cases,'slopes':slopes},indent=2)+'\n')
print(f'Captured {len(cases)} walking ticks and {len(slopes)} slopes')
