"""Execute original crate visibility and special-content classification."""
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


context=owner+0x20000
cpu.mem_map(context,0x20000);write(owner+0x38,context)
# Automatic inventory consumption is separately verified; isolate its result flags.
cpu.mem_write(0x4b62d0,b'\xc3')
def hook(cpu,address,size,user):
 if address in [0x4b6aec,0x4b6b38]:cpu.emu_stop()
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for team in [0,1,2,6]:
 for visible in [0,1,2]:
  for controller in [0,1,127,128,255]:
   for flags in [0,1,16,32,33,255]:
    write(owner+0x128,team);write(context+0x1c160+team*4,visible)
    cpu.mem_write(context+0x3cd0+team*3000,bytes([controller]))
    write(context+0x1b94+4+team*0x51c,flags);write(context+0x1be98,99)
    cpu.reg_write(UC_X86_REG_ESP,stack+0xf000);cpu.reg_write(UC_X86_REG_EBX,owner)
    cpu.emu_start(0x4b6a77,stop,count=1000)
    assert cpu.reg_read(UC_X86_REG_EIP) in [0x4b6aec,0x4b6b38]
    cases.append(dict(team=team,visible=visible,controller=controller,flags=flags,result=bool(read(context+0x1be98))))
special=[]
for slot in list(range(-1,73))+[2147483647,-2147483648]:
 sp=stack+0xf000;write(sp,stop);write(sp+4,slot);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(0x4aa8f0,stop,count=1000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 special.append(dict(slot=slot,result=bool(cpu.reg_read(UC_X86_REG_EAX))))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004B6A77..004B6AEC / 004AA8F0',method='Original visibility block, scene/team getters and special-content classifier. Automatic utility consumption substituted with no-op; flags supplied after consumption.',cases=cases,special=special),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} visibility and {len(special)} content cases')
