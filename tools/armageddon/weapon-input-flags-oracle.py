"""Execute full004AAC50 weapon input-mode decoder without substituted routines."""
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

import random
rng=random.Random(0x4aac50)
outputs=owner+0x1000;fields=[0x68,0x6c,0x70,0x78,0x7c,0x84,0x8c,0xc4,0xd8,0xdc,0xe4,0xec,0xf0,0xf8,0x128,0x13c,0x188,0x19c,0x1a0,0x1a8,0x1b0,0x1b4,0x1bc]
cases=[]
for kind in [0,1,2,3,4,5,-1]:
 for variant in range(256):
  values={o:rng.choice([0,0,1,2,3,-1,10,17]) for o in fields};values[0x68]=kind
  # Alternate both primary firing modes, with secondary behavior varied independently.
  if variant%2==0:values[0x70]=3 if kind==1 else 2;values[0x84]=2
  if variant%3==0:values[0x128]=1;values[0x13c]=1
  cpu.mem_write(owner,bytes(0x200));cpu.mem_write(outputs,bytes([0xa5])*32)
  for o,v in values.items():write(owner+o,v&0xffffffff)
  sp=stack+0xf000
  for i,v in enumerate([stop,owner,*[outputs+j*4 for j in range(8)]]):write(sp+i*4,v)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4aac50,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(fields={str(k):v for k,v in values.items()},output=[read(outputs+j*4) for j in range(8)]))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004AAC50',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} weapon-mode cases')
