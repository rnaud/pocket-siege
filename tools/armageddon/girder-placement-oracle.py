"""Execute full 00501700 girder placement validation with original key classification and queue writes; external input/registry/worm queries are interfaces."""
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

context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x38,context);write(owner+0x3c,2);write(owner+0x4c,3)
shape=owner+0x1000;worm=owner+0x1100;surface=owner+0x1200;manager=owner+0x1300;vtable=owner+0x2000
for i,obj in enumerate([shape,worm,surface,manager]):write(obj,vtable+i*0x200)
write(context+0x2f4,surface);write(context+0x7d4,manager)
for obj,offset,address,argc in [(shape,0x14,stop+0x100,2),(worm,0x5c,stop+0x110,2),(surface,0x50,stop+0x120,0),(surface,0x4c,stop+0x130,8),(manager,0x30,stop+0x140,6)]:
 write(read(obj)+offset,address);cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
cpu.mem_write(0x4ccf50,b'\xc2\x08\x00')
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def put(a,v):write(a,v&0xffffffff)
calls=[];dimensions=[];position=[];found=1;hit=0

def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  calls.append(['dimensions'])
  for i,v in enumerate(dimensions):put(read(sp+4+i*4),v)
 elif address==0x4ccf50:
  calls.append(['lookup',signed(sp+4),signed(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,worm if found else 0)
 elif address==stop+0x110:
  calls.append(['position'])
  for i,v in enumerate(position):put(read(sp+4+i*4),v)
 elif address==stop+0x120:calls.append(['clear'])
 elif address==stop+0x140:
  calls.append(['draw']+[signed(sp+i*4) for i in range(2,7)]);assert read(sp+4)==surface
 elif address==stop+0x130:
  values=[signed(sp+i*4) for i in range(1,9)];assert values[4]==shape;values[4]='shape';calls.append(['overlap',*values]);cpu.reg_write(UC_X86_REG_EAX,hit&0xffffffff)
for address in [stop+0x100,stop+0x110,stop+0x120,stop+0x130,stop+0x140,0x4ccf50]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for dimensions in [[32,16],[33,17],[128,64]]:
 for x,y in [[0,0],[16,8],[100,100],[1904,688],[1920,696],[1921,697],[-1,100]]:
  for distance in [0,1,100,155,156,157,176,65535]:
   for found,hit in [(0,0),(1,0),(1,1),(1,-1)]:
    position=[-20*65536+123,40*65536+456];cpu.mem_write(context+0x11d6c,struct.pack('<H',distance));calls=[]
    sp=stack+0xf000
    for i,v in enumerate([stop,x,y,shape]):put(sp+i*4,v)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x501700,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(dimensions=dimensions,x=x,y=y,distance=distance,position=position,found=found,hit=hit,calls=calls,result=cpu.reg_read(UC_X86_REG_EAX)))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='00501700',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} girder placement cases')
