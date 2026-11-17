"""Execute native local-control events including worm cycling, arsenal close and action counters."""
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
interfaces=[(0x4b26f0,4),(0x4b26a0,6),(0x4e5a50,1),(0x4c2b10,1),(0x4c2cc0,2),(0x4edc90,5)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4b26f0:calls.append(['forward',read(sp+8),list(cpu.mem_read(read(sp+16),read(sp+12)))])
 elif address==0x4b26a0:calls.append(['send',read(sp+8),signed(sp+12),read(sp+16)])
 else:
  name,n,result={0x4e5a50:('select',1,0),0x4c2b10:('count',1,count),0x4c2cc0:('health',2,100 if read(sp+8)==living else 0),0x4edc90:('sound',5,0)}[address]
  calls.append([name]+[signed(sp+4+i*4) for i in range(n)]);cpu.reg_write(UC_X86_REG_EAX,result)
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
offsets=[0x5c,0x6c,0x70,0x74,0x78,0x7c,0x84,0xd8,0xe4,0xf4,0xf8];cases=[]
for event in [0x424,0x425,0x427,0x42b,0x42d,0x42e,0x42f,0x434,0x435,0x436,0x437,0x438,0x43a,0x43b]:
 for bits in range(64):
  cpu.mem_write(owner,bytes(0x200));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
  value=[0,1,-1,2147483647][(bits>>1)%4]
  fields={**{o:value for o in offsets},0x3c:2,0x4c:3 if bits&8 else 1,0xf4:7,0xe4:(bits>>4)&1}
  for o,v in fields.items():write(owner+o,v&0xffffffff)
  owners=[3,7,9] if bits&32 else [9];free=[11]
  for start,co,values in [(0x1b778,0x1b798,free),(0x1b7ba,0x1b7da,owners)]:
   cpu.mem_write(context+co,struct.pack('<h',len(values)))
   for i,v in enumerate(values):cpu.mem_write(context+start+2*i,struct.pack('<h',v))
  for i in range(len(owners)):cpu.mem_write(context+0x1b79a+2*i,struct.pack('<h',4-i))
  write(command,1 if bits&1 else 2);write(command+4,4);length=8 if event==0x427 else 4
  initial=list(cpu.mem_read(context+0x1b778,0x64));calls=[];count=3 if bits&16 else 0;living=2 if bits&32 else 0
  sp=stack+0xf000
  for i,v in enumerate([stop,0,event,length,command]):write(sp+i*4,v)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4e6810,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(event=event,fields={str(k):v for k,v in fields.items()},payload=list(cpu.mem_read(command,length)),count=count,living=living,initial=initial,calls=calls,body=[signed(owner+o) for o in offsets],ownership=list(cpu.mem_read(context+0x1b778,0x64))))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E6810 local control branches',offsets=offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} local control cases')
