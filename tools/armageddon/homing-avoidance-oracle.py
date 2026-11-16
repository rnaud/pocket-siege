"""Execute original004E3270 homing obstacle avoidance with original math routines."""
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
context=owner+0x4000
terrain=owner+0x5000
terrain_vtable=owner+0x6000
query=owner+0x3300
write(owner,vtable);write(owner+0x38,context);write(context+0x24,terrain)
write(terrain,terrain_vtable);write(terrain_vtable+0x28,query)
addresses={owner+0x3000:'position',owner+0x3200:'setVelocity',query:'solid'}
for offset,address in [(0x5c,owner+0x3000),(0x104,owner+0x3200)]:write(vtable+offset,address)
fields=dict(x=0x90,y=0x94,vx=0x9c,vy=0xa0,initialized=0x100,steerX=0x104,steerY=0x108,targetX=0x148,targetY=0x14c)
def signed(v):return v if v<0x80000000 else v-0x100000000
queries=[]
def hook(cpu,address,size,user):
 if address not in addresses:return
 name=addresses[address];sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+4*i)
 if name=='setVelocity':write(owner+0x9c,arg(0));write(owner+0xa0,arg(1))
 elif name=='solid':
  x,y=signed(arg(0)),signed(arg(1))
  hit=any(l<=x<=r and b<=y<=t for l,b,r,t in rectangles)
  queries.append([x,y,int(hit)]);cpu.reg_write(UC_X86_REG_EAX,int(hit))
 else:
  write(arg(0),read(owner+0x90));write(arg(1),read(owner+0x94))
 cpu.reg_write(UC_X86_REG_ESP,sp+12);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
layouts=[[],[[-1000,-1000,1000,1000]],[[130,-1000,140,1000]],[[60,-1000,70,1000]],
 [[-1000,105,1000,115]], [[-1000,85,1000,95]],
 [[130,-1000,140,1000],[-1000,105,1000,110]],
 [[60,-1000,70,1000],[-1000,90,1000,95]]]
for vx,vy in [(0,0),(65536,0),(-65536,0),(0,65536),(0,-65536),(500000,300000),(-500000,300000),(500000,-300000),(-500000,-300000),(1048576,1048576)]:
 for dx,dy in [(0,0),(65535,0),(100<<16,0),(-100<<16,0),(500<<16,200<<16),(-500<<16,-200<<16)]:
  for rectangles in layouts:
   body=dict(x=(100<<16)+123,y=(100<<16)+456,vx=vx,vy=vy,initialized=1,steerX=vx,steerY=vy,targetX=(100<<16)+123+dx,targetY=(100<<16)+456+dy)
   for name,offset in fields.items():write(owner+offset,body[name]&0xffffffff)
   queries=[]
   write(stack+0xff00,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
   cpu.emu_start(0x4e3270,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Avoidance did not return')
   cases.append(dict(body=body,rectangles=rectangles,queries=queries,output={name:signed(read(owner+offset)) for name,offset in fields.items()}))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E3270 with original vector length, direction, trig and fixed math; supplied terrain occupancy and position/velocity interfaces. Every terrain query recorded.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} homing avoidance cases')
