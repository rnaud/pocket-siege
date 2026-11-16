"""Execute original004E1C3B..004E1C87 placement branch."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EDI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EBP
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

context,manager,vtable,bodytable,probe,destroy=owner+0x1000,owner+0x2000,owner+0x3000,owner+0x4000,owner+0x5000,owner+0x6000
write(owner,bodytable);write(owner+0x38,context);write(context+0x7d4,manager);write(manager,vtable);write(vtable+12,probe);write(bodytable,destroy)
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 if address not in [probe,destroy,0x4e2ea0]:return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==probe:
  cleanup=12;calls.append(dict(operation='probe',request=[signed(read(sp+8)),signed(read(sp+12))],origin=[signed(read(owner+0x90)),signed(read(owner+0x94))]));cpu.reg_write(UC_X86_REG_EAX,hit)
 elif address==destroy:
  cleanup=4;calls.append(dict(operation='delete',request=[read(sp+4)]))
 else:
  cleanup=8;calls.append(dict(operation='detonate',request=[signed(read(sp+4)),signed(read(sp+8))]))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for x,y in [(0,0),(65536,131072),(-65537,345678),(2147483647,-2147483648)]:
 for hit in [0,1,42]:
  write(owner+0x90,0);write(owner+0x94,0xfc000000);write(owner+0x138,x&0xffffffff);write(owner+0x13c,y&0xffffffff);write(owner+0xb8,7)
  sp=stack+0xff00;write(sp,x&0xffffffff);write(sp+4,y&0xffffffff)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_EDI,x&0xffffffff);cpu.reg_write(UC_X86_REG_ESI,y&0xffffffff)
  calls=[];cpu.emu_start(0x4e1c3b,0x4e1c87,count=1000)
  cases.append(dict(x=x,y=y,hit=hit,calls=calls,position=[signed(read(owner+0x90)),signed(read(owner+0x94))],sleeping=read(owner+0xb8)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E1C3B..004E1C87; placement, detonation and deletion interfaces captured. Base constructor004F4000 sentinel origin supplied.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} placement cases')
