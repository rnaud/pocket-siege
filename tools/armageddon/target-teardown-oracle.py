"""Execute original004E6380 targeting teardown without substituted interfaces."""
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

context=0x2300000;cpu.mem_map(context,0x20000)
cases=[]
for handle in [-1,0,7,9,32767,65543]:
 for owners in [[],[7],[7,9],[9,7],[3,7,9],[7,7,9]]:
  for free in [[],[11,12]]:
   for flags in [[0,0],[1,5]]:
    cpu.mem_write(owner,bytes(0x200));write(owner+0x38,context);cpu.mem_write(context,bytes([0xa5])*0x20000)
    for offset,value in zip([0xac,0xbc,0xe8],[*flags,handle]):write(owner+offset,value&0xffffffff)
    priorities=[5-i for i in range(len(owners))]
    for start,count,values in [(0x1b778,0x1b798,free),(0x1b7ba,0x1b7da,owners)]:
     cpu.mem_write(context+count,struct.pack('<h',len(values)))
     for i,value in enumerate(values):cpu.mem_write(context+start+2*i,struct.pack('<h',value))
    for i,value in enumerate(priorities):cpu.mem_write(context+0x1b79a+2*i,struct.pack('<h',value))
    initial=list(cpu.mem_read(context+0x1b778,0x64))
    sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4e6380,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(handle=handle,flags=flags,initial=initial,output=list(cpu.mem_read(context+0x1b778,0x64)),body=[struct.unpack('<i',cpu.mem_read(owner+o,4))[0] for o in [0xac,0xbc,0xe8]]))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E6380',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} teardown cases')
