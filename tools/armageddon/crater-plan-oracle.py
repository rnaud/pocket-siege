"""Execute original crater stamping instructions in Unicorn.

Original crater stamping instructions execute; bitmap sizes are supplied and stamps are captured. No game entry point runs.
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




vtable,get_size=owner+0x5000,owner+0x6000
write(vtable+0x14,get_size);cpu.mem_write(get_size,b'\xc2\x08\x00')
for i in range(16):
 for bank in [0,1]:
  address=owner+0x2000+bank*0x1000+i*0x20
  write(owner+4+bank*0x40+i*4,address);write(address,vtable)
  write(address+4,(i*94//15+11)*2+1)
for address,n in [(0x4a9020,16),(0x4a8160,16)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',n))
output=[]
def capture(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==get_size:
  dimension=read(cpu.reg_read(UC_X86_REG_ECX)+4);write(read(sp+4),dimension);write(read(sp+8),dimension)
 elif address==0x4a9020:output.append(dict(bounds=list(struct.unpack('<4i',cpu.mem_read(sp+4,16)))))
 else:
  bitmap,x,y,operation=struct.unpack('<4I',cpu.mem_read(sp+4,16));offset=bitmap-owner-0x2000
  output.append(dict(bank=offset//0x1000,index=(offset%0x1000)//0x20,x=x if x<0x80000000 else x-0x100000000,y=y if y<0x80000000 else y-0x100000000,operation=hex(operation)))
for address in [get_size,0x4a9020,0x4a8160]:cpu.hook_add(UC_HOOK_CODE,capture,begin=address,end=address)
cases=[]
for strength in [-10,0,6,7,25,74,75,79,80,99,100,200]:
 for x,y in [(0,0),(123,-45)]:
  for locked in [0,1]:
   output=[];write(owner+0xb28,locked);write(owner+0x8d0,0);sp=stack+0xf000
   for i,value in enumerate([stop,strength,x,y]):write(sp+i*4,value&0xffffffff)
   cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4a85f0,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Crater plan failed to return')
   cases.append(dict(strength=strength,x=x,y=y,locked=locked,output=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A85F0',method='Original crater selection, bounds and stamping dispatch; generated bitmap dimensions supplied; downstream blits captured.',cases=cases),indent=2)+'\n')
print(f'Captured {len(cases)} crater plans')
