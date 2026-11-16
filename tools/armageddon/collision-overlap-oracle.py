"""Execute original collision-mask overlap in Unicorn.

004CC310 dispatch and 004CC0C0 word intersection execute unchanged. Only bitmap
dimension/storage getters are supplied. No game entry runs.
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
parser.add_argument('--shape', type=int, default=3)
parser.add_argument('--include-worm', action='store_true')
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




fixture=json.loads(Path('tests/fixtures/armageddon/collision-mask.json').read_text())
heap=0x3000000;cpu.mem_map(heap,0x400000)
bitmap_vtable=owner+0x1000;dimensions=owner+0x1100;storage=owner+0x1200
write(bitmap_vtable+0x14,dimensions);write(bitmap_vtable+0x20,storage)
cpu.mem_write(dimensions,b'\xc2\x08\x00');cpu.mem_write(storage,b'\xc2\x0c\x00')
bitmaps={}
def bitmap(width,height,points):
 global heap
 obj=heap;heap+=0x100;address=heap;stride=((width+31)//32)*4;heap+=(stride*height+0xff)&~0xff
 data=bytearray(stride*height)
 for x,y in points:
  off=y*stride+(x//32)*4;word=struct.unpack_from('<I',data,off)[0]|1<<(x%32);struct.pack_into('<I',data,off,word)
 cpu.mem_write(address,bytes(data));write(obj,bitmap_vtable);bitmaps[obj]=(width,height,address,stride)
 return obj
def mask(row,shifted=True):
 global heap
 obj=heap;heap+=0x100
 for off,val in [(4,int(shifted)),(12,row['width']),(16,row['height']),(20,row['anchorX']),(24,row['anchorY'])]:write(obj+off,val)
 for i,plane in enumerate(row['planes'] if shifted else row['planes'][:1]):write(obj+28+4*i,bitmap(plane['width'],plane['height'],plane['points']))
 return obj
def observe(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);w,h,data,stride=bitmaps[cpu.reg_read(UC_X86_REG_ECX)]
 values=[w,h] if address==dimensions else [data,1,stride]
 for i,v in enumerate(values):write(read(sp+4+4*i),v)
for address in [dimensions,storage]:cpu.hook_add(UC_HOOK_CODE,observe,begin=address,end=address)
worm=next(r for r in fixture['cases'] if r['shape']==args.shape);worm_object=mask(worm)
terrains=[];cases=[]
for pattern in range(7 if args.include_worm else 6):
 points=[]
 for y in range(48):
  for x in range(64):
   solid=[False, y>=24, x==31, (x+y)%7==0, (x,y)==(32,24), True, False][pattern]
   if solid:points.append([x,y])
 row=dict(width=64,height=48,anchorX=0,anchorY=0,planes=[dict(width=64,height=48,points=points)])
 if pattern==6:row=next(r for r in fixture['cases'] if r['shape']==3)
 terrain=mask(row,pattern==6);terrains.append(row)
 for reverse in [False,True]:
  for x in [-12,-4,0,1,4,15,27,28,29,30,31,32,33,34,35,60,63,64,68,76]:
   for y in [-20,-9,-1,0,8,9,10,17,23,24,25,39,47,48,57,60]:
    a,ax,ay,b,bx,by=(terrain,0,0,worm_object,x,y) if reverse else (worm_object,x,y,terrain,0,0)
    sp=stack+0xf000
    for i,v in enumerate([stop,ax,ay,b,bx,by]):write(sp+4*i,v&0xffffffff)
    cpu.reg_write(UC_X86_REG_ECX,a);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4cc310,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Overlap did not return')
    cases.append(dict(pattern=pattern,reverse=reverse,x=x,y=y,result=cpu.reg_read(UC_X86_REG_EAX)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original 004CC310 dispatch and 004CC0C0 bit-plane overlap; bitmap dimension/storage getters supplied; original-mask points from constructor capture, six synthetic terrain planes.' + (' Includes original shape3 worm target; source shape='+str(args.shape)+'.' if args.include_worm else ''),terrains=terrains,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} native mask overlaps')
