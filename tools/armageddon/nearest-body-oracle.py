"""Execute native nearest-body query with original sparse global iteration."""
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
manager=owner+0x1000;vt=owner+0x2000;slots=owner+0x3000;bodyvt=owner+0x4000
write(owner+0x38,context);write(context+0x7d4,manager);write(manager,vt)
write(vt+0x48,0x4c8c90);write(vt+0x4c,0x4c8cd0);write(manager+0x28,slots)
write(bodyvt+0x50,stop+0x100);write(bodyvt+0x5c,stop+0x200)
cpu.mem_write(stop+0x100,b'\xc3');cpu.mem_write(stop+0x200,b'\xc2\x08\x00')
def hook(cpu,address,size,user):
 body=bodies[(cpu.reg_read(UC_X86_REG_ECX)-owner-0x5000)//0x100]
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  calls.append(['type',body['id']]);cpu.reg_write(UC_X86_REG_EAX,body['type'])
 else:
  calls.append(['position',body['id']]);write(read(sp+4),body['x']);write(read(sp+8),body['y'])
for address in [stop+0x100,stop+0x200]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for order in [[],[None],[0],[1,0],[None,0,None,1,2,None],[2,1,0]]:
 for flags in [0,2,4,0x21c04,0x80000000,0xffffffff]:
  for x,y in [(0,0),(65536,-65536),(-2147483648,0),(2147483647,-2147483648)]:
   bodies=[dict(id=0,type=2,x=100*65536,y=20*65536),dict(id=1,type=31,x=-65536,y=65536),dict(id=2,type=34,x=2147483647,y=-2147483648)]
   for i,b in enumerate(bodies):write(owner+0x5000+i*0x100,bodyvt)
   write(manager+0x24,len(order))
   for i,b in enumerate(order):write(slots+4*i,0 if b is None else owner+0x5000+b*0x100)
   out=owner+0x6000;write(out,123456);sp=stack+0xf000
   for i,v in enumerate([stop,x,y,out,flags]):write(sp+i*4,v)
   calls=[];cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4ef0e0,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   result=signed(read(out)) if cpu.reg_read(UC_X86_REG_EAX) else None
   cases.append(dict(bodies=[None if b is None else bodies[b] for b in order],x=x,y=y,flags=flags,result=result,calls=calls))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004EF0E0 / 004C8C90 / 004C8CD0',method='Original nearest distance arithmetic, type filtering and sparse global list iteration; actor type and position virtual interfaces observed.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} nearest-body queries')
