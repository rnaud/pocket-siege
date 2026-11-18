"""Execute original scene working-image and spawn-pool construction."""
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
cpu.mem_map(owner,0x40000)
for address in [stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x40000))).hexdigest()
def ret(value):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x492550:
  n=read(sp+4);calls.append(['allocate',n,snapshot()]);ret(0 if (failure==1 and n==44) or (failure==2 and n==16) else owner+(0x1000 if n==44 else 0x2000))
 elif address==0x4924d0:
  calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(owner+(0x4000 if read(sp+4)==0x567600 else 0x10000))
for a in [0x492550,0x4924d0]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
positions=[[(i%67)*137-1000,(i%67)%7-3] for i in range(70)]
positions[0]=[0xffff,0xffffffff];positions[1]=[0x80000000,0x7fffffff];positions[5]=positions[2]
for pattern in [0,0xa5]:
 for count in [-1,0,1,8,64,70]:
  for failure in ([0,1,2] if count<=0 else [0,1]):
   calls=[];cpu.mem_write(owner,bytes([pattern])*0x40000)
   sp=stack+0xf000;write(sp+0x10,count)
   for i,pair in enumerate(positions):
    for j,v in enumerate(pair):write(sp+0x118+i*8+j*4,v);write(owner+0x6000+i*8+j*4,v)
   write(owner+0x5cd0,owner+0x8000)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EBX,owner)
   cpu.emu_start(0x4a5a69,0x4a5b1e,count=1000000)
   assert cpu.reg_read(UC_X86_REG_EIP)==0x4a5b1e
   cases.append(dict(pattern=pattern,count=count,failure=failure,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,positions=positions,entry='004A5A69..004A5B1E',method='28 original working-image/spawn-pool setup sequences execute native bitmap allocation and clearing, pool construction and packed-coordinate insertion. Counts include negative,empty,full and over-capacity inputs; duplicate and wrapping coordinates and valid allocation-failure branches included. Full256KiB memory at heap callbacks and completion. Only heap is an interface. Surrounding match startup and live ownership remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} scene spawn-pool sequences')
