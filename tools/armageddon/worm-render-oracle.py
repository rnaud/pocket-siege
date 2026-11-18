"""Execute original004D8B20 worm sprite render requests."""
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

context=owner+0x20000;cpu.mem_map(context,0x20000)
vt=owner+0x1000;write(owner,vt);write(owner+0x38,context);write(owner+0xfc,2);write(owner+0x158,3)
write(vt+0x7c,stop+0x100);cpu.mem_write(stop+0x100,b'\xc3')
for address,argc in [(0x4db780,4),(0x4c29c0,1),(0x4eedf0,6)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4db780:
  for i,v in enumerate([123456,-765432,sprite,progress]):write(read(sp+4+i*4),v)
  calls.append(['sprite'])
 elif address==0x4c29c0:calls.append(['teamFlags',read(sp+4)]);cpu.reg_write(UC_X86_REG_EAX,flags)
 elif address==stop+0x100:calls.append(['state']);cpu.reg_write(UC_X86_REG_EAX,state)
 elif address==0x4eedf0:calls.append(['draw']+[signed(read(sp+4+i*4)) for i in range(6)])
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for state in list(range(99,139))+[-1,2147483647]:
 for rank in [-1,0,17,2147483647]:
  for flags in [0,8,9]:
   for poison in [0,1]:
    sprite=35|(0x40000 if rank&1 else 0);progress=-12345 if flags else 65536
    write(context+0x1030+3*4,rank);write(owner+0x148,poison)
    sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    calls=[];cpu.emu_start(0x4d8b20,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(state=state,rank=rank,flags=flags,poison=poison,sprite=sprite,progress=progress,calls=calls))
args.output.write_text(json.dumps(dict(sha256=digest,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} worm render requests')
