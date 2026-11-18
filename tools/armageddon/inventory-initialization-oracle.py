"""Execute original team and inventory initialization."""
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


source=owner+0x20000;cpu.mem_map(source,0x10000)
cases=[]
for banks in [0,1,3,6]:
 for teams in [0,1,2,6]:
  for worms in [0,1,3,8]:
   for network in [0,1]:
    for fill in [0,165]:
     writes=[[0,1,network],[0xde,1,teams],[0xcd38,1,banks]];names=[]
     for bank in range(banks):
      for slot in range(71):
       count=[-32768,-1,0,1,32767][(slot+bank)%5];delay=[-1,0,1,32767][slot%4]
       writes += [[0xcd3c+bank*0x11e+slot*2,2,count],[0xcd3c+bank*0x11e+slot*2+0x8e,2,delay]]
     for team in range(teams):
      start=0xc94+team*3000
      writes += [[start,1,worms],[start-0xbb4,1,255 if team%3==0 else team],[start-0xbb2,1,team],[start-0xbb1,1,team%max(1,banks)]]
      names.append([start-0xbae,'Team '+str(team)])
      for worm in range(worms):
       hp=[0,1,100,65535][worm%4];writes.append([start-0x140+worm*40,2,hp]);names.append([start-0x140+worm*40+3,('W'+str(worm))*((worm%4)+1)])
     cpu.mem_write(source,bytes(0x10000));initial=bytes((fill+i%7)&255 for i in range(0x2c14));cpu.mem_write(owner,initial)
     for offset,size,value in writes:cpu.mem_write(source+offset,int(value&((1<<(size*8))-1)).to_bytes(size,'little'))
     for offset,name in names:cpu.mem_write(source+offset,name.encode()+b'\0')
     sp=stack+0xf000;write(sp,stop);write(sp+4,source);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
     cpu.emu_start(0x4c2640,stop,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
     availability=[]
     for team in range(1,teams+1):
      for slot in [0,6,40,59,70]:
       for i,value in enumerate([stop,team,slot]):write(sp+i*4,value)
       cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
       cpu.emu_start(0x4c2ee0,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
       availability.append([team,slot,signed(cpu.reg_read(UC_X86_REG_EAX))])
     cases.append(dict(fill=fill,writes=writes,names=names,availability=availability,sha256=hashlib.sha256(cpu.mem_read(owner,0x2c14)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004C2640',method='Complete original team/inventory initializer executes without substituted calls. All output bytes compared, including preserved fields and name tails. Signed16-bit ammo/delay, zero-stock delay clearing, bank ownership, names, unsigned health and counters covered.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} native inventory initializations')
