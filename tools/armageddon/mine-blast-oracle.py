"""Execute original mine blast event004EA070/404 with original radial damage and impulse methods."""
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

context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context);write(owner,0x527300)
fields={'x':0x90,'y':0x94,'vx':0x9c,'vy':0xa0,'angularVelocity':0xa4,'mass':0x58,'suspended':0x54,'impulseScale':0xd8,'accumulated':0xe0}
def signed(v):return v if v<0x80000000 else v-0x100000000
cases=[]
for dx,dy in [[0,0],[10*65536,0],[0,-20*65536],[70*65536,0],[150*65536,30*65536],[-20*65536-1,25*65536+123]]:
 for damage in [0,30,50]:
  for push in [100,175]:
   for mass in [32768,65536,131072]:
    for suspended in [0,1]:
     for extent in [1,2]:
      before=dict(x=400*65536,y=200*65536,vx=12345,vy=-23456,angularVelocity=34567,mass=mass,suspended=suspended,impulseScale=65536,accumulated=7)
      for key,off in fields.items():write(owner+off,before[key]&0xffffffff)
      write(context+0x814,extent)
      packet=[1,before['x']+dx,before['y']+dy,push,damage,1];payload=owner+0x2000
      for i,v in enumerate(packet):write(payload+i*4,v&0xffffffff)
      sp=stack+0xff00;write(sp,stop)
      for i,v in enumerate([0,0x404,0x124,payload]):write(sp+4+i*4,v)
      cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4ea070,stop,count=10000)
      if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Mine blast event did not finish')
      after={key:signed(read(owner+off)) for key,off in fields.items()}
      cases.append(dict(before=before,packet=packet,extent=extent,after=after,outputPacket=[signed(read(payload+i*4)) for i in range(6)]))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004EA070 event404,004F4410,004F4560, normalization, fixed arithmetic and004F4CB0 impulse execute unchanged without hooks.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mine blast cases')
