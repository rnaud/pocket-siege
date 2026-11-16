"""Execute original004F9250 Axe animation tick with captured interfaces."""
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

vtable,animation,animtable,record=owner+0x2000,owner+0x3000,owner+0x4000,owner+0x5000
write(owner,vtable);write(owner+0x350,animation);write(animation,animtable);write(owner+0x354,record)
get_anim,clear,queue,position,state=owner+0x6000,owner+0x6100,owner+0x6200,owner+0x6300,owner+0x6400
for off,addr in [(0xc,get_anim),(0x14,clear),(0x1c,queue)]:write(animtable+off,addr)
write(vtable+0x5c,position);write(vtable+0x80,state)
def signed(v):return v if v<0x80000000 else v-0x100000000
calls=[]
def hook(cpu,address,size,user):
 if address not in [get_anim,clear,queue,position,state,0x4dd610,0x4f7da0]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+4*i);cleanup=0
 if address==get_anim:write(arg(0),sprite);write(arg(1),progress&0xffffffff);cleanup=8
 elif address==position:write(arg(0),x&0xffffffff);write(arg(1),y&0xffffffff);cleanup=8
 elif address==clear:calls.append(dict(operation='clear'))
 elif address==queue:calls.append(dict(operation='queue',sprite=arg(0)));cleanup=4
 elif address==state:calls.append(dict(operation='state',value=arg(0)));cleanup=4
 elif address==0x4dd610:calls.append(dict(operation='sound',request=[signed(arg(i)) for i in range(4)]));cleanup=16
 else:calls.append(dict(operation='area',request=[signed(arg(i)) for i in range(12)]));cleanup=48
 cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for sprite in [0x197,0x19a,0x19d,0x100]:
 for progress in [0,0x3fff,0x4000,0xffff,0x10000,0x10001]:
  for facing in [-1,1]:
   for percent in [50,0x132,-1]:
    for x,y in [(100<<16,200<<16),(0x7fffffff,-123456)]:
     write(owner+0x1b0,facing&0xffffffff);write(record+0x70,percent&0xffffffff)
     sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[]
     cpu.emu_start(0x4f9250,stop,count=10000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Axe tick did not return')
     cases.append(dict(body=dict(sprite=sprite,progress=progress,x=x,y=y,facing=facing,percent=percent),calls=calls))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F9250; supplied animation/position getters, captured queues, state, sound and area dispatch.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} Axe ticks')
