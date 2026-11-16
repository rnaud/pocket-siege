"""Execute original crater rim bitmap instructions in Unicorn.

Original crater rim bitmap instructions execute; mask and terrain bitmap inputs are supplied. No game entry point runs.
"""
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



mask,color,solid=owner+0x2000,owner+0x3000,owner+0x4000
cases=[]
for bits in [0,1,0x80000000,0xaaaaaaaa,0xffffffff]:
 for terrain in [0,0x55555555,0xffffffff]:
  for palette in [0,19,255]:
   write(mask,bits);write(solid,terrain);cpu.mem_write(color,bytes(range(32)))
   sp=stack+0xf000
   for i,value in enumerate([stop,mask,color,solid,0,0,0,palette,1]):write(sp+i*4,value)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4ac59e,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Rim blit failed to return')
   cases.append(dict(mask=bits,terrain=terrain,palette=palette,before=list(range(32)),after=list(cpu.mem_read(color,32))))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004AC59E',method='Original indexed rim bitmap operation, one 32-pixel word; supplied mask/solidity/colour.',cases=cases),indent=2)+'\n')
print(f'Captured {len(cases)} rim bitmap cases')
