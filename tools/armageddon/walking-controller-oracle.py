"""Execute the original walking controller and slope search in Unicorn.

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
calls=[];queries=[]
def observe(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==probe:
  x,y=struct.unpack('<2i',cpu.mem_read(sp+8,8));queries.append([x,y])
  floor=0x210000
  if scene=='slope':floor-=((x-0x400000)//0x20000)*65536
  hit=(y>=floor) if scene!='cliff' else (x<0x440000 and y>=floor)
  if scene=='wall':hit=hit or x>=0x440000
  cpu.reg_write(UC_X86_REG_EAX,int(hit))
 elif address==animget:
  write(read(sp+4),sprite);write(read(sp+8),0)
 elif address==animset:calls.append({'operation':'progress','value':signed(sp+4)})
 elif address==transition:
  target=read(sp+4);write(owner+0x50,target);calls.append({'operation':'state','target':target})
 elif address==position:
  x,y=struct.unpack('<2i',cpu.mem_read(sp+4,8));write(owner+0x90,x&0xffffffff);write(owner+0x94,y&0xffffffff)
  calls.append({'operation':'position','x':x,'y':y});cpu.reg_write(UC_X86_REG_EAX,1)
 elif address==0x4edc30:calls.append({'operation':'stopSound','handle':read(sp+4)})
 elif address==0x4edb90:
  calls.append({'operation':'sound','request':list(struct.unpack('<5i',cpu.mem_read(sp+4,20)))});cpu.reg_write(UC_X86_REG_EAX,99)
 elif address==0x4f8790:calls.append({'operation':'bungeeCheck'})
cpu.hook_add(UC_HOOK_CODE,observe)
cases=[]
for scene in ['flat','wall','slope','cliff']:
 for direction in [-1,1]:
  for state in [0x65,0x66]:
   for sprite in [0x20,0x21]:
    for progress in [0,0x7fff,0x8000,0x8001,0xffff,0x10000]:
     for locked in [False,True]:
      inp={'x':0x400000,'y':0x200000,'state':state,'facing':1,'progress':progress,'cycle':-1,'anchorX':0x400000,'field19c':0,'soundHandle':19,'locked':locked}
      for key,offset in fields.items():write(owner+offset,inp[key]&0xffffffff)
      cpu.mem_write(owner+0x12a,bytes([int(locked)]));write(owner+0x1e4,int(direction<0))
      write(stack+0xff00,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
      calls=[];queries=[];cpu.emu_start(0x4dc860,stop,count=10000)
      if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Walking controller did not return')
      body={key:signed(owner+offset) for key,offset in fields.items()};body['locked']=locked
      cases.append({'input':inp,'direction':direction,'sprite':sprite,'scene':scene,'queries':queries,'output':{'body':body,'calls':calls}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004DC860','method':'Original walking controller and slope solver execute; state, position commit, animation, bungee and sound interfaces are observed.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} walking controller cases')
