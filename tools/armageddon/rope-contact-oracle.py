"""Execute original004D6D10 worm rope contacts with native rebound and impulse."""
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


vt,other,ot,typ,intercept= [owner+0x1000+i*0x1000 for i in range(5)]
write(owner,vt);write(other,ot);write(ot+0x50,typ);write(vt+0x4c,intercept);write(vt+0x60,0x4d0f70);write(vt+0x118,0x4f4cb0)
fields={'vx':0x9c,'vy':0xa0,'angularVelocity':0xa4,'mass':0x58,'suspended':0x54,'ropeBounce':0x88,'field154':0x154,'team':0xfc,'worm':0x100,'soundHandle':0x38c,'field2ec':0x2ec}
def hook(cpu,address,size,user):
 if address not in [typ,intercept,0x4edc30,0x4edb90]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:signed(read(sp+4+i*4));result=0
 if address==typ:count=0;result=otherType
 elif address==intercept:count=3;calls.append(['intercept']+[arg(i) for i in range(count)]);result=accept
 elif address==0x4edc30:count=1;calls.append(['stopSound',arg(0)])
 else:count=5;calls.append(['sound']+[arg(i) for i in range(count)]);result=123
 cpu.reg_write(UC_X86_REG_EAX,result);cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for vx,vy in [(0,0),(65536,-65536),(0x100000,0),(-2147483648,2147483647),(0x200000,-0x180000)]:
 for bounce in [0,32768,65536,-65536]:
  for otherType in [1,2,11,12]:
   for mode in range(8):
    accept=mode&1
    initial=dict(vx=vx,vy=vy,angularVelocity=321,mass=131072 if mode==6 else 65536,suspended=int(mode==7),ropeBounce=bounce,field154=int(mode in [0,1]),team=2,worm=3,soundHandle=99 if mode&2 else 0,field2ec=int(mode>=4))
    for key,offset in fields.items():write(owner+offset,initial[key])
    sp=stack+0xff00;write(sp,stop);write(sp+4,other);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[]
    cpu.emu_start(0x4d6d10,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Rope contact failed to return')
    out={key:signed(read(owner+offset)) for key,offset in fields.items()}
    cases.append(dict(body=initial,otherType=otherType,accept=accept,output=dict(body=out,calls=calls)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004D6D10 with original velocity getter004D0F70, rebound004F4C60 and impulse004F4CB0. Type and special interception are explicit interfaces. Audio calls captured with deterministic returned handle123.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} rope contacts')
