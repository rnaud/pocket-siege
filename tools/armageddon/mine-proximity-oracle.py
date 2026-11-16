"""Execute original mine proximity routine004E9F00 with ordered body enumeration."""
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
manager=owner+0x1000;vtable=owner+0x1100;first=stop+0x100;next_body=stop+0x200
write(context+0x7d4,manager);write(manager,vtable);write(vtable+0x48,first);write(vtable+0x4c,next_body)
for address in [first,next_body]:cpu.mem_write(address,b'\xc2\x08\x00')
body_list=[];index=0
def hook(cpu,address,size,user):
 global index
 if address not in [first,next_body]:return
 index=0 if address==first else index+1
 sp=cpu.reg_read(UC_X86_REG_ESP)
 write(read(sp+4),body_list[index] if index<len(body_list) else 0)
 cpu.reg_write(UC_X86_REG_EAX,1 if index<len(body_list) else 0)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for mask in [60,0,0xffffffff]:
 for kind in [1,2,3,4,5,6,15,34]:
  for dx,dy in [[0,0],[48*65536,0],[48*65536+1,0],[-48*65536-1,0],[24*65536,24*65536],[24*65536+1,24*65536+1],[34*65536,34*65536],[-1,-1],[0,49*65536]]:
   for radius in [0,48]:
    x,y=100*65536+100,200*65536+200
    candidates=[dict(type=kind,x=x+dx,y=y+dy),dict(type=2,x=x,y=y)]
    write(owner+0x90,x);write(owner+0x94,y);write(owner+0x114,mask)
    body_list=[]
    for i,c in enumerate(candidates):
     ptr=owner+0x2000+i*0x400;body_list.append(ptr);write(ptr,0x526de0);write(ptr+0x3c,c['type']);write(ptr+0x90,c['x']&0xffffffff);write(ptr+0x94,c['y']&0xffffffff)
    sp=stack+0xff00;write(sp,stop);write(sp+4,radius);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4e9f00,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Mine proximity routine did not finish')
    result=cpu.reg_read(UC_X86_REG_EAX)
    cases.append(dict(x=x,y=y,mask=mask,radius=radius,candidates=candidates,result=body_list.index(result) if result else -1))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E9F00 and original body type/position getters executed unchanged; ordered registry first/next enumeration supplied by hook.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mine proximity cases')
