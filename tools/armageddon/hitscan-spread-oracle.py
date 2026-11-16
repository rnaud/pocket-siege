"""Execute original hitscan spread instructions in Unicorn.

Original hitscan spread instructions execute; RNG is supplied and playback is captured. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
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



context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
record,packet=owner+0x3000,owner+0x4000
cpu.mem_write(0x4fc020,b'\xc2\x08\x00')
rays=[]
def capture(cpu,address,size,user):
 if address==0x4fc020:
  sp=cpu.reg_read(UC_X86_REG_ESP);ptr=read(sp+8)
  rays.append(list(struct.unpack('<11i',cpu.mem_read(ptr,44))))
cpu.hook_add(UC_HOOK_CODE,capture)
cases=[]
for direction in [[65536,0],[0,-65536],[-65536,0],[46340,-46340]]:
 for count in [0,1,5]:
  for spread in [0,10,90]:
   for seed,frame in [[0,0],[42,123],[0xffffffff,0xffffffff]]:
    rays.clear();write(context+0x1acc,seed);write(context+0x7f0,frame)
    write(record+0xc,count);write(record+0x10,spread)
    shot=[2,3,100<<16,200<<16,*direction,0,7,8,9,10]
    for i,v in enumerate(shot):write(packet+i*4,v&0xffffffff)
    sp=stack+0xf000
    for i,v in enumerate([stop,record,packet]):write(sp+i*4,v)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4fc210,stop,count=20000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Spread routine failed to return')
    cases.append(dict(shot=shot,count=count,spread=spread,seed=seed,frame=frame,rays=list(rays),random=read(context+0x1acc)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004FC210',method='Original spread loop, frame-dependent RNG, trigonometry and fixed multiply; capture each unmodified downstream 004FC020 packet.',cases=cases),indent=2)+'\n')
print(f'Captured {len(cases)} ray sequences')
