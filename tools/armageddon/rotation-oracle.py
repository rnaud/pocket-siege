"""Execute original body rotation block in Unicorn.

Runs 004CA5F5..004CA682 and original fixed arithmetic with supplied
post-collision velocity, radius and angle. No game entry point runs.
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




def observe(cpu,address,size,user):
 if address==0x4ca682:cpu.emu_stop()
cpu.hook_add(UC_HOOK_CODE,observe)
cases=[]
for radius in [0,0x20000,0x100000]:
 for vx in [-0x200000,-65536,-1,0,1,65535,65536,0x200000]:
  for vy in [-0x200000,-196608,-196605,0,196605,196608,0x200000]:
   for angle in [0,65535,0x7fffffff]:
    body=dict(radius=radius,vx=vx,vy=vy,angle=angle,angularVelocity=123)
    for key,offset in [('radius',0x5c),('vx',0x9c),('vy',0xa0),('angle',0x98),('angularVelocity',0xa4)]:write(owner+offset,body[key]&0xffffffff)
    cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xf000)
    cpu.emu_start(0x4ca5f5,stop,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=0x4ca682:raise RuntimeError('Rotation did not reach boundary')
    result={key:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for key,offset in [('angle',0x98),('angularVelocity',0xa4)]}
    cases.append(dict(body=body,result=result))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original 004CA5F5..004CA682 rotation and fixed arithmetic, supplied post-collision body.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} rotation cases')
