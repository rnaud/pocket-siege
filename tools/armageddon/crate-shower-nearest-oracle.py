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
cpu.mem_write(probe,b'\xc2\x10\x00');cpu.mem_write(0x4ee960,b'\xc3')
write(vt+0x48,0x4c8c90);write(vt+0x4c,0x4c8cd0)
slots=owner+0x7000;bodyvt=owner+0x8000
write(manager+0x28,slots);write(bodyvt+0x50,stop+0x300);write(bodyvt+0x5c,stop+0x400)
cpu.mem_write(stop+0x300,b'\xc3');cpu.mem_write(stop+0x400,b'\xc2\x08\x00')
def ret(value,cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp)
 cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def hook(cpu,address,size,user):
 global rng
 sp=cpu.reg_read(UC_X86_REG_ESP)
 def arg(i):return signed(read(sp+4*i))
 if address==probe:
  args=[arg(i) for i in range(1,5)];calls.append(['collide',*args])
  x,y=args[1:3]
  hit=(terrain==1 or (terrain==2 and y>=floor*65536) or (terrain==3 and (y>=floor*65536 or y<=-64*65536)) or (terrain==4 and x<960*65536 and y>=floor*65536))
  cpu.reg_write(UC_X86_REG_EAX,int(hit))
 elif address==0x4ccf50:
  calls.append(['parent',arg(1),arg(2)]);ret(0x1234,8)
 elif address==0x4eebe0:calls.append(['busy'])
 elif address==0x492550:
  calls.append(['allocate',arg(1)]);ret(owner+0x4000,0)
 elif address==0x4dfba0:
  record=read(sp+8)
  calls.append(['create',arg(1),arg(3),signed(read(record+4)),signed(read(record+8)),read(record+20),read(record+24),read(record+28)])
  ret(owner+0x4000,12)
 elif address==0x4ee960:
  rng=(rng*1664525+1013904223)&0xffffffff;calls.append(['random',rng]);cpu.reg_write(UC_X86_REG_EAX,rng)
 elif address in [stop+0x300,stop+0x400]:
  body=bodies[(cpu.reg_read(UC_X86_REG_ECX)-owner-0x9000)//0x100]
  if address==stop+0x300:
   calls.append(['type',body['id']]);cpu.reg_write(UC_X86_REG_EAX,body['type'])
  else:
   calls.append(['position',body['id']]);write(read(sp+4),body['x']);write(read(sp+8),body['y'])
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for terrain in range(5):
 for floor in [80,400,900]:
  for grounded in [1]:
   for tall in [0,1]:
    for distance in [-1,0x3fffff,0x400000]:
     bottom=1024;seed=12345; rng=seed;calls=[]
     bodies=[dict(id=0,type=1 if distance==0x3fffff else 2,x=960*65536,y=(floor-16)*65536),dict(id=1,type=11,x=1500*65536,y=floor*65536),dict(id=2,type=17,x=128*65536,y=floor*65536)] if distance!=-1 else []
     write(manager+0x24,len(bodies)+1);write(slots,0)
     for i,body in enumerate(bodies):
      address=owner+0x9000+i*0x100;write(address,bodyvt);write(slots+4*(i+1),address)
     write(context+0x804,bottom);write(context+0x1b8ac,tall)
     write(owner+0x1dc,5);write(owner+0x1d8,0);write(context+0x800,0)
     write(context+0x1668,3);write(context+0x1788,0)
     for i,v in enumerate([1,6,11]):write(context+0x154c+i*4,v);write(context+0x1bfb8+v*4,v+2)
     xptr=owner+0x3000;yptr=xptr+4;sp=stack+0xf000
     for i,v in enumerate([stop,xptr,yptr,grounded,1]):write(sp+i*4,v)
     cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
     cpu.emu_start(0x4b81b0,stop,count=2000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
     cases.append(dict(bodies=bodies,terrain=terrain,floor=floor,grounded=grounded,tall=tall,distance=distance,bottom=bottom,seed=seed,result=dict(count=signed(read(owner+0x1dc)),timer=signed(read(owner+0x1d8)),pool=[read(context+0x154c+i*4) for i in range(read(context+0x1668))],used=[read(context+0x166c+i*4) for i in range(read(context+0x1788))]),calls_sha256=hashlib.sha256(json.dumps(calls,separators=(',',':')).encode()).hexdigest(),call_count=len(calls)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004B81B0 / 004B7C00 / 004B7A80 / 004EF0E0 / 004C8C90 / 004C8CD0',method='Original shower scheduler, content pool, busy writes, search and column traversal execute together; parent lookup, allocation and constructor observed; collision, random and actor virtual interfaces observed. Original nearest-body query and sparse iteration execute. Includes blocked/empty/ground/ceiling/partial terrain and distance boundary rejection.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} composed crate searches')
