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

context=owner+0x20000;cpu.mem_map(context,0x20000)
manager=owner+0x1000;vt=owner+0x2000;payload=owner+0x3000
write(context+0x7d4,manager);write(manager,vt)
probe=stop+0x100;shape=stop+0x200;register=stop+0x300;remove=stop+0x400
for offset,address in [(12,probe),(64,shape),(52,register),(56,remove)]:write(vt+offset,address)
fields={'type':0x3c,'shape':0x44,'state':0x50,'impulseScale':0xd8,'accumulated':0xe0,'complex':0x4c,'mass':0x58,'enabled':0x48,'suspended':0x54,'sleeping':0xb8,'submerged':0xbc,'contact':0xc0,'moving':0xc4,'x':0x90,'y':0x94,'vx':0x9c,'vy':0xa0,'angle':0x98,'angularVelocity':0xa4,'radius':0x5c,'flags':0x40,'gravityScale':0x6c,'windScale':0x68,'drag':0x64,'skimScale':0xb4,'waterDrag':0x60,'restitutionX':0x78,'restitutionY':0x7c,'tangent':0x80,'kind':0x124,'fuse':0x10c,'openingProgress':0x108,'progress':0x264,'targetDrag':0x254}
def ret(value,cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def hook(cpu,address,size,user):
 global queries
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4ed970,0x4b19e0]:ret(0,4)
 elif address==register or address==remove:
  events.append(['register' if address==register else 'remove',read(owner+0x3c)]);ret(0,4)
 elif address==shape:
  index=read(sp+8);events.append(['shape',index]);write(owner+0x44,index);ret(1,8)
 elif address==probe:
  x,y=signed(read(sp+8)),signed(read(sp+12));flags=read(owner+0x40)
  events.append(['probe',x,y,flags]);hit=queries<reject if flags==2 else y>=3*65536
  queries+=1;ret(int(hit),12)
 elif address==0x4edc90:
  events.append(['sound']+[signed(read(sp+4+i*4)) for i in range(5)]);ret(0,20)
 elif address==0x4ee7f0:
  events.append(['effect']+[signed(read(sp+4+i*4)) for i in range(12)]);ret(0,48)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for friction in [0,96]:
 for kind in [1,2,3,4,5]:
  for mode in [0,1,2,3]:
   for reject in [0,2]:
    for y in [-65537,0,5*65536]:
     cpu.mem_write(owner,bytes(0x400));write(owner+0x38,context);write(context+0x804,8);cpu.mem_write(context+0x11ba0,bytes([friction]))
     sp=stack+0xf000;write(sp,stop)
     for i,v in enumerate([0,11,6]):write(sp+4+i*4,v)
     events=[];cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4f4000,stop,count=10000)
     write(owner,0x526f48);write(owner+0x124,kind);write(owner+0x254,25)
     before={k:signed(read(owner+v)) for k,v in fields.items()}
     for offset,v in [(4,123456),(8,y),(20,kind),(0x148,7)]:write(payload+offset,v)
     write(sp+0x28,mode);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_EBP,payload)
     events=[];queries=0;cpu.emu_start(0x4dfce8,0x4dff3b,count=20000)
     if cpu.reg_read(UC_X86_REG_EIP)!=0x4dff3b:raise RuntimeError('Crate initialization did not finish')
     after={k:signed(read(owner+v)) for k,v in fields.items()}
     cases.append({'before':before,'x':123456,'y':y,'kind':kind,'mode':mode,'reject':reject,'friction':friction,'fuseSeconds':7,'bottom':8,'after':after,'events':events})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004DFCE8..004DFF3B','method':'Original base numeric constructor, crate physical placement and state entry execute. Task base, registry shape/category updates, collision responses, effect and sound interfaces supplied/captured. Record copy, utility classification, render-order allocation and tail text/camera initialization are outside this capture.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} crate placement cases')
