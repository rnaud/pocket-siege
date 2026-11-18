"""Execute original renderer additive blend table construction without substituted routines."""
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
owner,stack,stop=0x2000000,0x2100000,0x2200000
cpu.mem_map(owner,0x20000);cpu.mem_map(stack,0x10000);cpu.mem_map(stop,0x1000)
def write(address,value):cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def call(entry,values,receiver):
 sp=stack+0xf000
 for i,v in enumerate([stop]+values):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ECX,receiver);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(entry,stop,count=2000000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Blend builder did not return')
 return cpu.reg_read(UC_X86_REG_EAX)
cases=[]
for pattern in [0,165]:
 for layout in [0,1]:
  for dirty in [0,1]:
   cpu.mem_write(owner,bytes([pattern])*0x20000)
   for bank in range(8):write(owner+0x4ae4+bank*4,0)
   palettes=[]
   for bank,first,colors in [(1,0,[[0,0,0],[28,67,35],[255,0,0],[0,255,0],[0,0,255],[127,128,129]]),(3,3 if layout else 137,[[256,-1,511],[20,40,60],[255,255,255],[28,67,35]])]:
    address=owner+0x16000+bank*0x1000
    call(0x4adac0,[first,first+len(colors)-1],address)
    for color in colors:
     cpu.mem_write(stack+0x1000,struct.pack('<3h',*color));call(0x4adcb0,[stack+0x1000],address)
    write(owner+0x4ae4+bank*4,address);write(address+0xb14,123)
    palettes.append(dict(bank=bank,first=first,colors=colors))
   write(owner+0x14b2c,dirty)
   initial=hashlib.sha256(bytes(cpu.mem_read(owner,0x20000))).hexdigest()
   call(0x4982c0,[],owner)
   state=hashlib.sha256(bytes(cpu.mem_read(owner,0x20000))).hexdigest()
   draws=[]
   if dirty:
    destination=owner+0x1000;source_bitmap=owner+0x1100
    for bitmap,pixels,width,height,clip in [(destination,owner+0x2000,20,14,[1,1,19,13]),(source_bitmap,owner+0x3000,16,12,[2,1,14,10])]:
     for offset,value in [(0,0x5249b0),(4,1),(8,pixels),(12,8),(16,24),(20,width),(24,height),(28,clip[0]),(32,clip[1]),(36,clip[2]),(40,clip[3])]:write(bitmap+offset,value)
    cpu.mem_write(owner+0x2000,bytes(0 if i%5==0 else (i*13+7)&255 for i in range(1024)))
    cpu.mem_write(owner+0x3000,bytes(0 if i%3==0 else (i*17+3)&255 for i in range(1024)))
    for reflection in [0,0x10000,0x20000,0x30000]:
     result=call(0x4933c0,[-3,-2,11,7,source_bitmap,4,3,owner+0x4b2c,1|reflection],destination)
     draws.append(dict(reflection=reflection,result=result,state=hashlib.sha256(bytes(cpu.mem_read(owner,0x20000))).hexdigest()))
   cases.append(dict(pattern=pattern,layout=layout,dirty=dirty,palettes=palettes,initial=initial,state=state,draws=draws))
   print('Captured',pattern,layout,dirty,flush=True)
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004982C0',method='Original blend table builder, palette enumeration and closest color search execute unchanged with no hooks. Full128KiB renderer/palette memory compared before and after; dirty and clean calls, overlapping banks, signed color truncation and nearest-color ties. Dirty builds then compose four original indexed blits using the resulting table, including all reflection combinations and destination clipping.',cases=cases),separators=(',',':'))+'\n')
