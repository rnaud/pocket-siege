"""Execute full 00501700 girder validation with native registry and bitmap raster operations with original key classification and queue writes; external input/registry/worm queries are interfaces."""
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

context=0x2300000;cpu.mem_map(context,0x20000);heap=0x3000000;cpu.mem_map(heap,0x100000)
manager=owner+0x1000;surface=owner+0x2000;shape=owner+0x2100;worm=owner+0x2200;terrain_body=owner+0x2300;actor=owner+0x2400;terrain_mask=owner+0x2500;actor_mask=owner+0x2600;terrain_bitmap=owner+0x2700;actor_bitmap=owner+0x2800
surface_data=heap;shape_data=heap+0x30000;terrain_data=heap+0x31000;actor_data=heap+0x32000
write(owner+0x38,context);write(owner+0x3c,2);write(owner+0x4c,3);write(context+0x2f4,surface);write(context+0x7d4,manager);write(manager,0x5268b8)
write(worm,0x526de0);write(worm+0x90,90*65536);write(worm+0x94,90*65536)
cpu.mem_write(0x4ccf50,b'\xc2\x08\x00')
def hook(cpu,address,size,user):cpu.reg_write(UC_X86_REG_EAX,worm)
cpu.hook_add(UC_HOOK_CODE,hook,begin=0x4ccf50,end=0x4ccf50)
def bitmap(obj,address,width,height,bits,values):
 stride=((width*bits+31)//32)*4;storage=bytearray(stride*height)
 for y in range(height):
  for x in range(width):
   value=values[y*width+x]
   if bits==1:
    if value:storage[y*stride+x//8]|=1<<(x%8)
   else:storage[y*stride+x]=value
 for o,v in [(0,0x526328 if bits==1 else 0x5249b0),(8,address),(12,bits),(16,stride),(20,width),(24,height),(28,0),(32,0),(36,width),(40,height)]:write(obj+o,v)
 cpu.mem_write(address,bytes(storage))
def mask(obj,width,height,ax,ay,bitmap):
 for o,v in [(0,0x526920),(12,width),(16,height),(20,ax),(24,ay),(28,bitmap)]:write(obj+o,v)
terrain_pixels=[int(y>=8 and not(12<=x<20)) for y in range(16) for x in range(32)]
actor_pixels=[int((x-3)**2+(y-3)**2<=12) for y in range(8) for x in range(8)]
bitmap(surface,surface_data,1920,696,1,[0]*(1920*696));bitmap(terrain_bitmap,terrain_data,32,16,1,terrain_pixels);bitmap(actor_bitmap,actor_data,8,8,1,actor_pixels)
mask(terrain_mask,32,16,0,0,terrain_bitmap);mask(actor_mask,8,8,4,4,actor_bitmap)
for obj,x,y,m in [(terrain_body,100,100,terrain_mask),(actor,140,120,actor_mask)]:
 for o,v in [(0x48,1),(0x90,x*65536),(0x94,y*65536),(0xf0,m)]:write(obj+o,v)
for type,obj in [(1,terrain_body),(2,actor)]:
 array=owner+0x4000+type*16;write(manager+0x40+type*0x1c,2);write(manager+0x44+type*0x1c,array);write(array,0);write(array+4,obj)
cases=[]
for pattern in [0,1]:
 sprite=[(173 if pattern==0 or (x+y)%3==0 else 0) for y in range(4) for x in range(8)];bitmap(shape,shape_data,8,4,8,sprite)
 for x,y in [(104,110),(116,112),(128,112),(140,120),(150,120),(3,3),(1919,695)]:
  for distance in [0,1,80]:
   for enabled in [0,1]:
    write(actor+0x48,enabled);cpu.mem_write(context+0x11d6c,struct.pack('<H',distance));cpu.mem_write(surface_data,bytes([0xa5])*(240*696))
    sp=stack+0xf000
    for i,v in enumerate([stop,x,y,shape]):write(sp+i*4,v)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x501700,stop,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(pattern=pattern,x=x,y=y,distance=distance,enabled=enabled,result=cpu.reg_read(UC_X86_REG_EAX),surfaceHash=hashlib.sha256(cpu.mem_read(surface_data,240*696)).hexdigest()))
args.output.write_text(json.dumps(dict(executableSha256=digest,terrain=terrain_pixels,actor=actor_pixels,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} composed girder bitmap cases')
