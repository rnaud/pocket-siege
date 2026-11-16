"""Execute original Dragon Ball hit scanner in Unicorn.

Original scanner, type filtering, signed bounds and trig execute; registry iteration and receiver/audio delivery are captured.
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
damage=owner+0x7300
write(body_vtable+8,damage)
def signed(v): return v if v<0x80000000 else v-0x100000000
def dispatch(cpu,address,size,user):
 if address not in [damage,0x4edc90]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4)
 if address==damage:
  calls.append(dict(operation='damage',receiver=objects.index(cpu.reg_read(UC_X86_REG_ECX)),event=arg(1),size=arg(2),request=[signed(read(arg(3)+i*4)) for i in range(6)]));count=4
 else:
  calls.append(dict(operation='sound',request=[signed(arg(i)) for i in range(5)]));count=5
 cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,dispatch)
cases=[]
scenes=[[]]
for kind in [0,1,2,3,6,10,11,12,17,31,32,34,255]:
 for dx,dy in [(0,0),(0x3ffff,0),(0x40000,0),(-0x40000,0),(0,0x13ffff),(0,0x140000),(0,-0x140000),(-0x80000000,0)]:
  scenes.append([dict(x=dx,y=dy,type=kind)])
scenes += [[dict(x=0,y=0,type=t) for t in types] for types in [[1,1],[1,2],[2,2],[6,2],[31,1,2],[0,2],[1,1,1]]]
for scene in scenes:
 for direction,angle,push in [(-65536,45,100),(65536,0,100),(0,90,100),(65536,-45,0x7fffffff)]:
  body=dict(x=0,y=0,direction=direction,angle=angle,push=push,damage=30,sound=100)
  for key,offset in dict(x=0x3c,y=0x40,direction=0x74,angle=0x58,push=0x5c,damage=0x54,sound=0x4c).items():write(owner+offset,body[key]&0xffffffff)
  objects=[]
  for i,b in enumerate(scene):
   address=owner+0x1000+i*0x200;objects.append(address);write(address,body_vtable)
   for offset,value in [(0x90,b['x']),(0x94,b['y']),(0xfc,b['type'])]:write(address+offset,value&0xffffffff)
  sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);calls=[]
  cpu.emu_start(0x4d34d0,stop,count=10000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Dragon Ball hit scanner failed to return')
  cases.append(dict(body=body,receivers=scene,output=dict(hit=cpu.reg_read(UC_X86_REG_EAX),calls=calls)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004D34D0 with original position getter/trig. Supplied ordered registry/type getter, captured damage first six initialized words and audio. Receiver effects and audio backend remain outside this oracle.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} Dragon Ball hit scans')
