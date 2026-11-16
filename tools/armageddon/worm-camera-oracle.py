"""Execute original worm camera routine004D6760 with unchanged virtual getters."""
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

context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context);write(owner,0x526de0)
def signed(v):return v if v<0x80000000 else v-0x100000000
cases=[]
for active in [0,1]:
 for sameTeam in [0,1]:
  for override in [0,1]:
   for state in [0x65,0x87]:
    for motion in [[0,0,0,0,0],[1,0,0,0,0],[0,-1,0,0,0],[0,0,1,0,0],[0,0,0,-1,0],[0,0,0,0,1]]:
     for x,y in [[0,0],[-1,0],[1200*65536+1,0],[600*65536,-256*65536-1],[0,-9999*65536-1],[0,-9999*65536],[0,800*65536],[0,800*65536+1]]:
      write(owner+0x104,active);write(owner+0xfc,0);write(owner+0x50,state);write(owner+0x90,x&0xffffffff);write(owner+0x94,y&0xffffffff)
      for offset,v in zip([0x9c,0xa0,0xbc,0xc0,0xc4],motion):write(owner+offset,v&0xffffffff)
      cpu.mem_write(context+0x3cd0,bytes([1 if sameTeam else 2]));cpu.mem_write(context+0x11d7c,b'\x01');write(context+0x1d444,override)
      for offset,v in [(0x808,800),(0x1b8cc,0),(0x1b8d0,1200*65536),(0x1b8d4,-256*65536)]:write(context+offset,v&0xffffffff)
      cpu.mem_write(context+0x124a4,b'\0'*280)
      sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
      cpu.emu_start(0x4d6760,stop,count=10000)
      if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Worm camera routine did not finish')
      requests=[[i,signed(read(context+0x124a4+i*20+4)),signed(read(context+0x124a4+i*20+8))] for i in range(14) if read(context+0x124a4+i*20)]
      cases.append(dict(active=active,sameTeam=sameTeam,override=override,state=state,motion=motion,x=x,y=y,request=requests[0] if requests else None))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004D6760, original worm virtual getters and004EE990 executed unchanged without hooks.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} worm camera cases')
