"""Execute full 00501880 teleport search with004DF270 query and004D1260 placement with original key classification and queue writes; external input/registry/worm queries are interfaces."""
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

context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
vtable=owner+0x1000;manager=owner+0x2000;manager_vtable=owner+0x2100;xp=owner+0x3000;yp=xp+4
write(owner,vtable);write(context+0x7d4,manager);write(manager,manager_vtable);write(manager_vtable+12,stop+0x100);cpu.mem_write(stop+0x100,b'\xc2\x0c\x00')
for offset,address in [(12,0x4df270),(0x5c,0x4d0f50),(0x74,0x4d0fd0),(0x78,0x4d0fe0),(0x100,0x4d1260)]:write(vtable+offset,address)
def signed(address):return struct.unpack('<i',cpu.mem_read(address,4))[0]
def put(address,value):write(address,value&0xffffffff)
calls=[];attempts=0;accept_at=0;restore_blocked=0
def hook(cpu,address,size,user):
 global attempts
 sp=cpu.reg_read(UC_X86_REG_ESP);actor=read(sp+4);x=signed(sp+8);y=signed(sp+12);mode=signed(actor+0x40)
 calls.append([mode,x,y,signed(actor+0x90),signed(actor+0x94),signed(actor+0xb8)])
 if mode==2:hit=restore_blocked
 else:hit=int(attempts!=accept_at);attempts+=1
 cpu.reg_write(UC_X86_REG_EAX,hit)
cpu.hook_add(UC_HOOK_CODE,hook,begin=stop+0x100,end=stop+0x100)
cases=[]
for ceiling in [0,1]:
 for y in [7*65536+123,40*65536+456]:
  for accept_at in [0,1,30,31,62,-1]:
   for restore_blocked in [0,1]:
    fields={0x40:0x420cc6,0x90:456*65536+123,0x94:321*65536+456,0xb8:7,0x190:0x21cce}
    for offset,value in fields.items():put(owner+offset,value)
    x=123*65536+789;put(xp,x);put(yp,y);write(context+0x1b8ac,ceiling);calls=[];attempts=0
    sp=stack+0xf000
    for i,value in enumerate([stop,xp,yp,owner]):write(sp+i*4,value)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x501880,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(fields={str(k):v for k,v in fields.items()},x=x,y=y,ceiling=ceiling,acceptAt=accept_at,restoreBlocked=restore_blocked,calls=calls,accepted=cpu.reg_read(UC_X86_REG_EAX),output=[signed(xp),signed(yp)],final=[signed(owner+o) for o in fields]))
args.output.write_text(json.dumps(dict(executableSha256=digest,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} composed physics placement cases')
