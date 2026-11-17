"""Execute original barrel damage events without hooks."""
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

context=0x3000000;cpu.mem_map(context,0x20000)
write(owner,0x526988);write(owner+0x38,context)
fields={'x':0x90,'y':0x94,'vx':0x9c,'vy':0xa0,'angularVelocity':0xa4,'mass':0x58,'suspended':0x54,'impulseScale':0xd8,'accumulated':0xe0,'state':0x50,'disabled':0xfc,'damage':0x104,'threshold':0x108}
cases=[]
for event in [0x433,0x404]:
 for disabled in [0,1]:
  for prior in [0,49,50,2147483647]:
   for amount in [0,1,50,-1]:
    for mode in [0,1]:
     for distance in [0,50,105]:
      body=dict(x=distance*65536,y=0,vx=12345,vy=-23456,angularVelocity=34567,mass=65536,suspended=0,impulseScale=65536,accumulated=0,state=0,disabled=disabled,damage=prior,threshold=50)
      for key,off in fields.items():write(owner+off,body[key])
      write(context+0x814,1)
      packet=[mode,0,0,100,amount,amount];payload=owner+0x2000
      for i,v in enumerate(packet):write(payload+4*i,v)
      sp=stack+0xf000;write(sp,stop)
      for i,v in enumerate([0,event,0x124,payload]):write(sp+4+i*4,v)
      cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4d1860,stop,count=20000)
      if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Barrel hit did not return')
      cases.append({'input':body,'event':event,'packet':packet,'output':{key:signed(read(owner+off)) for key,off in fields.items()},'report':signed(read(payload+20))})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D1860 events433/404','method':'Original direct hit and blast handlers, base impulse, damage getter and state setter execute without hooks.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} barrel hit cases')
