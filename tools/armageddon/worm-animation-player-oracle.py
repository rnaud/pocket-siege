"""Execute original worm animation synchronization with the real player and metadata lookup."""
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

context=0x3000000;cpu.mem_map(context,0x20000)
write(owner+0x38,context);animation=owner+0x1000;vt=owner+0x2000
write(owner+0x350,animation);write(animation,vt)
write(animation,0x527670);provider=owner+0x3000;resources=0x2400000;cpu.mem_map(resources,0x10000)
write(animation+4,provider);write(provider,0x526468)
metadata={}
for identity in range(1,700):
 resource=resources+identity*32;write(provider+0x2864+identity*4,resource)
 rate=0 if identity%3==0 else 25<<16;loop=identity%2;span=5+identity%7
 write(resource+4,rate);cpu.mem_write(resource+0xc,struct.pack('<2H',loop,span));write(resource+0x14,1)
 metadata[identity]=dict(rate=rate,loop=loop,span=span)
for address,argc in [(0x4c3180,1),(0x4c2cc0,2)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  write(read(sp+4),current);write(read(sp+8),progress&0xffffffff);calls.append(['current'])
 elif address==stop+0x200:calls.append(['progress',signed(read(sp+4))])
 elif address==stop+0x300:calls.append(['reset'])
 elif address==stop+0x400:calls.append(['queue',read(sp+4)])
 elif address==0x4c3180:calls.append(['teamStatus',read(sp+4)]);cpu.reg_write(UC_X86_REG_EAX,status)
 elif address==0x4c2cc0:calls.append(['health',read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,health)
cpu.hook_add(UC_HOOK_CODE,hook)
transitions=[]
for i in range(100):
 row=[read(0x56f7d0+i*12+j*4) for j in range(3)]
 if not row[0]:break
 transitions.append(row)

currents=sorted(set([0,35,38,41,47,103,308,311,317,320,44,100,101]+[v for row in transitions for v in row[:2]]))
cases=[]
inputs=[(i%32,current,progress) for i,current in enumerate(currents) for progress in [-1,0,0x7800,0x8000,0x8700,0x8800,0x10000,0x20000]]+[(bits,0,0) for bits in range(32)]
for bits,current,progress in inputs:
 write(owner+0xfc,2);write(owner+0x100,3);write(owner+0x14c,bits&1);write(owner+0x148,(bits>>2)&1)
 status=(bits>>1)&1;health=29 if bits&8 else 30;color=bits%6;marked=(bits>>4)&1
 cpu.mem_write(context+6000+0x3cd1,bytes([color,marked]))
 cpu.mem_write(animation+8,bytes(0x15c))
 rate=0 if bits&1 else 25<<16;readIndex=bits&15;queued=15 if bits&4 else 0
 for i,v in enumerate([current,progress,rate,0,5,(readIndex+queued)&15,readIndex]):write(animation+8+i*4,v&0xffffffff)
 for i in range(16):
  for j,v in enumerate([100+i,70+i,25<<16,1,9]):write(animation+0x24+i*20+j*4,v)
 before=list(cpu.mem_read(animation+8,0x15c))
 sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 calls=[];cpu.emu_start(0x4f6010,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(before=before,after=list(cpu.mem_read(animation+8,0x15c)),bits=bits,current=current,progress=progress,status=status,health=health,color=color,marked=marked,calls=calls))
args.output.write_text(json.dumps(dict(sha256=digest,metadata=metadata,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} worm animation synchronization cases')
