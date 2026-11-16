"""Execute original collision-mask constructor 004CBE20.

--image-pixels is JSON {width,height,pixels} decoded by the project's IMG
reader from the supplied masks.img. Allocations and pixel access are captured.
No game entry point runs.
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
parser.add_argument('--image-pixels', type=Path, required=True)
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




source=json.loads(args.image_pixels.read_text())
source_object=owner+0x2000;source_vtable=owner+0x2100;getter=owner+0x2200
write(source_object,source_vtable);write(source_vtable+0x54,getter)
pixel=read(0x526328+0x58)
for address,n in [(getter,8),(pixel,12),(0x492bc0,12),(0x492550,0)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',n))
heap=owner+0x4000;planes={};queries=[]
def observe(cpu,address,size,user):
 global heap
 sp=cpu.reg_read(UC_X86_REG_ESP);obj=cpu.reg_read(UC_X86_REG_ECX)
 if address==0x492550:
  cpu.reg_write(UC_X86_REG_EAX,heap);heap+=0x100
 elif address==0x492bc0:
  w,h,depth=struct.unpack('<3i',cpu.mem_read(sp+4,12));planes[obj]=dict(width=w,height=h,points=[]);cpu.reg_write(UC_X86_REG_EAX,obj)
 elif address==getter:
  x,y=struct.unpack('<2i',cpu.mem_read(sp+4,8));queries.append([x,y]);cpu.reg_write(UC_X86_REG_EAX,source['pixels'][y*source['width']+x])
 elif address==pixel:
  x,y,value=struct.unpack('<3i',cpu.mem_read(sp+4,12))
  if value:planes[obj]['points'].append([x,y])
for address in [0x492550,0x492bc0,getter,pixel]:cpu.hook_add(UC_HOOK_CODE,observe,begin=address,end=address)
cases=[]
for shape,params in [(2,[45,7,52,12,48,9]),(3,[13,10,22,26,17,19]),(4,[46,36,65,54,55,45]),(5,[0,32,24,61,12,51]),(6,[0,0,1,1,0,0])]:
 heap=owner+0x4000;planes={};queries=[]
 sp=stack+0xf000
 for i,value in enumerate([stop,*params,source_object]):write(sp+4*i,value)
 cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4cbe20,stop,count=3000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Mask constructor did not return')
 cases.append(dict(shape=shape,params=params,width=read(owner+12),height=read(owner+16),anchorX=read(owner+20),anchorY=read(owner+24),planes=[planes[read(owner+28+4*i)] for i in range(32)]))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original 004CBE20 mask constructor; bitmap allocation and pixel access are captured interfaces. Source pixels decoded from shipped masks.img.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mask constructors with 32 shifted planes each')
