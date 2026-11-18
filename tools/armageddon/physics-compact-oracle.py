"""Execute original dirty collision-list compaction and buffer swaps."""
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


cases=[]
for seed in range(96):
 cpu.mem_write(owner,bytes((i*13+seed)&255 for i in range(0x10000)))
 for index in range(33):
  at=owner+(0x18 if index==0 else 0x34+(index-1)*0x1c)
  storage=owner+0x1000+index*0x200
  count=(seed+index)%17
  for offset,value in [(4,32),(8,(seed+index)%3),(12,count),(16,storage),(20,storage+0x100),(24,0xabcdef01)]:write(at+offset,value)
  for slot in range(count):write(storage+slot*4,0 if (seed+slot+index)%4==0 else 0x80000000+index*32+slot)
 initial=bytes(cpu.mem_read(owner,0x10000))
 sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4ca7e0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(seed=seed,sha256=hashlib.sha256(cpu.mem_read(owner,0x10000)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004CA7E0',method='Unmodified native compaction; all 33 lists, dirty/clean flags, sparse entries and complete memory including inactive buffer tails.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'registry compactions')
