"""Execute original0049C030 fixed-point direction-to-turn conversion."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP
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
values=[-0x80000000,-0x7fffffff,-0x100001,-0x100000,-65537,-65536,-32768,-6,-5,-4,-1,0,1,4,5,6,32768,65535,65536,65537,0x100000,0x100001,0x7fffffff]
for x in values:
 for y in values:
  cpu.mem_write(stack+0xff00,struct.pack('<3I',stop,x&0xffffffff,y&0xffffffff));cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
  cpu.emu_start(0x49c030,stop,count=10000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Direction conversion did not return')
  result=cpu.reg_read(UC_X86_REG_EAX)&65535
  cases.append(dict(x=x,y=y,turn=result-65536 if result>=32768 else result))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original0049C030 with original0049C440 fixed-point polynomial and multiply/divide; signed short return captured. No interfaces stubbed.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} direction cases')
