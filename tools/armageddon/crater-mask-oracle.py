"""Execute original crater circle instructions in Unicorn.

Original crater circle instructions execute; pixel writes are captured. No game entry point runs.
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




vtable,pixel=owner+0x2000,owner+0x3000
write(owner,vtable);write(vtable+0x58,pixel);cpu.mem_write(pixel,b'\xc2\x0c\x00')
# Imported CRT _ftol adapter: truncate ST0 to signed 64-bit and pop it.
cpu.mem_write(owner+0x3100,struct.pack('<H',0x0f7f))
cpu.mem_write(0x504110,b'\xd9\x2d'+struct.pack('<I',owner+0x3100)+b'\x83\xec\x08\xdf\x3c\x24\x58\x5a\xc3')
pixels=set()
def capture(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 x,y,color=struct.unpack('<3i',cpu.mem_read(sp+4,12))
 if color:pixels.add((x,y))
 else:pixels.discard((x,y))
cpu.hook_add(UC_HOOK_CODE,capture,begin=pixel,end=pixel)
def circle(radius,color):
 sp=stack+0xf000
 for i,value in enumerate([stop,0,0,radius,color]):write(sp+i*4,value&0xffffffff)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x492f10,stop,count=2000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Circle did not return')
def rows():
 result=[]
 for y in sorted({p[1] for p in pixels}):
  xs=sorted(x for x,py in pixels if py==y)
  result.append([y,xs])
 return result
cases=[]
for index in range(16):
 inner=index*94//15+6;outer=inner+5
 pixels.clear();circle(inner,1);hole=rows()
 pixels.clear();circle(outer,1);circle(inner,0);rim=rows()
 cases.append(dict(index=index,inner=inner,outer=outer,hole=hole,rim=rim))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='00492F10',method='Original x87 circle rasterizer with CRT ftol truncation adapter, captured virtual pixel writes; radii from 004A8E50.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} crater masks')
