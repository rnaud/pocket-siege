"""Execute original sprite queue insertion and flush with bundled MSVCRT qsort."""
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
parser.add_argument('runtime', type=Path)
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

# Map the bundled runtime at its preferred address; no DLL entry point runs.
runtime=args.runtime.read_bytes();runtime_digest=hashlib.sha256(runtime).hexdigest()
assert runtime_digest=='df9f2aab7f7119f214c5d743d961fde4bf324f19011fbbb7e9cf666856fba0ba'
pe=struct.unpack_from('<I',runtime,60)[0];opt=pe+24
runtime_base=struct.unpack_from('<I',runtime,opt+28)[0]
size=struct.unpack_from('<I',runtime,opt+56)[0]
cpu.mem_map(runtime_base,(size+0xfff)&~0xfff)
cpu.mem_write(runtime_base,runtime[:struct.unpack_from('<I',runtime,opt+60)[0]])
headers=opt+struct.unpack_from('<H',runtime,pe+20)[0]
for i in range(struct.unpack_from('<H',runtime,pe+6)[0]):
 _,rva,size,offset=struct.unpack_from('<IIII',runtime,headers+40*i+8)
 if size:cpu.mem_write(runtime_base+rva,runtime[offset:offset+size])
write(0x5178bc,0x78022f30)
queue=0x3000000;cpu.mem_map(queue,0x20000)
renderer=owner;vt=owner+0x1000;camera=owner+0x2000;draw=stop+0x100
write(renderer,vt);write(vt+0x48,draw);cpu.mem_write(draw,b'\xc2\x10\x00')
write(vt+0x4c,draw+0x100);cpu.mem_write(draw+0x100,b'\xc2\x20\x00')
def hook(cpu,address,size,user):
 if address in [draw,draw+0x100]:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  draws.append([signed(read(sp+i*4)) for i in range(1,5 if address==draw else 9)])
cpu.hook_add(UC_HOOK_CODE,hook,begin=draw,end=draw+0x100)
def call(entry,this,args):
 sp=stack+0xf000;write(sp,stop)
 for i,value in enumerate(args):write(sp+4+i*4,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,this)
 cpu.emu_start(entry,stop,count=10000000)
 assert cpu.reg_read(UC_X86_REG_EIP)==stop
import random
rng=random.Random(42);cases=[]
for composition in [0,1]:
 for count in [0,1,2,7,8,9,16,31,64,128,1024,1025]:
  for mode in range(4):
   remaining=65536 if mode!=3 else min(65536,max(0,count*36-1))
   cpu.mem_write(queue,bytes(0x20000));write(queue+4,remaining)
   requests=[]
   for i in range(count):
    order=([0xd0000]*count if mode==0 else list(range(count)) if mode==1 else [rng.choice([-2147483648,-1,0,0xc0000,0xd0000,2147483647]) for _ in range(count)])[i]
    request=[order,rng.randint(-0x400000,0x400000),rng.randint(-0x400000,0x400000),rng.choice([-0x10000,0,0x10000]),i,rng.randint(-65536,131072)]
    if composition and i%2:request += [7,19,23,i%4]
    requests.append(request);call(0x4c4180 if len(request)==10 else 0x4c3fa0,queue,request)
   view=dict(x=rng.choice([-65537,32768,123456]),y=rng.choice([-32768,65535,234567]),z=rng.choice([-65536,0,65536,0x40000,0x80000]),distance=0x40000)
   for i,key in enumerate(['x','y','z','distance']):write(camera+4+i*4,view[key])
   draws=[];call(0x4c42d0,queue,[renderer,camera])
   n=read(queue+0x10008)
   records=[[signed(read(read(queue+0x1000c+i*4)+j*4)) for j in range(13 if read(read(queue+0x1000c+i*4))==2 else 9)] for i in range(n)]
   cases.append(dict(remaining=remaining,requests=requests,view=view,available=read(queue+4),records=records,draws=draws))
args.output.write_text(json.dumps(dict(executable_sha256=digest,runtime_sha256=runtime_digest,entry='004C3FA0 / 004C4180 / 004C42D0 / 004C5190 / MSVCRT78022F30',method='Original insertion, comparator, bundled CRT sort and sprite/image projection execute unchanged; only renderer vtable48/4C are observed.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} native sprite queue sequences')
