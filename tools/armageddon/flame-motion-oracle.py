"""Execute original004D42D0 flame movement."""
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

context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
terrain=owner+0x1000;manager=owner+0x1100;tv=owner+0x1200;mv=owner+0x1300
write(context+0x24,terrain);write(terrain,tv);write(tv+0x28,stop+0x100)
write(context+0x7d4,manager);write(manager,mv);write(mv+0x28,stop+0x200);write(mv+0x24,stop+0x300)
fields={'x':0x4c,'y':0x50,'vx':0x54,'vy':0x58,'contact':0x74}
def ret(value,cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def hook(cpu,address,size,user):
 global randomIndex
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  x,y=signed(read(sp+4)),signed(read(sp+8));events.append(['probe',x,y])
  hit={'clear':False,'solid':True,'floor':y>=1,'wall':x>=2,'ceiling':y<=-2}[terrainKind];ret(int(hit),8)
 elif address==stop+0x200:events.append(['wind']);ret(wind,0)
 elif address==stop+0x300:events.append(['gravity']);ret(gravity,0)
 elif address==0x4eebe0:events.append(['busy']);ret(0,0)
 elif address==0x4ee960:events.append(['random']);ret(randoms[randomIndex],0);randomIndex+=1
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for vx,vy in [(0,0),(524288,-524288),(-524288,524288),(1,-1)]:
 for terrainKind in ['clear','solid','floor','wall','ceiling']:
  for gravity,wind in [(0x3d70,0),(-0x3d70,12345)]:
   for randoms in [[0,65535],[32768,32768]]:
    body={'x':0,'y':0,'vx':vx,'vy':vy,'contact':0}
    for key,off in fields.items():write(owner+off,body[key])
    sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);events=[];randomIndex=0;cpu.emu_start(0x4d42d0,stop,count=30000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Flame motion did not return')
    cases.append({'input':body,'terrain':terrainKind,'gravity':gravity,'wind':wind,'randoms':randoms,'events':events,'output':{key:signed(read(owner+off)) for key,off in fields.items()},'result':cpu.reg_read(UC_X86_REG_EAX)})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D42D0','method':'Original full flame movement and fixed multiplication execute unchanged. Terrain probes, manager gravity/wind, busy and logic RNG are captured interfaces.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} flame motion cases')
