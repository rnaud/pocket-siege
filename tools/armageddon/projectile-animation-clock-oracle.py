"""Execute original projectile animation rate initialization and tick advancement."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESI, UC_X86_REG_EDI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP
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

def signed(v):return v if v<0x80000000 else v-0x100000000
rates=[]
for x in [-2147483648,-65537,-256,-1,0,255,65536,2147483647]:
 for y in [-2147483648,-65536,-1,0,65536,2147483647]:
  write(owner+0x138,x&0xffffffff);write(owner+0x13c,y&0xffffffff)
  cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_ECX,0)
  cpu.emu_start(0x4e1a6c,0x4e1ac6,count=1000)
  rates.append(dict(x=x,y=y,rate=read(owner+0x128)))
cases=[]
config=owner+0x2000
for mode in range(8):
 for rate in [-2147483648,-65536,-1,0,65536,68812,2147483647]:
  for progress in [-2147483648,-1,0,65535,2147483647]:
   write(config+8,mode);write(owner+0x128,rate&0xffffffff);write(owner+0x3dc,progress&0xffffffff)
   cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EDI,config)
   cpu.emu_start(0x4e4510,0x4e4546,count=1000)
   cases.append(dict(mode=mode,rate=rate,progress=progress,output=signed(read(owner+0x3dc))))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E1A6C..004E1AC6 rate setup and004E4510..004E4546 progress tick; signed and overflow boundaries.',rates=rates,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(rates)} rates and {len(cases)} animation ticks')
