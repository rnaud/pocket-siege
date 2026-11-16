"""Execute original projectile camera request block004E4C16..004E4C76."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EBP
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

from unicorn.x86_const import UC_X86_REG_EDI
context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
submerged_hook=stop+0x100
cpu.mem_write(submerged_hook,b'\xc3')
current_submerged=0
def hook(cpu,address,size,user):
 if address==submerged_hook:cpu.reg_write(UC_X86_REG_EAX,current_submerged)
cpu.hook_add(UC_HOOK_CODE,hook)
def signed(v):return v if v<0x80000000 else v-0x100000000
cases=[]
for limits in [[0,1200*65536,0],[-100*65536,1920*65536,-256*65536]]:
 for x in [limits[0]-1,limits[0],limits[0]+1,limits[1]-1,limits[1],limits[1]+1]:
  for y in [limits[2]-1,limits[2],limits[2]+1,1000*65536]:
   for submerged in [0,1]:
    current_submerged=submerged
    for offset,v in zip([0x1b8cc,0x1b8d0,0x1b8d4],limits):write(context+offset,v&0xffffffff)
    cpu.mem_write(context+0x124a4,b'\0'*280)
    sp=stack+0xff00;write(sp+0x14,x&0xffffffff);write(sp+0x10,y&0xffffffff)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EDI,submerged_hook)
    cpu.emu_start(0x4e4c16,0x4e4c76,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=0x4e4c76:raise RuntimeError('Camera block did not finish')
    groups=[[signed(read(context+0x124a4+i*20+j*4)) for j in range(5)] for i in range(14)]
    active=[(i,g) for i,g in enumerate(groups) if g[0]]
    if len(active)!=1:raise RuntimeError('Expected one camera request')
    priority,g=active[0]
    cases.append(dict(limits=limits,x=x,y=y,submerged=submerged,request=[priority,g[1],g[2]]))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E4C16..004E4C76 and004EE990 executed unchanged; submerged virtual getter supplied by hook.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} projectile camera requests')
