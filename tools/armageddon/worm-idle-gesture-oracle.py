"""Execute original004DD7D0 idle gesture scheduling with native weighted selection."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EBP
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

context=0x3000000;cpu.mem_map(context,0x20000)
write(owner+0x38,context);animation=owner+0x1000;vt=owner+0x2000
write(owner,vt);write(owner+0x350,animation);write(animation,vt)
for offset,address,argc in [(0xc,stop+0x100,2),(0x7c,stop+0x200,0),(0x1c,stop+0x300,1)]:
 write(vt+offset,address);cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
for address,argc in [(0x4ee960,0),(0x4cbb90,1),(0x4cbc10,0),(0x4c3180,1),(0x4c2cc0,2),(0x4edc30,1),(0x4edb90,5)]:
 cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 def arg(n):return read(sp+4+n*4)
 if address==stop+0x100:
  write(arg(0),sprite);write(arg(1),progress&0xffffffff);calls.append(['current'])
 elif address==stop+0x200:calls.append(['state']);cpu.reg_write(UC_X86_REG_EAX,state)
 elif address==stop+0x300:calls.append(['queue',arg(0)])
 elif address==0x4ee960:
  v=randoms[len([c for c in calls if c[0]=='random'])];calls.append(['random',v]);cpu.reg_write(UC_X86_REG_EAX,v)
 elif address==0x4cbb90:
  obj=cpu.reg_read(UC_X86_REG_ECX);write(obj+4,0);write(obj+8,arg(0));write(obj+12,owner+0x4000)
 elif address==0x4c3180:calls.append(['teamStatus',arg(0)]);cpu.reg_write(UC_X86_REG_EAX,0)
 elif address==0x4c2cc0:calls.append(['health',arg(0),arg(1)]);cpu.reg_write(UC_X86_REG_EAX,health)
 elif address==0x4edc30:calls.append(['stopSound',arg(0)])
 elif address==0x4edb90:calls.append(['sound']+[arg(i) for i in range(5)]);cpu.reg_write(UC_X86_REG_EAX,777)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
inputs=[]
for sprite in [35,38,41,44]:
 for progress in [0,0xe666,0xe667,0xffff,0x1ffff]:
  for countdown in [-1,0,1]:
   for damage in [0,25,26]:
    inputs.append((sprite,progress,countdown,damage,0,0,101))
for active,blocked,state in [(1,0,101),(0,1,101),(0,0,102)]:inputs.append((35,65535,0,0,active,blocked,state))
for i,(sprite,progress,countdown,damage,active,blocked,state) in enumerate(inputs):
 for pick in [0,0x400000,0x800000,0xffff00]:
  cpu.mem_write(owner+0x100,bytes(0x250));write(owner+0x350,animation)
  for offset,value in [(0xfc,2),(0x100,3),(0x104,active),(0x108,blocked),(0x148,int(sprite==41)),(0x158,1),(0x20c,damage),(0x2c8,countdown),(0x38c,123)]:write(owner+offset,value&0xffffffff)
  write(context+0x102c,3)
  for j,v in enumerate([0,1,2]):write(context+0xc2c+4*j,v)
  for j,v in enumerate([1,2,3]):write(context+0x1030+4*j,v)
  health=29 if sprite==38 else 100;randoms=[12345,pick,255]
  sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  calls=[];cpu.emu_start(0x4dd7d0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(sprite=sprite,progress=progress,countdown=countdown,damage=damage,active=active,blocked=blocked,state=state,health=health,randoms=randoms,calls=calls,after=dict(countdown=signed(read(owner+0x2c8)),damage=signed(read(owner+0x20c)),sound=read(owner+0x38c),order=[read(context+0x1030+j*4) for j in range(3)])))
args.output.write_text(json.dumps(dict(sha256=digest,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} idle gesture cases')
