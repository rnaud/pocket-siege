"""Execute original barrel construction and settling."""
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

context=owner+0x20000;cpu.mem_map(context,0x20000)
manager=owner+0x1000;vt=owner+0x2000;probe=stop+0x100;register=stop+0x200
write(context+0x7d4,manager);write(manager,vt);write(vt+12,probe);write(vt+52,register)
fields={'type':0x3c,'shape':0x44,'state':0x50,'impulseScale':0xd8,'accumulated':0xe0,'complex':0x4c,'mass':0x58,'enabled':0x48,'suspended':0x54,'sleeping':0xb8,'submerged':0xbc,'contact':0xc0,'moving':0xc4,'x':0x90,'y':0x94,'vx':0x9c,'vy':0xa0,'angle':0x98,'angularVelocity':0xa4,'radius':0x5c,'flags':0x40,'gravityScale':0x6c,'windScale':0x68,'drag':0x64,'skimScale':0xb4,'waterDrag':0x60,'restitutionX':0x78,'restitutionY':0x7c,'tangent':0x80,'disabled':0xfc,'damage':0x104,'threshold':0x108,'bubbleProgress':0x10c}
def ret(value,cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4ed970,0x4b19e0]:ret(0,4)
 elif address==register:ret(0,4)
 elif address==probe:
  x,y=signed(read(sp+8)),signed(read(sp+12));flags=read(owner+0x40)
  hit=reject if flags==2 else (floor is not None and y>=floor*65536)
  queries.append([x,y,flags,int(hit)]);ret(int(hit),12)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for friction in [0,96,255]:
 for settle in [0,1]:
  for reject in [0,1]:
   for floor in [None,3]:
    for y in [-65537,0,5*65536,8*65536]:
     cpu.mem_write(owner,bytes(0x400));write(owner+0x38,context);write(context+0x804,8);cpu.mem_write(context+0x11ba0,bytes([friction]))
     write(context+0xc28,1);write(context+0x828,0);write(context+0x102c,0);write(context+0x1030,0)
     sp=stack+0xf000;write(sp,stop)
     for i,v in enumerate([0,123456,y,settle]):write(sp+4+i*4,v)
     queries=[];cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4d0d30,stop,count=20000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Barrel construction did not return')
     cases.append({'x':123456,'y':y,'settle':settle,'friction':friction,'reject':reject,'floor':floor,'water':8,'body':{k:signed(read(owner+v)) for k,v in fields.items()},'queries':queries})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D0D30','method':'Original complete constructor and shared base numeric initialization. Task/category/registration and collision supplied; original render-pool allocation executes with a single free slot, not asserted as ported.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} barrel construction cases')
