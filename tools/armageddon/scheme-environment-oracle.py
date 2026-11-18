"""Execute native scheme environment and match-settings expansion."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


cases=[]
inputs=[]
for mode in [0,1,2,3,4,5,127,255]:
 for mine in [0,1,2,3,127,255]:
  for pattern in range(6):
   scheme=[(i*17+pattern*31)&255 for i in range(216)];scheme[0x11]=mode;scheme[0xa]=mine
   scheme[0x12]=[0,3,4,5,128,255][pattern];scheme[0x17]=[0,1,127,128,254,255][pattern]
   scheme[0x16]=[0,1,127,128,254,255][pattern]
   scheme[0xc],scheme[0xe],scheme[0x10]=[[0,0,0],[1,2,3],[127,0,127],[255,128,0],[1,255,127],[255,1,0]][pattern]
   scheme[4]=pattern%2;inputs.append((scheme,pattern))
for row in json.loads(Path('src/armageddon/scheme-data.json').read_text())['schemes']:inputs.append((row['bytes'],0))
for scheme,pattern in inputs:
 cpu.mem_write(owner,bytes((i*7+3)&255 for i in range(0x10000)));cpu.mem_write(0x6f4560,bytes(scheme))
 handicap=[0,1,-1,0x7fffffff,-2147483648,255][pattern];write(0x6daf90+0xc8,handicap);write(0x6daf90+0xc0,-handicap)
 cpu.reg_write(UC_X86_REG_ESP,stack+0xf000);cpu.reg_write(UC_X86_REG_EBP,owner);cpu.reg_write(UC_X86_REG_EBX,1);cpu.reg_write(UC_X86_REG_ESI,0)
 cpu.emu_start(0x417278,0x4175ea,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==0x4175ea
 cases.append(dict(scheme=scheme,handicap=handicap,sha256=hashlib.sha256(cpu.mem_read(owner,0x10000)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='00417278..004175EA',method='Original settings block and handicap getters execute unchanged. Live-in EBP=setup, EBX=1, ESI=0 match the enclosing builder. Every setup byte compared including preserved fields; preceding CRT reseed and weapon expansion excluded.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} settings expansions')
