"""Execute original charge-blob renderer instructions in Unicorn.

Draw submissions are captured; original fixed multiplication executes. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP
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

cpu.mem_write(0x4eedf0,b'\xc2\x18\x00')
requests=[]
def capture(cpu,address,size,user):
 if address==0x4eedf0:
  esp=cpu.reg_read(UC_X86_REG_ESP)
  layer,x,y,z,sprite,progress=struct.unpack('<6i',cpu.mem_read(esp+4,24))
  requests.append(dict(layer=layer,x=x,y=y,sprite=sprite,progress=progress))
cpu.hook_add(UC_HOOK_CODE,capture)
cases=[]
for power in [0,1,4095,4096,4097,16384,32768,49152,65535,65536,-1]:
 for dx,dy in [(80*65536,0),(0,-80*65536),(-3700000,3700000)]:
  requests.clear()
  write(owner+0x25c,power&0xffffffff)
  esp=stack+0xf000
  for offset,value in [(0x14,200*65536),(0x18,100*65536),(0x40,dx),(0x10,dy)]:write(esp+offset,value&0xffffffff)
  cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_ESP,esp)
  cpu.emu_start(0x4fbaa3,0x4fbb6e,count=10000)
  if cpu.reg_read(UC_X86_REG_EIP)!=0x4fbb6e:raise RuntimeError('Charge block did not finish')
  cases.append(dict(power=power,x=100*65536,y=200*65536,dx=dx,dy=dy,requests=list(requests)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,block='004FBAA3–004FBB6E',method='Original charge renderer and fixed multiplication execute unchanged; draw submission captured.',cases=cases),indent=2)+'\n')
print(f'Captured {len(cases)} charge display cases')
