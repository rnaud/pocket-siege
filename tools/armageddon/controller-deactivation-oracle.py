"""Execute004E6810 blocking, resume and deactivation with original ownership mutations."""
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

context=0x2300000;cpu.mem_map(context,0x20000);command=owner+0x1000;keyboard=owner+0x2000;vtable=keyboard+0x100;actor=owner+0x3000
write(keyboard,vtable);write(vtable+8,stop+0x100);write(actor,vtable+0x100);write(vtable+0x100,stop+0x110)
interfaces=[(0x4c2d60,2),(0x4c2d40,2),(0x4c2ee0,2),(0x4c3010,2),(0x4eebf0,1),(0x4ccf50,2),(0x4b26a0,6),(stop+0x100,1),(stop+0x110,1)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4b26a0:
  size=read(sp+20);p=read(sp+24);calls.append(['send',read(sp+8),signed(sp+12),read(sp+16),list(cpu.mem_read(p,size)) if size else []])
 else:
  name,n,result={0x4c2d60:('state',2,state),0x4c2d40:('teamState',2,0),0x4c2ee0:('available',2,1),0x4c3010:('consume',2,0),0x4eebf0:('camera',1,0),0x4ccf50:('lookup',2,actor if exists else 0),stop+0x100:('repeat',1,0),stop+0x110:('destroy',1,0)}[address]
  calls.append([name]+[signed(sp+4+i*4) for i in range(n)]);cpu.reg_write(UC_X86_REG_EAX,result)
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
offsets=[0x40,0x48,0x50,0x58,0x5c,0x64,0x68,0x7c,0x88,0x8c,0x90,0x94,0x98,0x9c,0xa0,0xa4,0xa8,0xac,0xbc,0xc8,0xd8,0xe4,0xe8,0xec,0xf0,0xf4,0xf8,0x108];cases=[]
for event in [0x41d,0x41e,0x41f]:
 for bits in range(128):
  cpu.mem_write(owner,bytes(0x200));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context);write(context+4,keyboard)
  fields={**{o:1 for o in offsets},0x3c:2,0x4c:3,0x44:-1 if bits&2 else 2,0x64:34,0x50:(bits>>2)&1,0x70:(bits>>3)&1,0xe8:9,0xf4:7,0xec:-1 if bits&16 else 8,0xf0:-1 if bits&16 else 10,0x88:90 if bits&32 else 20}
  for o,v in fields.items():write(owner+o,v&0xffffffff)
  cpu.mem_write(context+0x11d7c,struct.pack('<b',2 if bits&64 else 3));write(command,1 if bits&1 else 2)
  for base,owners in [(0x1b778,[7,9]),(0x1b7e0,[8]),(0x1b848,[10])]:
   free=[] if bits&32 else [11,12]
   if bits&64:owners=[3]+owners
   cpu.mem_write(context+base+0x20,struct.pack('<h',len(free)));cpu.mem_write(context+base+0x62,struct.pack('<h',len(owners)))
   for i,v in enumerate(free):cpu.mem_write(context+base+2*i,struct.pack('<h',v))
   for i,v in enumerate(owners):cpu.mem_write(context+base+0x42+2*i,struct.pack('<h',v));cpu.mem_write(context+base+0x22+2*i,struct.pack('<h',4 if i==0 and bits&64 else 2))
  initial=list(cpu.mem_read(context+0x1b778,0x134));calls=[];state=0x89 if bits&16 else 0x65;exists=bool(bits&32)
  sp=stack+0xf000
  for i,v in enumerate([stop,0,event,4,command]):write(sp+i*4,v)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4e6810,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(event=event,fields={str(k):v for k,v in fields.items()},active=2 if bits&64 else 3,team=read(command),state=state,exists=exists,initial=initial,calls=calls,body=[signed(owner+o) for o in offsets],ownership=list(cpu.mem_read(context+0x1b778,0x134))))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E6810 events41D/41E/41F',offsets=offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} deactivation cases')
