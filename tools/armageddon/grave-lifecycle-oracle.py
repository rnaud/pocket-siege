"""Execute original grave lifecycle instructions in Unicorn.

Original grave progress/depth/bubble instructions execute; RNG and bubble allocation are supplied. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP
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



context,vtable,destroy=owner+0x8000,owner+0x3000,owner+0x5000
write(owner+0x38,context);write(owner,vtable);write(vtable,destroy)
cpu.mem_write(0x4ee930,b'\xb8\x03\x00\x00\x00\xc3')
cpu.mem_write(0x4edfa0,b'\xc2\x14\x00')
state={}
def capture(cpu,address,size,user):
 if address==destroy:state['retired']=True;cpu.emu_stop()
 elif address in [0x4d57c0,0x4d598e]:cpu.emu_stop()
 elif address==0x4edfa0:
  esp=cpu.reg_read(UC_X86_REG_ESP)
  state['sizes'].append(read(esp+20))
cpu.hook_add(UC_HOOK_CODE,capture)
cases=[]
for y in [99*65536,100*65536-1,100*65536,101*65536,-1]:
 for wet in [0,1]:
  for phase in [0,0x3fff,0xc000,0xffff,0x28000,2147483647]:
   for progress in [0,2147483647]:
    state.clear();state.update(retired=False,sizes=[])
    write(context+0x808,100)
    for offset,value in [(0xfc,wet),(0x104,phase),(0x108,progress)]:write(owner+offset,value&0xffffffff)
    esp=stack+0xf000;write(esp+0x10,y&0xffffffff);write(esp+0x14,50*65536)
    cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_ESP,esp)
    cpu.emu_start(0x4d5717,stop,count=5000)
    signed=lambda offset:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0]
    cases.append(dict(y=y,depth=100,wet=bool(wet),phase=phase,progress=progress,result=dict(alive=not state['retired'],phase=signed(0x104),progress=signed(0x108),bubbles=len(state['sizes']))))
args.output.write_text(json.dumps(dict(executable_sha256=digest,block='004D5717–004D57C0 / 004D598E',method='Original depth/progress/bubble arithmetic; destructor and bubble allocation captured, RNG returns 3.',cases=cases),indent=2)+'\n')
print(f'Captured {len(cases)} grave lifecycle cases')
