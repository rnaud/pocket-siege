"""Execute original terrain-file reader with explicit CRT and image interfaces."""
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


name_buffer=0x7d6058
sources=[]
for name in ['DATA/CUSTOM/SNOW/LEVEL.DIR','DATA/WATER/BLUE/WATER.DIR']:
 data_=(args.executable.parents[2]/name).read_bytes();offset=struct.unpack_from('<I',data_,8)[0]+4
 directory=data_[offset:];names=[]
 for i in range(1024):
  node=struct.unpack_from('<I',directory,i*4)[0]
  while node:
   node-=4;names.append(directory[node+12:directory.index(0,node+12)].decode('latin1'));node=struct.unpack_from('<I',directory,node)[0]
 sources.append(dict(path=name,sha256=hashlib.sha256(data_).hexdigest(),index=directory.hex(),names=names))
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(name_buffer,256))).hexdigest()
def hook(cpu,address,size,user):
 global allocations
 sp=cpu.reg_read(UC_X86_REG_ESP);allocations+=1
 result=0 if failure and allocations%3==0 else owner+0x6000+allocations*16
 calls.append(['allocate',read(sp+4),snapshot(),result])
 cpu.reg_write(UC_X86_REG_EAX,result);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4)
cpu.hook_add(UC_HOOK_CODE,hook,begin=0x492550,end=0x492550)
cases=[]
for source_index,source in enumerate(sources):
 for pattern in [0,0xa5]:
  for failure in [False,True]:
   cpu.mem_write(owner,bytes([pattern])*0x10000);cpu.mem_write(name_buffer,bytes([pattern])*256)
   write(owner+4,owner+0x1000);write(owner+0x18c,16);write(owner+0x190,0)
   for i in range(16):write(owner+0x10c+i*4,i)
   cpu.mem_write(owner+0x1000,bytes.fromhex(source['index']))
   for i in range(1024):
    at=owner+0x1000+i*4;relative=read(at)
    if relative:
     node=owner+0x1000+relative-4;write(at,node)
     while read(node):next_=owner+0x1000+read(node)-4;write(node,next_);node=next_
   steps=[];allocations=0
   requests=['missing.img','SOIL.IMG','Grass.Img','layer\\layer.spr']+[source['names'][i%len(source['names'])].upper() for i in range(20)]
   for name in requests:
    calls=[];cpu.mem_write(owner+0x5000,name.encode('latin1')+b'\0')
    sp=stack+0xf000;write(sp,stop);write(sp+4,owner+0x5000);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4ad780,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    steps.append(dict(name=name,calls=calls,result=cpu.reg_read(UC_X86_REG_EAX),sha256=snapshot()))
   cases.append(dict(source=source_index,pattern=pattern,failure=failure,steps=steps))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004AD780',sources=sources,method='Eight original lookup sequences,192 calls, using real snow/water directory indexes. Full64KiB plus shared256-byte name buffer at allocations and each return. Includes case folding, missing/nested names, repeated opens, allocation failures and pool exhaustion. Heap allocation remains interface.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {sum(len(c["steps"]) for c in cases)} archive lookups')
