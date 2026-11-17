"""Execute native004E6810 activation branch including original input ownership updates."""
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

context=0x2300000;cpu.mem_map(context,0x20000);command=owner+0x1000;keyboard=owner+0x2000;vtable=keyboard+0x100
write(keyboard,vtable);write(vtable+8,stop+0x100);write(vtable+0x100+8,stop+0x110)
interfaces=[(0x4b26f0,4),(0x4b26a0,6),(0x4c2990,1),(0x4e6630,0),(0x4e54d0,1),(0x4edaf0,2),(0x4edc50,5),(0x4ccfa0,4),(stop+0x100,1),(stop+0x110,4)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
cpu.mem_write(0x492550,b'\xc3')
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4b26f0:calls.append(['forward',read(sp+8),list(cpu.mem_read(read(sp+16),read(sp+12)))])
 elif address==0x4b26a0:
  size=read(sp+20);calls.append(['send',read(sp+8),signed(sp+12),read(sp+16),list(cpu.mem_read(read(sp+24),size)) if size else []])
 elif address==stop+0x110:calls.append(['self',read(sp+8),read(sp+12)])
 elif address==0x4ccfa0:calls.append(['construct',signed(sp+8),signed(sp+12),signed(sp+16)])
 else:
  name,n,result={0x4c2990:('mode',1,mode),0x4e6630:('delays',0,0),0x4e54d0:('default',1,0),0x4edaf0:('teamSound',2,77),0x4edc50:('sound',5,0),stop+0x100:('repeat',1,0),0x492550:('allocate',1,owner+0x4000 if allocation else 0)}[address]
  calls.append([name]+[signed(sp+4+i*4) for i in range(n)]);cpu.reg_write(UC_X86_REG_EAX,result)
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cpu.hook_add(UC_HOOK_CODE,hook,begin=0x492550,end=0x492550)
offsets=[0x40,0x58,0x60,0x7c,0x84,0x88,0x8c,0x90,0x94,0x98,0x9c,0xa0,0xa4,0xa8,0xac,0xbc,0xc8,0xe0,0xe8,0xec,0xf0,0xf8,0x108];cases=[]
for bits in range(256):
 cpu.mem_write(owner,bytes(0x200));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context);write(owner,vtable+0x100);write(context+4,keyboard)
 fields={**{o:5 for o in offsets},0x3c:2,0x4c:3,0x44:-2 if bits&2 else 2,0xe0:0 if bits&4 else 4,0xe8:9,0x60:1 if bits&8 else 0,0x88:10 if bits&16 else 90}
 for o,v in fields.items():write(owner+o,v&0xffffffff)
 active=2 if bits&32 else 3;duration=255 if bits&64 else 0;cpu.mem_write(context+0x11d7c,struct.pack('<b',active));cpu.mem_write(context+0x11d6a,bytes([duration]));write(command,1 if bits&1 else 2)
 for base,owners in [(0x1b778,[7,9]),(0x1b7e0,[8]),(0x1b848,[10])]:
  free=[] if bits&16 else [11,12]
  cpu.mem_write(context+base+0x20,struct.pack('<h',len(free)));cpu.mem_write(context+base+0x62,struct.pack('<h',len(owners)))
  for i,v in enumerate(free):cpu.mem_write(context+base+2*i,struct.pack('<h',v))
  for i,v in enumerate(owners):cpu.mem_write(context+base+0x42+2*i,struct.pack('<h',v));cpu.mem_write(context+base+0x22+2*i,struct.pack('<h',4 if bits&64 else 2))
 initial=list(cpu.mem_read(context+0x1b778,0x134));calls=[];mode=(bits>>7)&1;allocation=bool(bits&4)
 sp=stack+0xf000
 for i,v in enumerate([stop,0,0x41c,4,command]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4e6810,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(fields={str(k):v for k,v in fields.items()},active=active,duration=duration,team=read(command),mode=mode,allocation=allocation,initial=initial,calls=calls,body=[signed(owner+o) for o in offsets],ownership=list(cpu.mem_read(context+0x1b778,0x134))))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E6810 event41C',offsets=offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} activation cases')
