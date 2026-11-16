"""Capture original004F7120 burst countdown and next-state requests."""
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

vtable=owner+0x1000; transition=stop+0x80
write(owner,vtable);write(vtable+0x80,transition)
cpu.mem_write(transition,b'\xc2\x04\x00')
target=None
def observe(cpu,address,size,user):
 global target
 if address==transition:target=read(cpu.reg_read(UC_X86_REG_ESP)+4)
cpu.hook_add(UC_HOOK_CODE,observe)
fields={'actions':0x298,'maxActions':0x29c,'trigger':0x2a0,'ordinal':0x2a4,'total':0x2a8,'delay':0x2ac}
cases=[]
for ordinal,total in [(1,6),(6,6),(1,10),(1,20),(7,6)]:
 for delay in [-2147483648,-1,0,1,19,20,21,500]:
  for trigger in [0,1]:
   for actions in [0,1,2]:
    before=dict(ordinal=ordinal,total=total,delay=delay,trigger=trigger,actions=actions,maxActions=1)
    for name,offset in fields.items():write(owner+offset,before[name]&0xffffffff)
    sp=stack+0xff00;write(sp,stop);target=None
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
    cpu.emu_start(0x4f7120,stop,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Burst tick did not return')
    after={name:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for name,offset in fields.items()}
    cases.append({'before':before,'after':after,'target':target})
args.output.write_text(json.dumps({'sha256':digest,'cases':cases},separators=(',',':'))+'\n')
print(f'{len(cases)} native burst ticks')
