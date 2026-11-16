"""Execute original casing ejection instructions in Unicorn.

Original casing ejection instructions execute; RNG is supplied and playback is captured. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
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



context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
manager,vtable=owner+0x3000,owner+0x5000
write(context+0x7d4,manager);write(manager,vtable);write(vtable+0x24,0x4c8c60)
worm_vtable=owner+0x6000
write(owner,worm_vtable);write(worm_vtable+0x5c,0x4d0f50);write(worm_vtable+0x60,0x4d0f70)
state={}
def capture(cpu,address,size,user):
 if address==0x4ee7f0:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  state['request']=list(struct.unpack('<12i',cpu.mem_read(sp+4,48)));cpu.emu_stop()
 elif address==0x4fae51:cpu.emu_stop()
cpu.hook_add(UC_HOOK_CODE,capture)
cases=[]
for sprite in [0,0x338,0x33c]:
 for facing in [-1,0,1]:
  for seed in [0,42,0xffffffff]:
   for gravity in [0,0x3d70,-0x3d70]:
    state.clear();state['request']=None
    write(context+0x1ad0,seed);write(manager+0x3b8,gravity&0xffffffff);write(owner+0x1b0,facing&0xffffffff)
    sp=stack+0xf000
    write(owner+0x90,100*65536+456);write(owner+0x94,200*65536+123)
    write(owner+0x9c,0);write(owner+0xa0,0)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ESI,owner)
    cpu.emu_start(0x4fa874,0x4fa894,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=0x4fa894:raise RuntimeError('Position getter block did not finish')
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EBX,sprite)
    cpu.emu_start(0x4faddb,stop,count=1000)
    cases.append(dict(sprite=sprite,facing=facing,seed=seed,gravity=gravity,x=100*65536+456,y=200*65536+123,request=state['request'],random=read(context+0x1ad0)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,block='004FA874–004FA894 then 004FADDB–004FAE51',method='Original position/velocity getters 004D0F50/004D0F70 fill firing stack, followed by ejection block and LCG, original 004C8C60 gravity getter; captured twelve-word 004EE7F0 request.',cases=cases),indent=2)+'\n')
print(f'Captured {len(cases)} casing requests')
