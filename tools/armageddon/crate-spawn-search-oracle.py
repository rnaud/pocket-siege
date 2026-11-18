"""Execute composed original crate spawn search."""
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
manager=owner+0x1000;vt=owner+0x2000;probe=stop+0x100
write(owner+0x38,context);write(context+0x7d4,manager);write(manager,vt);write(vt+8,probe)
cpu.mem_write(probe,b'\xc2\x10\x00');cpu.mem_write(0x4ee960,b'\xc3');cpu.mem_write(0x4ef0e0,b'\xc2\x10\x00')
def hook(cpu,address,size,user):
 global rng
 sp=cpu.reg_read(UC_X86_REG_ESP)
 def arg(i):return signed(read(sp+4*i))
 if address==probe:
  args=[arg(i) for i in range(1,5)];calls.append(['collide',*args])
  x,y=args[1:3]
  hit=(terrain==1 or (terrain==2 and y>=floor*65536) or (terrain==3 and (y>=floor*65536 or y<=-64*65536)) or (terrain==4 and x<960*65536 and y>=floor*65536))
  cpu.reg_write(UC_X86_REG_EAX,int(hit))
 elif address==0x4ee960:
  rng=(rng*1664525+1013904223)&0xffffffff;calls.append(['random',rng]);cpu.reg_write(UC_X86_REG_EAX,rng)
 elif address==0x4ef0e0:
  calls.append(['nearest',arg(1),arg(2),arg(4)])
  write(read(sp+12),distance);cpu.reg_write(UC_X86_REG_EAX,int(distance!=-1))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for terrain in range(5):
 for floor in [80,400,900]:
  for grounded in [0,1]:
   for tall in [0,1]:
    for distance in [-1,0x3fffff,0x400000]:
     bottom=1024;seed=12345; rng=seed;calls=[]
     write(context+0x804,bottom);write(context+0x1b8ac,tall)
     xptr=owner+0x3000;yptr=xptr+4;sp=stack+0xf000
     for i,v in enumerate([stop,xptr,yptr,grounded,1]):write(sp+i*4,v)
     cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
     cpu.emu_start(0x4b7c00,stop,count=2000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
     cases.append(dict(terrain=terrain,floor=floor,grounded=grounded,tall=tall,distance=distance,bottom=bottom,seed=seed,result=dict(success=bool(cpu.reg_read(UC_X86_REG_EAX)),x=signed(read(xptr)),y=signed(read(yptr))),calls_sha256=hashlib.sha256(json.dumps(calls,separators=(',',':')).encode()).hexdigest(),call_count=len(calls)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004B7C00 / 004B7A80',method='Original search and column traversal execute together; collision, random and nearest-body interfaces observed. Includes blocked/empty/ground/ceiling/partial terrain and distance boundary rejection.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} composed crate searches')
