"""Execute controller events composed with native task dispatch against the original executable."""
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

context=0x2300000;cpu.mem_map(context,0x20000);registry=owner+0x4000;slots=owner+0x5000;command=owner+0x5200;vtable=owner+0x5300
callback=stop+0x100;cpu.mem_write(callback,b'\xc2\x10\x00');write(vtable+8,callback)
def task(i):return owner+0x1000+i*0x100
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==callback:
  identity=(cpu.reg_read(UC_X86_REG_ECX)-owner-0x1000)//0x100;sender=read(sp+4);length=read(sp+12);p=read(sp+16)
  calls.append(['event',identity,999 if sender==owner else sender,read(sp+8),length,list(cpu.mem_read(p,length)) if p else None])
 elif address==0x4edc90:calls.append(['sound']+[signed(sp+4+4*i) for i in range(5)])
 elif address==0x4e54d0:calls.append(['default',signed(sp+4)])
for address,n in [(0x4edc90,5),(0x4e54d0,1)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',n*4))
for address in [callback,0x4edc90,0x4e54d0]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
offsets=[0x4c,0x48,0x58,0x70,0x7c,0x84,0xac,0xbc,0xf8];cases=[]
for event in [0x406,0x40e,0x41d,0x42f,0x427,0x440,0x434,0x42d]:
 for bits in range(32):
  cpu.mem_write(owner,bytes(0x8000));cpu.mem_write(context,bytes(0x20000));write(vtable+8,callback)
  for i in range(1,6):write(task(i),vtable)
  write(owner+0x38,context);write(owner+0x30,registry)
  fields={0x3c:2,0x4c:3,0x40:bits&1,0x48:(bits>>1)&1,0x58:1,0x70:1,0x7c:1000 if bits&4 else 0,0x84:0,0xac:1,0xbc:1,0xf8:1,0xe8:-1,0xf0:-1,0xf4:-1}
  for o,v in fields.items():write(owner+o,v&0xffffffff)
  children=[1,0,2];write(owner+0x14,len(children));write(owner+0x18,slots)
  for i,v in enumerate(children):write(slots+4*i,task(v) if v else 0)
  entries=[] if bits&8 else [(2,35,3),(2,36,4),(20,0,5)]
  for i,(typ,index,identity) in enumerate(entries):
   entry=owner+0x6000+i*0x20;bucket=(index*17+typ)&255
   for o,v in [(4,0),(8,typ),(12,index),(16,task(identity))]:write(entry+o,v)
   write(registry+4+bucket*4,entry)
  write(command,1 if bits&16 else 2);write(command+4,4)
  length=0 if event in [0x440,0x434,0x42d] else 8 if event==0x427 else 4;p=command if length else 0
  calls=[];sp=stack+0xf000
  for i,v in enumerate([stop,123,event,length,p]):write(sp+i*4,v)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4e6810,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(event=event,fields={str(k):v for k,v in fields.items()},entries=entries,children=children,payload=list(cpu.mem_read(p,length)) if p else None,size=length,calls=calls,body=[signed(owner+o) for o in offsets]))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E6810 with native task registry/dispatch and worm transfer',offsets=offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} composed controller dispatch cases')
