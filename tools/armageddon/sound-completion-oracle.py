"""Execute full 00496C20 sound-handle completion query; only DirectSound GetStatus is substituted."""
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

vtable,query=owner+0x2000,stop+0x100
write(vtable+0x24,query);cpu.mem_write(query,b'\xc2\x08\x00')
calls=[];status_result=0;status_flags=0
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);index=(read(sp+4)-owner-0x4000)//0x100
 calls.append(index);write(read(sp+8),status_flags);cpu.reg_write(UC_X86_REG_EAX,status_result & 0xffffffff)
cpu.hook_add(UC_HOOK_CODE,hook,begin=query,end=query)
cases=[]
for handle in [-2147483648,-2,-1,0,1,2,16,31,32,33,2147483647]:
 for channel in [-2,-1,0,3,7]:
  for status_result in [0,1,-1]:
   for status_flags in [0,1,2,3,0x80000000,0xffffffff]:
    for i in range(32):write(owner+0x8a8+i*4,channel & 0xffffffff)
    for i in range(8):
     buffer=owner+0x4000+i*0x100;write(buffer,vtable);write(owner+0x28+i*24,buffer)
    calls=[];sp=stack+0xf000;write(sp,stop);write(sp+4,handle & 0xffffffff)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x496c20,stop,count=200);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(handle=handle,channel=channel,statusResult=status_result,statusFlags=status_flags,result=cpu.reg_read(UC_X86_REG_EAX),calls=calls))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='00496C20',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} sound completion cases')
