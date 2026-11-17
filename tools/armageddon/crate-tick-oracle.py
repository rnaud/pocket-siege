"""Execute original team environment modifiers."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000

context=owner+0x20000;cpu.mem_map(context,0x20000);write(owner,0x526f48);write(owner+0x38,context)
fields={'kind':0x124,'state':0x50,'drag':0x64,'openingProgress':0x108,'bubbleProgress':0x104,'progress':0x264,'variant':0x25c,'targetDrag':0x254,'fuse':0x10c,'submerged':0xbc,'moving':0xc4,'x':0x90,'y':0x94}
def ret(value,cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4f4410:events.append(['motion']);ret(0,16)
 elif address==0x4d11e0:ret(read(owner+0xc4),0)
 elif address==0x4d1230:
  x,y=signed(read(sp+4)),signed(read(sp+8));events.append(['probe',x,y]);ret(int(y>=body['y']+clearance*65536),8)
 elif address==0x4e07e0:events.append(['state',read(sp+4)])
 elif address==0x4e0580:events.append(['detonate']);ret(0,0)
 elif address==0x4dff70:events.append(['delete',read(sp+4)]);ret(0,4)
 elif address==0x4ee990:events.append(['camera']+[signed(read(sp+4+i*4)) for i in range(3)]);ret(0,12)
 elif address==0x4eebe0:events.append(['busy'])
 elif address==0x4ee930:events.append(['random']);ret(6,0)
 elif address==0x4edfa0:events.append(['bubble']+[signed(read(sp+4+i*4)) for i in range(5)]);ret(0,20)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for state in [99,100,101,102,103,104]:
 for kind in [1,3]:
  for flags in range(4):
   for progress,fuse in [(0,0),(0xc000,20),(65535-0x51e,21),(65536-0x51e,-1),(2147483647,1000)]:
    for clearance in [0,96,176,192]:
     for y in [0,10*65536]:
      body={'kind':kind,'state':state,'drag':123,'openingProgress':progress,'bubbleProgress':progress if progress!=2147483647 else -2147483648,'progress':777,'variant':flags&1,'targetDrag':25,'fuse':fuse,'submerged':flags&1,'moving':flags>>1,'x':123456,'y':y}
      for key,offset in fields.items():write(owner+offset,body[key])
      write(owner+0x100,0);write(context+0x1030,0);write(context+0x800,0);write(context+0x808,10);write(context+0x1b90,0)
      sp=stack+0xf000;write(sp,stop)
      for i,v in enumerate([0,0x3ea,0,0]):write(sp+4+i*4,v)
      events=[];cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4e0f20,stop,count=20000)
      if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Crate tick did not return')
      after={key:signed(read(owner+offset)) for key,offset in fields.items()}
      cases.append({'input':body,'clearance':clearance,'bottom':10,'output':after,'events':events,'missionStatus':read(context+0x1b90),'busy':read(context+0x800)})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004E0F20 event3EA','method':'Original lifecycle with unchanged state entry, position/velocity/submersion getters and busy setter. Base motion, moving predicate, collision probes, camera, detonation, deletion and visual RNG/bubbles captured interfaces. Render rank already0.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} crate tick cases')
