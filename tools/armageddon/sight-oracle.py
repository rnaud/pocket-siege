"""Execute original sight easing instructions in Unicorn.

Original easing block and fixed multiplication execute unchanged. No game entry point runs.
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


cases=[]
for opening in [0,1,13107,32768,65531,65536,-1,2147483647,-2147483648]:
 for aim in [0,32768,65535,-100]:
  for target in [0,49151,65535]:
   for offset,value in [(0x280,opening),(0x284,aim),(0x260,target)]:write(owner+offset,value&0xffffffff)
   cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xf000)
   cpu.emu_start(0x4fb47c,0x4fb4de,count=1000)
   if cpu.reg_read(UC_X86_REG_EIP)!=0x4fb4de:raise RuntimeError('Sight block did not finish')
   signed=lambda address:struct.unpack('<i',cpu.mem_read(address,4))[0]
   cases.append(dict(opening=opening,aim=aim,target=target,next=dict(opening=signed(owner+0x280),aim=signed(owner+0x284))))
args.output.write_text(json.dumps(dict(executable_sha256=digest,block='004FB47C–004FB4DE',method='Original easing and fixed multiplication execute unchanged; surrounding state gates excluded.',cases=cases),indent=2)+'\n')
print(f'Captured {len(cases)} sight easing cases')
