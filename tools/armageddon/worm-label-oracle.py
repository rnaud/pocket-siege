"""Capture the native worm-label font selection block (004D8C20..004D8C63)."""
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

context=0x2300000
cpu.mem_map(context,0x20000)
write(owner+0x38,context)
cases=[]
for color in range(6):
 for selected in [0,1]:
  for suppressed in [0,1]:
   for tick in [-51,-25,-1,0,24,25,49,50,74,75,2147483647]:
    write(owner+0x10c,color);write(owner+0x104,selected);write(owner+0x108,suppressed)
    write(context+0x1b8ec,tick&0xffffffff)
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(0x4d8c20,0x4d8c63,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=0x4d8c63:raise RuntimeError('Font branch did not complete')
    cases.append({'color':color,'selected':selected,'suppressed':suppressed,'tick':tick,'font':cpu.reg_read(UC_X86_REG_EBX)})
# Complete damage-label renderer with supplied position, text raster and render queue.
vt,position=owner+0x1000,owner+0x1100
write(owner,vt);write(vt+0x5c,position)
for address,count in [(position,8),(0x4edb70,4),(0x4c67a0,28),(0x4eed70,40)]:
 cpu.mem_write(address,b'\xc2'+struct.pack('<H',count))
def signed(value):return value if value<0x80000000 else value-0x100000000
def render_hook(cpu,address,size,user):
 global result,font
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==position:
  write(read(sp+4),render_input['x']&0xffffffff);write(read(sp+8),render_input['y']&0xffffffff)
 elif address==0x4edb70:cpu.reg_write(UC_X86_REG_EAX,0)
 elif address==0x4c67a0:
  font=signed(read(sp+8));write(read(sp+20),14);write(read(sp+24),16);cpu.reg_write(UC_X86_REG_EAX,123)
 elif address==0x4eed70:result=dict(order=signed(read(sp+4)),x=signed(read(sp+8)),y=signed(read(sp+12)),font=font)
for address in [position,0x4edb70,0x4c67a0,0x4eed70]:cpu.hook_add(UC_HOOK_CODE,render_hook,begin=address,end=address)
damage=[]
for active in [0,1]:
 for progress in [0,1,0x3fff,0x4000,0x7fff,0x8000,0xffff,-1,0x7fffffff]:
  for color in [0,2,5]:
   for rank in [0,3]:
    render_input=dict(x=-17*65536,y=250*65536,active=active,progress=progress,color=color,rank=rank)
    write(owner+0x10c,color);write(owner+0x158,0);write(owner+0x184,active);write(owner+0x180,progress&0xffffffff);write(context+0x1030,rank)
    sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);result=None;font=None
    cpu.emu_start(0x4d8fc0,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Damage renderer did not return')
    damage.append(dict(input=render_input,output=result))
args.output.write_text(json.dumps({'sha256':digest,'cases':cases,'damage':damage},separators=(',',':'))+'\n')
print(f'{len(cases)} native worm label font cases')
