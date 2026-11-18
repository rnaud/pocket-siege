"""Execute original004DDBD0 ground slope sampling and pose hysteresis block."""
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

vt=owner+0x1000
for offset,address,argc in [(0xf4,stop+0x100,0),(0x44,stop+0x200,4)]:
 write(vt+offset,address);cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:calls.append(['airborne']);cpu.reg_write(UC_X86_REG_EAX,airborne)
 elif address==stop+0x200:
  calls.append(['sample']+[signed(read(sp+4+i*4)) for i in range(3)])
  write(read(sp+16),sample or 0);cpu.reg_write(UC_X86_REG_EAX,int(sample is not None))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for pending in [0,1,-1]:
 for variant in [-1,0,1]:
  for facing in [-1,0,1]:
   for airborne in [0,1]:
    for slope in [-65536,-21627,-21626,-1,0,1,21626,21627,65536]:
     for sample in [None,-65536,65536]:
      for offset,value in [(0x19c,pending),(0x198,slope),(0x1b4,variant),(0x1b0,facing)]:write(owner+offset,value)
      sp=stack+0xf000;write(sp+0x18,123456);write(sp+0x1c,-765432)
      cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESI,vt)
      calls=[];cpu.emu_start(0x4deda7,0x4dee66,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==0x4dee66
      cases.append(dict(pending=pending,variant=variant,facing=facing,airborne=airborne,slope=slope,sample=sample,calls=calls,result={key:signed(read(owner+offset)) for key,offset in [('pending',0x19c),('slope',0x198),('variant',0x1b4)]}))
args.output.write_text(json.dumps(dict(sha256=digest,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} ground slope cases')
