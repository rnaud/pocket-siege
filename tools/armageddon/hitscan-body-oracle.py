"""Execute original hitscan spread instructions in Unicorn.

Original hitscan spread instructions execute; RNG is supplied and playback is captured. No game entry point runs.
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



context=owner+0x8000;manager=owner+0x4000;vtable=owner+0x5000;body_vtable=owner+0x6000;first=owner+0x7000;next_body=owner+0x7100;get_type=owner+0x7200
write(owner+0x38,context);write(context+0x7d4,manager);write(manager,vtable)
write(vtable+0x48,first);write(vtable+0x4c,next_body)
for address in [first,next_body]:cpu.mem_write(address,b'\xc2\x08\x00')
write(body_vtable+0x50,get_type);write(body_vtable+0x5c,0x4d0f50)
cpu.mem_write(get_type,b'\x8b\x81\xfc\x00\x00\x00\xc3')
objects=[];cursor=0

def enumerate_body(cpu,address,size,user):
 global cursor
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==first:cursor=0
 else:cursor+=1
 if cursor<len(objects):
  write(read(sp+4),objects[cursor]);write(read(sp+8),cursor);cpu.reg_write(UC_X86_REG_EAX,1)
 else:cpu.reg_write(UC_X86_REG_EAX,0)
cpu.hook_add(UC_HOOK_CODE,enumerate_body,begin=first,end=first)
cpu.hook_add(UC_HOOK_CODE,enumerate_body,begin=next_body,end=next_body)
cases=[]
scenes=[[],[dict(x=30<<16,y=0,type=2)],[dict(x=30<<16,y=0,type=6)],
 [dict(x=10<<16,y=0,type=6),dict(x=(10<<16)+1,y=0,type=6)],
 [dict(x=30<<16,y=16<<16,type=6),dict(x=40<<16,y=(16<<16)-1,type=6)],
 [dict(x=30<<16,y=8<<16,type=10),dict(x=40<<16,y=(8<<16)-1,type=10)],
 [dict(x=60<<16,y=0,type=6),dict(x=30<<16,y=0,type=6),dict(x=20<<16,y=0,type=6,self=True)],
 [dict(x=-30<<16,y=0,type=6),dict(x=0,y=-30<<16,type=6),dict(x=30<<16,y=-30<<16,type=6)],
 [dict(x=50<<16,y=0,type=1),dict(x=30<<16,y=0,type=22),dict(x=40<<16,y=0,type=10)]]
for scene in scenes:
 for direction in [[65536,0],[-65536,0],[0,-65536],[46340,-46340]]:
  for limit in [10,30,100]:
   for mask in [0xffffffff,1<<2,1<<6,1<<10]:
    objects=[]
    for i,b in enumerate(scene):
     address=owner if b.get('self') else owner+0x1000+i*0x200
     objects.append(address);write(address,body_vtable)
     for offset,value in [(0x90,b['x']),(0x94,b['y']),(0xfc,b['type'])]:write(address+offset,value&0xffffffff)
    sp=stack+0xf000
    for i,value in enumerate([stop,0,0,*direction,limit,mask]):write(sp+i*4,value&0xffffffff)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4fbea0,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Body projection failed to return')
    value=cpu.reg_read(UC_X86_REG_EAX);value=value if value<0x80000000 else value-0x100000000
    cases.append(dict(bodies=scene,x=0,y=0,dx=direction[0],dy=direction[1],limit=limit,mask=mask,distance=value))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004FBEA0',method='Original filtering, body-position getter, signed fixed projections and nearest-distance selection; supplied body registry iterator and type getters.',cases=cases),indent=2)+'\n')
print(f'Captured {len(cases)} body-ray cases')
