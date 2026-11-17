"""Execute full 004C9500 collision registry bitmap drawing with original key classification and queue writes; external input/registry/worm queries are interfaces."""
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

manager=owner+0x8000;vtable=owner+0x1000;surface=owner+0x1800
write(vtable+4,stop+0x100);write(vtable+8,stop+0x110)
for address in [stop+0x100,stop+0x110]:cpu.mem_write(address,b'\xc2\x10\x00')
bodies={i:owner+0x2000+i*0x100 for i in range(1,6)};masks={i:owner+0x3000+i*0x100 for i in range(1,6)}
for i in masks:write(masks[i],vtable)
calls=[]
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def put(a,v):write(a,v&0xffffffff)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);mask=next(i for i,p in masks.items() if p==cpu.reg_read(UC_X86_REG_ECX))
 if address==stop+0x100:
  calls.append(['bounds',mask])
  for i,v in enumerate([32,16,-123456,987654]):put(read(sp+4+i*4),v)
 else:
  assert read(sp+4)==surface;calls.append(['draw',mask,signed(sp+8),signed(sp+12),signed(sp+16)])
for address in [stop+0x100,stop+0x110]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for flags in [0,2,4,6,0x80000000,0xfffffffd,0xffffffff]:
 for excluded in [0,1,3,5]:
  for fraction in [-1,0,1,65535]:
   for mode in [0,1,5]:
    cpu.mem_write(manager,bytes(0x400));registry=[[] for _ in range(32)];rows=[]
    for id,type,x,y,enabled in [(1,1,10,20,1),(2,2,-10,-20,0),(3,2,30,40,1),(4,31,-30,50,1),(5,0,0,0,1)]:
     row=dict(id=id,type=type,x=x*65536+fraction,y=y*65536-fraction,enabled=enabled);rows.append(row);registry[type].append(id)
     for o,v in [(0x48,enabled),(0x90,row['x']),(0x94,row['y']),(0xf0,masks[id])]:put(bodies[id]+o,v)
    registry[2]=[0,2,0,3,0]
    for type,ids in enumerate(registry):
     array=owner+0x4000+type*0x40;write(manager+0x40+type*0x1c,len(ids));write(manager+0x44+type*0x1c,array)
     for i,id in enumerate(ids):write(array+i*4,bodies.get(id,0))
    dx=65536+fraction;dy=-65536+fraction;calls=[];sp=stack+0xf000
    for i,v in enumerate([stop,surface,dx,dy,bodies.get(excluded,0),flags,mode]):put(sp+i*4,v)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,manager);cpu.emu_start(0x4c9500,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(flags=flags,excluded=excluded,dx=dx,dy=dy,mode=mode,bodies=rows,registry=registry,calls=calls))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004C9500',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} registry drawing cases')
