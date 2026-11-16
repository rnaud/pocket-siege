"""Execute original004EA683 mine state-triggered detonation branch."""
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
delete=read(0x527300)
def signed(v):return v if v<0x80000000 else v-0x100000000
calls=[]
def hook(cpu,address,size,user):
 if address in [0x4ea822,0x4ea6d0]:cpu.emu_stop();return
 if address not in [0x4ef070,delete]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);n=6 if address==0x4ef070 else 1
 calls.append(dict(operation='blast' if n==6 else 'delete',request=[signed(read(sp+4+i*4)) for i in range(n)]))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+n*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for state in [0,1,2,-1]:
 for x,y in [(0,0),(123456,-789012),(2147483647,2147483647)]:
  for damage in [0,30,50,100]:
   calls=[]
   for off,val in [(0x50,state),(0x90,x),(0x94,y),(0x124,damage)]:write(owner+off,val&0xffffffff)
   cpu.reg_write(UC_X86_REG_ESP,stack+0xfe00);cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EDI,0x527300)
   cpu.emu_start(0x4ea683,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP) not in [0x4ea822,0x4ea6d0]:raise RuntimeError('State branch did not finish')
   cases.append(dict(body=dict(state=state,x=x,y=y),damage=damage,calls=calls))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004EA683..004EA6D0 uses real body state/position getters; blast and destructor requests captured, stopping at original epilogues.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mine state detonation cases')
