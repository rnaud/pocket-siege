"""Execute original team environment modifiers."""
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


context,manager,vt,setgravity=owner+0x20000,owner+0x1000,owner+0x2000,owner+0x3000
cpu.mem_map(context,0x20000);write(owner+0x38,context);write(owner+0x128,1)
write(context+0x7d4,manager);write(manager,vt);write(vt+0x20,setgravity);cpu.mem_write(setgravity,b'\xc2\x04\x00')
def hook(cpu,address,size,user):
 global gravity
 if address==setgravity:gravity=signed(read(cpu.reg_read(UC_X86_REG_ESP)+4))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for flags in [0,1,2,16,17,255]:
 for percent in [0,50,100,125,-100,2147483647]:
  for multiplier in [1,3]:
   write(context+0x1b94+0x51c+4,flags);write(context+0x814,multiplier);write(context+0x818,percent)
   cpu.reg_write(UC_X86_REG_ESP,stack+0xf000);cpu.reg_write(UC_X86_REG_EBX,owner);gravity=None
   cpu.emu_start(0x4b6aec,0x4b6b68,count=1000)
   if cpu.reg_read(UC_X86_REG_EIP)!=0x4b6b68:raise RuntimeError('Environment block did not finish')
   cases.append({'input':{'damageMultiplier':multiplier,'gravityPercent':percent},'flags':flags,'output':{'damageMultiplier':signed(read(context+0x814)),'gravityPercent':signed(read(context+0x818)),'gravity':gravity}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004B6AEC..004B6B68','method':'Original team flag getters, latched environment writes and signed gravity conversion; manager gravity setter captured.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} environment cases')
