"""Execute shot notifications and remaining-shot announcements against the original executable."""
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

context=0x2300000;cpu.mem_map(context,0x20000);command=owner+0x1000
language=owner+0x2000;vtable=owner+0x2100;message=owner+0x2200
interfaces=[(0x4c3010,2),(0x4eefb0,2),(0x4b26f0,4),(stop+0x100,0),(stop+0x200,0),(stop+0x300,0),(stop+0x400,0)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
write(0x5178f4,stop+0x400)
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def string(a):return bytes(cpu.mem_read(a,64)).split(b'\0')[0].decode()
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4c3010:calls.append(['consume',signed(sp+4),signed(sp+8)])
 elif address==0x4eefb0:calls.append(['announce',signed(sp+4),string(read(sp+8))])
 elif address==0x4b26f0:calls.append(['forward',read(sp+8),list(cpu.mem_read(read(sp+16),read(sp+12)))])
 elif address==stop+0x400:
  text=string(read(sp+8))
  if '%d' in text:text=text.replace('%d',str(signed(sp+12)))
  cpu.mem_write(read(sp+4),text.encode()+b'\0')
 else:
  slot={stop+0x100:0x60,stop+0x200:0x64,stop+0x300:0x68}[address]
  calls.append(['text',slot]+([signed(sp+4)] if slot==0x68 else []))
  cpu.mem_write(message,({0x60:'finished',0x64:'one left',0x68:'%d left'}[slot]).encode()+b'\0');cpu.reg_write(UC_X86_REG_EAX,message)
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
offsets=[0x50,0xac,0xbc,0xe8];cases=[]
for total,fired in [(1,0),(1,1),(2,0),(2,1),(2,2),(2,3),(5,1),(2147483647,-1)]:
 for bits in range(32):
  cpu.mem_write(owner,bytes(0x3000));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
  fields={0x3c:2,0x50:0,0x54:2147483647 if bits&16 else 3,0x64:12,0xac:1,0xbc:1,0xe8:7}
  for o,v in fields.items():write(owner+o,v)
  owners=[3,7,9] if bits&8 else [9];free=[11]
  for start,co,values in [(0x1b778,0x1b798,free),(0x1b7ba,0x1b7da,owners)]:
   cpu.mem_write(context+co,struct.pack('<h',len(values)))
   for i,v in enumerate(values):cpu.mem_write(context+start+2*i,struct.pack('<h',v))
  for i in range(len(owners)):cpu.mem_write(context+0x1b79a+2*i,struct.pack('<h',4-i))
  words=[1 if bits&1 else 2,3,fired,total,2 if bits&2 else 1,0,1 if bits&4 else 0]
  for i,v in enumerate(words):write(command+4*i,v&0xffffffff)
  write(context+0x1c,language);write(language,vtable)
  for o,a in [(0x60,stop+0x100),(0x64,stop+0x200),(0x68,stop+0x300)]:write(vtable+o,a)
  initial=list(cpu.mem_read(context+0x1b778,0x64));calls=[];sp=stack+0xf000
  for i,v in enumerate([stop,0,0x431,28,command]):write(sp+i*4,v)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4e6810,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(fields={str(k):v for k,v in fields.items()},payload=list(cpu.mem_read(command,28)),initial=initial,calls=calls,body=[signed(owner+o) for o in offsets],ownership=list(cpu.mem_read(context+0x1b778,0x64))))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E6810 event431',offsets=offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} shot notification cases')
