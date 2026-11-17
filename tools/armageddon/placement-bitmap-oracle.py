"""Execute full 00493380/004933C0 placement bitmap blits with original pixel operations with original key classification and queue writes; external input/registry/worm queries are interfaces."""
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

destination=owner;source=owner+0x100;dest_data=owner+0x1000;source_data=owner+0x2000

def bitmap(obj,address,width,height,bits,pixels,clip):
 stride=((width*bits+31)//32)*4;storage=bytearray(stride*height)
 for y in range(height):
  for x in range(width):
   value=pixels[y*width+x]
   if bits==1:
    if value:storage[y*stride+x//8]|=1<<(x%8)
   else:storage[y*stride+x]=value
 for offset,value in [(0,0x526328 if bits==1 else 0x5249b0),(8,address),(12,bits),(16,stride),(20,width),(24,height),(28,clip[0]),(32,clip[1]),(36,clip[2]),(40,clip[3])]:write(obj+offset,value)
 cpu.mem_write(address,bytes(storage));return stride

def pixels(address,width,height,stride):
 storage=cpu.mem_read(address,stride*height)
 return [int(bool(storage[y*stride+x//8]&(1<<(x%8)))) for y in range(height) for x in range(width)]
cases=[]
for bits in [1,8]:
 for mode in range(6):
  for x,y in [(-20,0),(-3,-2),(0,0),(1,1),(8,4),(24,12),(31,15),(32,16)]:
   for clip in [[0,0,32,16],[3,2,27,13]]:
    for width,height,sx,sy in [(16,8,0,0),(8,4,3,2),(0,4,0,0)]:
     initial=[int((i*13+i//32)%7<3) for i in range(32*16)]
     src=[(int((i*3+i//24)%5<2)*(1 if bits==1 else (172+(i&1)))) for i in range(24*12)]
     stride=bitmap(destination,dest_data,32,16,1,initial,clip);bitmap(source,source_data,24,12,bits,src,[0,0,24,12])
     sp=stack+0xf000
     for i,v in enumerate([stop,x,y,width,height,source,sx,sy,mode]):write(sp+i*4,v&0xffffffff)
     cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,destination)
     cpu.emu_start(0x493380,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
     cases.append(dict(bits=bits,mode=mode,x=x,y=y,width=width,height=height,sx=sx,sy=sy,clip=clip,initial=initial,source=src,result=cpu.reg_read(UC_X86_REG_EAX),output=pixels(dest_data,32,16,stride)))
args.output.write_text(json.dumps(dict(executableSha256=digest,routines=['00493380','004933C0'],cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} placement bitmap cases')
