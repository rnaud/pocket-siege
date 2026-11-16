"""Execute original hurt-state entry blocks in Unicorn.

Animation interfaces are captured; the original body angle setter executes.
Common transition prefix/finalizer are outside these blocks. No game entry runs.
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




animator=owner+0x1000;vtable=owner+0x2000;clear=owner+0x3000;queue=owner+0x3100
write(owner,0x526de0);write(owner+0x350,animator);write(animator,vtable)
write(vtable+0x14,clear);write(vtable+0x1c,queue)
cpu.mem_write(clear,b'\xc3');cpu.mem_write(queue,b'\xc2\x04\x00')
calls=[]
def observe(cpu,address,size,user):
 if address==0x4d8189:cpu.emu_stop()
 elif address==clear:calls.append(dict(operation='clear'))
 elif address==queue:calls.append(dict(operation='queue',sprite_id=read(cpu.reg_read(UC_X86_REG_ESP)+4),progress=0))
cpu.hook_add(UC_HOOK_CODE,observe)
cases=[]
for state,entry in [(0x7f,0x4d7f77),(0x80,0x4d7f97),(0x81,0x4d7fbe)]:
 for angle in [0,1,65535,65536,0xffffffff]:
  write(owner+0x98,angle);calls=[]
  cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_EBP,0x526de0);cpu.reg_write(UC_X86_REG_ESP,stack+0xf000)
  cpu.emu_start(entry,stop,count=1000)
  if cpu.reg_read(UC_X86_REG_EIP)!=0x4d8189:raise RuntimeError('Entry did not reach common finalizer')
  cases.append(dict(state=state,angle=angle,result=dict(angle=read(owner+0x98),calls=calls)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original hurt-specific entry blocks; animation clear/queue captured, original angle setter executes. Common transition prefix/finalizer verified separately.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} hurt entries')
