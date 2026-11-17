"""Execute the original walking input accumulator and acceleration in Unicorn.

Collision queries are recorded with their real calling convention. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP
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
cpu.mem_map(context,0x10000)
manager,vt,probe=owner+0x1000,owner+0x2000,owner+0x3000
bodyvt,transition,position=owner+0x4000,owner+0x5000,owner+0x5100
animator,animvt,animget,animset=owner+0x6000,owner+0x6100,owner+0x6200,owner+0x6300
cpu.mem_write(bodyvt,bytes(cpu.mem_read(0x526de0,0x180)))
write(owner,bodyvt);write(owner+0x38,context);write(context+0x7d4,manager);write(manager,vt);write(vt+0xc,probe)
write(bodyvt+0x80,transition);write(bodyvt+0x100,position)
write(owner+0x350,animator);write(animator,animvt);write(animvt+0xc,animget);write(animvt+0x10,animset)
for address,pop in [(probe,12),(transition,4),(position,8),(animget,8),(animset,4),(0x4edc30,4),(0x4edb90,20)]:cpu.mem_write(address,bytes([0xc2,pop,0]))
cpu.mem_write(0x4f8790,b'\xc3')
fields={'x':0x90,'y':0x94,'state':0x50,'facing':0x1b0,'progress':0x1f8,'cycle':0x1f4,'anchorX':0x1fc,'field19c':0x19c,'soundHandle':0x38c}
def signed(address):return struct.unpack('<i',cpu.mem_read(address,4))[0]

cpu.mem_write(0x4dc860,b'\xc3')
cpu.mem_write(0x4c29c0,b'\xc2\x04\x00')
def observe(cpu,address,size,user):
 global steps
 if address==0x4dc860:
  steps+=1;write(owner+0x50,stepState)
 elif address==0x4c29c0:cpu.reg_write(UC_X86_REG_EAX,2 if fast else 0)
cpu.hook_add(UC_HOOK_CODE,observe)
cases=[]
for state in [0x65,0x66,0x67]:
 for speed in [0,65535,65536,67502,130000,131072]:
  for accumulator in [0,1,32768,65535]:
   for fast in [False,True]:
    for stepState in [0x65,0x66,0x7e]:
     inp={'state':state,'speed':speed,'accumulator':accumulator}
     write(owner+0x50,state);write(owner+0x200,speed);write(owner+0x204,accumulator)
     for offset in [0x1bc,0x1c0,0x1dc,0x1e0,0x1e4]:write(owner+offset,0)
     write(owner+0x1e8,1)
     write(stack+0xff00,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
     steps=0;cpu.emu_start(0x4dd020,stop,count=10000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Walking input did not return')
     output={'state':signed(owner+0x50),'speed':signed(owner+0x200),'accumulator':signed(owner+0x204)}
     cases.append({'input':inp,'fast':fast,'stepState':stepState,'steps':steps,'output':output})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004DD020','method':'Native input accumulator and acceleration execute with the walking step and team modifier lookup supplied as interfaces.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} walking cadence cases')
