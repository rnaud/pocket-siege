"""Execute original walking position and slope-search instructions in Unicorn.

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
write(owner+0x38,context);write(context+0x7d4,manager);write(manager,vt);write(vt+0xc,probe)
cpu.mem_write(probe,b'\xc2\x0c\x00')
queries=[];pattern=[]
def observe(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if read(sp+4)!=owner:raise RuntimeError('Wrong collision owner')
 queries.append(list(struct.unpack('<2i',cpu.mem_read(sp+8,8)))+[read(owner+0x40)])
 cpu.reg_write(UC_X86_REG_EAX,pattern[(len(queries)-1)%len(pattern)])
cpu.hook_add(UC_HOOK_CODE,observe,begin=probe,end=probe)
cases=[]
write(owner,0x527300)
for x,y in [(0x400000,0x200000),(0x7fffffff,-0x7fffffff)]:
 for limit in [-1,0,1,4,8]:
  for pattern in [[0],[1],[0,0,1],[1,1,0],[1,0,0,1],[1,0,1,1,0,0],[1,0,0,0,0,0,0,0,1]]:
   write(owner+0x40,0x421846);write(owner+0x4000,777)
   cpu.mem_write(stack+0xff00,struct.pack('<5I',stop,x&0xffffffff,y&0xffffffff,limit&0xffffffff,owner+0x4000))
   cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
   queries=[];cpu.emu_start(0x4f4e60,stop,count=10000)
   assert cpu.reg_read(UC_X86_REG_EIP)==stop
   result=cpu.reg_read(UC_X86_REG_EAX);value=struct.unpack('<i',cpu.mem_read(owner+0x4000,4))[0]
   cases.append(dict(x=x,y=y,limit=limit,pattern=pattern,queries=queries,result=value if result else None,flags=read(owner+0x40)))
settleCases=[]
for c in [case for case in cases if case['limit']==4]:
 x,y,pattern=c['x'],c['y'],c['pattern'];water=(y>>16)+5
 before=dict(x=x,y=y,flags=0x421846,sleeping=7,angle=888)
 fields=dict(x=0x90,y=0x94,flags=0x40,sleeping=0xb8,angle=0x98)
 for key,offset in fields.items():write(owner+offset,before[key]&0xffffffff)
 write(context+0x804,water&0xffffffff);payload=owner+0x5000;write(payload+8,x&0xffffffff);write(payload+12,y&0xffffffff)
 sp=stack+0xff00;write(sp+0x30,1)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_EBP,payload)
 queries=[];cpu.emu_start(0x4e96b4,0x4e9746,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==0x4e9746
 settleCases.append(dict(before=before,x=x,y=y,water=water,pattern=pattern,queries=queries,after={key:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for key,offset in fields.items()}))
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004F4E60 with real004F4D80 and flag accessors','method':'Original surface slope and position solvers execute unchanged; collision manager answers from the recorded pattern.','cases':cases,'settleCases':settleCases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} surface slope cases')
