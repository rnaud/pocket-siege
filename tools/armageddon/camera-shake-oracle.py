"""Execute original camera shake offsets and amplitude decay."""
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

def signed(v):return v if v<0x80000000 else v-0x100000000
context=0x2300000
cpu.mem_map(context,0x20000);write(owner+0x2a0,context)
cases=[]
for frame in list(range(64))+[4680,4681,4682,9362,9363,-1,0x7fffffff]:
 for amplitudes in [(0,0),(0x80000,0),(0,0x80000),(0x200000,0x100000),(128,1966),(-123456,98765)]:
  for camera in [(0,0,0),(12345678,-9876543,0x12345)]:
   sp=stack+0xf000
   for offset,value in [(0x1c,camera[0]),(0x18,camera[1]),(0x24,camera[2])]:write(sp+offset,value&0xffffffff)
   for offset,value in [(0x1b8ec,frame),(0x1b8c4,amplitudes[0]),(0x1b8c8,amplitudes[1])]:write(context+offset,value&0xffffffff)
   cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
   cpu.emu_start(0x4a2da9,0x4a2e2f,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=0x4a2e2f:raise RuntimeError('Shake block did not finish')
   after=[signed(read(sp+o)) for o in [0x1c,0x18,0x24]]
   cases.append({'frame':frame,'amplitudes':amplitudes,'camera':camera,'after':after})
decay=[]
for value in [0,1,128,1965,1966,1967,0x80000,0x200000,-1,-128,-1966,-1967,-0x80000,0x7fffffff,-0x80000000]:
 initial=value;steps=[]
 for i in range(80):
  sp=stack+0xf000
  for j,v in enumerate([stop,owner,0,0x7ae]):write(sp+j*4,v)
  write(owner,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp)
  cpu.emu_start(0x4eda70,stop,count=1000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Decay did not return')
  value=signed(read(owner));steps.append(value)
  if value==0:break
 decay.append({'initial':initial,'steps':steps})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004A2DA9..004A2E2F/004EDA70',
 'method':'Camera offset block executes unchanged with real trig interpolation and fixed multiply; stops before camera setter/world limits. Complete scalar easing routine executes with target0/minimum0x7AE as in004EB110. No hooks.',
 'cases':cases,'decay':decay},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} camera offsets and {sum(len(row["steps"]) for row in decay)} decay steps')
