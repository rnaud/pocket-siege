"""Execute original recovery state 0x76 entry and tick blocks.

Captures animation, RNG, audio and state interfaces. Boundary execution does
not include the common transition prefix/finalizer. No game entry point runs.
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




animator=owner+0x1000;vtable=owner+0x2000;clear=owner+0x3000;queue=owner+0x3100
write(owner,0x526de0);write(owner+0x350,animator);write(animator,vtable)
write(vtable+0x14,clear);write(vtable+0x1c,queue)
cpu.mem_write(clear,b'\xc3');cpu.mem_write(queue,b'\xc2\x04\x00')
for address,n in [(0x4ee960,0),(0x4edc30,4),(0x4edb90,20)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',n))
transition=owner+0x3200;body_vtable=owner+0x3300
write(body_vtable+0x80,transition);cpu.mem_write(transition,b'\xc2\x04\x00')
calls=[];boundary=0x4d8189;random=0
def observe(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==boundary:cpu.emu_stop()
 elif address==clear:calls.append(dict(operation='clear'))
 elif address==queue:calls.append(dict(operation='queue',sprite_id=read(sp+4),progress=0))
 elif address==0x4ee960:calls.append(dict(operation='random'));cpu.reg_write(UC_X86_REG_EAX,random)
 elif address==0x4edc30:calls.append(dict(operation='stopSound',handle=read(sp+4)))
 elif address==0x4edb90:
  calls.append(dict(operation='sound',request=list(struct.unpack('<5i',cpu.mem_read(sp+4,20)))));cpu.reg_write(UC_X86_REG_EAX,99)
 elif address==transition:calls.append(dict(operation='state',target=read(sp+4)))
cpu.hook_add(UC_HOOK_CODE,observe)
entries=[];ticks=[]
for previous in [0x65,0x7f,0x80,0x81,0x82,0x83]:
 for maxVy in [0x80000,0x80001]:
  for flag in [0,1]:
   for random in [0,5,255]:
    for handle in [0,19]:
     calls=[];write(owner+0x250,flag);write(owner+0x258,maxVy);write(owner+0x38c,handle);write(owner+0x19c,0)
     cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_EDI,previous);cpu.reg_write(UC_X86_REG_ESP,stack+0xf000)
     cpu.emu_start(0x4d7c15,stop,count=1000)
     if cpu.reg_read(UC_X86_REG_EIP)!=boundary:raise RuntimeError('Entry boundary')
     entries.append(dict(previous=previous,maxVy=maxVy,flag=flag,random=random,handle=handle,result=dict(soundHandle=read(owner+0x38c),field19c=read(owner+0x19c),calls=calls)))
boundary=0x4ded66
for progress in [-1,0,0xac67,0xac68,65535,65536,70000]:
 for flag in [0,1]:
  for handle in [0,19]:
   calls=[];write(owner+0x250,flag);write(owner+0x38c,handle);write(stack+0xf024,progress&0xffffffff)
   cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESI,body_vtable);cpu.reg_write(UC_X86_REG_ESP,stack+0xf000)
   cpu.emu_start(0x4de9b0,stop,count=1000)
   if cpu.reg_read(UC_X86_REG_EIP)!=boundary:raise RuntimeError('Tick boundary')
   ticks.append(dict(progress=progress,flag=flag,handle=handle,result=dict(flag=read(owner+0x250),soundHandle=read(owner+0x38c),calls=calls)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original recovery entry 004D7C15 and tick 004DE9B0; animation, state, RNG and audio interfaces supplied/captured.',entries=entries,ticks=ticks),separators=(',',':'))+'\n')
print(f'Captured {len(entries)} recovery entries and {len(ticks)} ticks')
