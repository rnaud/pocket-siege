"""Execute original sight geometry instructions in Unicorn.

Original geometry block, trigonometry and fixed multiplication execute unchanged. No game entry point runs.
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



vtable,position_call=owner+0x3000,owner+0x5000
write(owner,vtable);write(vtable+0x5c,position_call)
cpu.mem_write(position_call,b'\xc2\x08\x00')
def capture(cpu,address,size,user):
 if address==position_call:
  esp=cpu.reg_read(UC_X86_REG_ESP)
  write(read(esp+4),100*65536);write(read(esp+8),200*65536)
cpu.hook_add(UC_HOOK_CODE,capture)
cases=[]
for aim in [0,1,0x2000,0x4000,0x8000,0xc000,0xffff,0x10000,-1]:
 for facing in [-1,1]:
  for opening in [0,13107,32768,65531,65536]:
   for offset,value in [(0x284,aim),(0x1b0,facing),(0x280,opening)]:write(owner+offset,value&0xffffffff)
   esp=stack+0xf000
   cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_ESP,esp)
   cpu.emu_start(0x4fb9c3,0x4fba79,count=2000)
   if cpu.reg_read(UC_X86_REG_EIP)!=0x4fba79:raise RuntimeError('Geometry block did not finish')
   signed=lambda offset:struct.unpack('<i',cpu.mem_read(esp+offset,4))[0]
   cases.append(dict(aim=aim,facing=facing,opening=opening,x=100*65536,y=200*65536,result=dict(x=signed(0x18),y=signed(0x14),dx=signed(0x40),dy=signed(0x10))))
args.output.write_text(json.dumps(dict(executable_sha256=digest,block='004FB9C3–004FBA79',method='Original direction, trigonometry, offset and fixed multiplication execute unchanged; position getter supplies coordinates.',cases=cases),indent=2)+'\n')
print(f'Captured {len(cases)} sight geometry cases')
