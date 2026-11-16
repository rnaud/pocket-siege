"""Execute original004F7190 Fire Punch entry with captured interfaces."""
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
clear,queue,position,velocity,set_velocity,terrain= [owner+0x6000+i*0x100 for i in range(6)]
write(animtable+0x14,clear);write(animtable+0x1c,queue)
write(vtable+0x5c,position);write(vtable+0x60,velocity);write(vtable+0x104,set_velocity)
world,terrain_object,terrain_table=owner+0x7000,owner+0x7100,owner+0x7200
write(owner+0x38,world);write(world+0x24,terrain_object);write(terrain_object,terrain_table);write(terrain_table+0xc,terrain)
def signed(v):return v if v<0x80000000 else v-0x100000000
calls=[]
def hook(cpu,address,size,user):
 global vx,vy
 if address not in [clear,queue,position,velocity,set_velocity,terrain]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+4*i);cleanup=0
 if address==position:write(arg(0),x&0xffffffff);write(arg(1),y&0xffffffff);cleanup=8
 elif address==velocity:write(arg(0),vx&0xffffffff);write(arg(1),vy&0xffffffff);cleanup=8
 elif address==clear:calls.append(dict(operation='clear'))
 elif address==queue:calls.append(dict(operation='queue',sprite=arg(0)));cleanup=4
 elif address==set_velocity:
  vx,vy=signed(arg(0)),signed(arg(1));calls.append(dict(operation='velocity',x=vx,y=vy));cleanup=8
 elif address==terrain:calls.append(dict(operation='terrain',request=[signed(arg(i)) for i in range(3)]));cleanup=12
 cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for power in [0,1,50,100,200,-100,10000,0x7fffffff]:
 for x,y in [(100<<16,200<<16),(-123456,-456789),(0x7fffffff,-0x7fffffff)]:
  vx,vy=12345,67890
  write(record+0x7c,power&0xffffffff)
  sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[]
  cpu.emu_start(0x4f7190,stop,count=10000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Fire Punch entry did not return')
  cases.append(dict(power=power,x=x,y=y,calls=calls))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F7190; captured animation, velocity and terrain calls; position getters supplied; velocity getter reflects setter.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} Fire Punch entries')
