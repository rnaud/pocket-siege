"""Execute original worm damage accounting instructions in Unicorn.

Original worm damage accounting instructions execute; team health storage is supplied and events captured. No game entry point runs.
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
vtable,state_fn=owner+0x2000,owner+0x3000;write(owner,vtable);write(vtable+0x7c,state_fn);cpu.mem_write(state_fn,b'\xc3')
for addr,n in [(0x4c2cc0,8),(0x4c2e50,8),(0x4c2dd0,12),(0x4c2e10,12),(0x4b26a0,24)]:cpu.mem_write(addr,b'\xc2'+struct.pack('<H',n))
health=0;total=0;events=[];native_state=0
write(owner+0xfc,2);write(owner+0x100,3)
def capture(cpu,address,size,user):
 global health,total
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4c2cc0:cpu.reg_write(UC_X86_REG_EAX,health)
 elif address==0x4c2e50:cpu.reg_write(UC_X86_REG_EAX,total)
 elif address==0x4c2dd0:total=read(sp+12)
 elif address==0x4c2e10:health=read(sp+12)
 elif address==state_fn:cpu.reg_write(UC_X86_REG_EAX,native_state)
 else:events.append(list(struct.unpack('<4i',cpu.mem_read(read(sp+24),16))))
for addr in [0x4c2cc0,0x4c2e50,0x4c2dd0,0x4c2e10,0x4b26a0,state_fn]:cpu.hook_add(UC_HOOK_CODE,capture,begin=addr,end=addr)
cases=[]
for hp in [0,10,100]:
 for damage in [-1,0,5,120]:
  for multiplier in [0,1,2]:
   for immune,force,uncapped in [(0,0,0),(1,0,0),(1,1,0),(0,0,1)]:
    for native_state in [0x65,0x6d]:
     health=hp;total=7;events=[];write(context+0x1abc,immune);cpu.mem_write(context+0x11d66,bytes([uncapped]));write(owner+0x188,9);write(owner+0x180,12);write(owner+0x184,1)
     sp=stack+0xf000
     for i,value in enumerate([stop,damage,force,multiplier]):write(sp+i*4,value&0xffffffff)
     cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4d8440,stop,count=10000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Damage accounting failed to return')
     displayed=read(owner+0x188);displayed=displayed if displayed<0x80000000 else displayed-0x100000000
     cases.append(dict(hp=hp,damage=damage,multiplier=multiplier,immune=immune,force=force,uncapped=uncapped,state=native_state,result=dict(hp=health,total=total,displayed=displayed,reset=read(owner+0x180),events=events)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004D8440',method='Original damage accounting; supplied health/cumulative damage storage, state getter, captured event0x430.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} damage accounting cases')
