"""Execute original shared busy counter operations."""
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

context=owner+0x20000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
write(owner+0x2a0,context)
def hook(cpu,address,size,user):
 if address==0x4a1a85:cpu.emu_stop()
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for before in [-2147483648,-1,0,1,2,12,50,2147483647]:
 for operation,seconds,entry in [('tick',None,0x4a1a6c),('wake',None,0x4eebe0)]+[('delay',seconds,0x4eebf0) for seconds in [-2147483648,-1,0,1,2,42949673,2147483647]]:
  write(context+0x800,before);sp=stack+0xf000;write(sp,stop);write(sp+4,seconds or 0)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESI,owner)
  cpu.emu_start(entry,stop,count=100)
  if cpu.reg_read(UC_X86_REG_EIP) not in [stop,0x4a1a85]:raise RuntimeError('Operation did not finish')
  after=signed(read(context+0x800))
  write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x4eec10,stop,count=100)
  cases.append({'before':before,'operation':operation,'seconds':seconds,'after':after,'read':signed(cpu.reg_read(UC_X86_REG_EAX))})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004A1A6C..004A1A85,004EEBE0,004EEBF0,004EEC10','method':'Original decrement block, fixed12 wake, signed seconds*50 delay setter and shared getter execute unchanged without substitutions.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} shared busy-counter operations')
