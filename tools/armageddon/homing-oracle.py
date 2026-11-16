"""Execute original004E30F0 homing acceleration with original math routines."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP
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

vtable=owner+0x2000
write(owner,vtable)
addresses={owner+0x3000:'position',owner+0x3100:'velocity',owner+0x3200:'setVelocity'}
for offset,address in [(0x5c,owner+0x3000),(0x60,owner+0x3100),(0x104,owner+0x3200)]:write(vtable+offset,address)
fields=dict(x=0x90,y=0x94,vx=0x9c,vy=0xa0,initialized=0x100,steerX=0x104,steerY=0x108,targetX=0x148,targetY=0x14c)
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 if address not in addresses:return
 name=addresses[address];sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+4*i)
 if name=='setVelocity':write(owner+0x9c,arg(0));write(owner+0xa0,arg(1))
 else:
  offset=0x90 if name=='position' else 0x9c
  write(arg(0),read(owner+offset));write(arg(1),read(owner+offset+4))
 cpu.reg_write(UC_X86_REG_ESP,sp+12);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for initialized in [0,1]:
 for vx,vy in [(0,0),(65536,-65536),(0x100000,0),(-0x100000,0),(0,0x100001),(0,-0x100001),(0x90000,-0x70000)]:
  for dx,dy in [(0,0),(65535,0),(65536,0),(-65536,0),(0,65536),(65536,65536),(0x7800000,0),(-0x7800000,0),(0,0x7800000),(0,-0x7800000),(0x4000000,0x4000000),(0x7fffffff,-0x70000000)]:
   body=dict(x=0x170000,y=-0x190000,vx=vx,vy=vy,initialized=initialized,steerX=-vy,steerY=vx,targetX=signed((0x170000+dx)&0xffffffff),targetY=signed((-0x190000+dy)&0xffffffff))
   for name,offset in fields.items():write(owner+offset,body[name]&0xffffffff)
   write(stack+0xff00,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
   cpu.emu_start(0x4e30f0,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Steering did not return')
   cases.append(dict(body=body,output={name:signed(read(owner+offset)) for name,offset in fields.items()}))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E30F0 with original vector length, multiply, divide and clamp; position/velocity getters and velocity setter supplied.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} homing steering cases')
