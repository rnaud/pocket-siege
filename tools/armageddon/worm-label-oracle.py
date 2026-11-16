"""Capture the native worm-label font selection block (004D8C20..004D8C63)."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EBP
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
cpu.mem_map(context,0x20000)
write(owner+0x38,context)
cases=[]
for color in range(6):
 for selected in [0,1]:
  for suppressed in [0,1]:
   for tick in [-51,-25,-1,0,24,25,49,50,74,75,2147483647]:
    write(owner+0x10c,color);write(owner+0x104,selected);write(owner+0x108,suppressed)
    write(context+0x1b8ec,tick&0xffffffff)
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(0x4d8c20,0x4d8c63,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=0x4d8c63:raise RuntimeError('Font branch did not complete')
    cases.append({'color':color,'selected':selected,'suppressed':suppressed,'tick':tick,'font':cpu.reg_read(UC_X86_REG_EBX)})
args.output.write_text(json.dumps({'sha256':digest,'cases':cases},separators=(',',':'))+'\n')
print(f'{len(cases)} native worm label font cases')
