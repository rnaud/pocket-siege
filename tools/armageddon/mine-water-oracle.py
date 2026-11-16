"""Execute original004EA584..004EA683 mine water lifecycle."""
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

from unicorn.x86_const import UC_X86_REG_EDI
context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context);write(owner,0x527300)
def signed(v):return v if v<0x80000000 else v-0x100000000
calls=[];draws=0
random=[0,0x10000,0x20000,0x30000]
def hook(cpu,address,size,user):
 global draws
 if address not in [0x4ee930,0x4edfa0,0x4edc90]:return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4ee930:
  cpu.reg_write(UC_X86_REG_EAX,random[draws%len(random)]);draws+=1;n=0
 else:
  n=20;calls.append(dict(operation='bubble' if address==0x4edfa0 else 'sound',request=[signed(read(sp+4+i*4)) for i in range(5)]))
 cpu.reg_write(UC_X86_REG_ESP,sp+n+4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
fields={'bubbleProgress':0x140,'waterFlagsSet':0x10c,'splashActive':0x130,'forceBlast':0x108,'flags':0x40}
cases=[]
for submerged in [0,1]:
 for fieldB0 in [0,1]:
  for vy in [-65536,0,65536,65537]:
   for progress in [0,49151,49152,196608]:
    for waterFlagsSet in [0,1]:
     for splashActive in [0,1]:
      before=dict(bubbleProgress=progress,waterFlagsSet=waterFlagsSet,splashActive=splashActive,forceBlast=1,flags=0x421846)
      for k,off in fields.items():write(owner+off,before[k])
      for off,v in [(0xbc,submerged),(0xb0,fieldB0),(0x9c,0),(0xa0,vy),(0xc0,0),(0xc4,0)]:write(owner+off,v&0xffffffff)
      calls=[];draws=0;sp=stack+0xfe00
      write(sp+0x18,200*65536);write(sp+0x1c,100*65536);write(sp+0x24,vy&0xffffffff)
      cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EDI,0x527300)
      cpu.emu_start(0x4ea584,0x4ea683,count=10000)
      if cpu.reg_read(UC_X86_REG_EIP)!=0x4ea683:raise RuntimeError('Water lifecycle did not finish')
      cases.append(dict(before=before,environment=dict(submerged=submerged,fieldB0=fieldB0,vy=vy,x=100*65536,y=200*65536,awake=bool(vy or submerged)),after={k:signed(read(owner+off)) for k,off in fields.items()},calls=calls,draws=draws))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004EA584..004EA683 with real water/awake getters and flag setter. Random values supplied at visual RNG boundary; bubble and sound requests captured.',random=random,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mine water cases')
