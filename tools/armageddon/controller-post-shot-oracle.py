"""Execute post-shot cleanup and pending weapon selection against the original executable."""
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

context=0x2300000;cpu.mem_map(context,0x20000);command=owner+0x1000;descriptor=owner+0x2000
interfaces=[(0x4c2cc0,2),(0x4edad0,1),(0x4e55d0,1),(0x4c2ee0,2),(0x4c3010,2),(0x4c32b0,2),(0x4b26a0,6)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4b26a0:
  p=read(sp+24);calls.append(['select']+[signed(p+i*4) for i in range(4)]+[read(sp+20)])
 else:
  name,n,result={0x4c2cc0:('health',2,health),0x4edad0:('descriptor',1,descriptor),0x4e55d0:('default',1,17),0x4c2ee0:('available',2,available),0x4c3010:('consume',2,0),0x4c32b0:('busy',2,busy)}[address]
  calls.append([name]+[signed(sp+4+i*4) for i in range(n)]);cpu.reg_write(UC_X86_REG_EAX,result&0xffffffff)
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
offsets=[0x50,0x64,0x68,0x8c,0x90,0x94,0x98,0x9c,0xa0,0xa4,0xa8,0xac,0xbc,0xc8,0xe8];cases=[]
for mode in ['post','pending','composed']:
 for bits in range(256):
  cpu.mem_write(owner,bytes(0x3000));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
  fields={**{o:9 for o in offsets},0x3c:2,0x4c:3,0x40:0 if bits&128 else 1,0x5c:1 if bits&64 else 0,0x50:(bits>>1)&1,0x64:12,0x68:17 if bits&2 else 0,0xe8:7}
  for o,v in fields.items():write(owner+o,v)
  owners=[3,7,9] if bits&32 else [9];free=[11]
  for start,co,values in [(0x1b778,0x1b798,free),(0x1b7ba,0x1b7da,owners)]:
   cpu.mem_write(context+co,struct.pack('<h',len(values)))
   for i,v in enumerate(values):cpu.mem_write(context+start+2*i,struct.pack('<h',v))
  for i in range(len(owners)):cpu.mem_write(context+0x1b79a+2*i,struct.pack('<h',4-i))
  team=1 if bits&1 else 2;write(command,team);health=0 if bits&4 else 100;available=(bits>>3)&1;busy=(bits>>5)&1;selectable=(bits>>4)&1;write(descriptor+0x4c,selectable)
  initial=list(cpu.mem_read(context+0x1b778,0x64));calls=[]
  for routine in ([0x4e6810,0x4e6740] if mode=='composed' else [0x4e6810 if mode=='post' else 0x4e6740]):
   sp=stack+0xf000
   for i,v in enumerate([stop,0,0x432,4,command]):write(sp+i*4,v)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(routine,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(mode=mode,fields={str(k):v for k,v in fields.items()},team=team,health=health,available=available,busy=busy,selectable=selectable,initial=initial,calls=calls,body=[signed(owner+o) for o in offsets],ownership=list(cpu.mem_read(context+0x1b778,0x64))))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E6810 event432 and004E6740',offsets=offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} post-shot and pending selection cases')
