"""Execute original rope animation entry instructions in Unicorn.

Animation interface calls are recorded with their real calling convention. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP
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
# Original rope queue 004F8C50: animator object at worm+0x350.
animator,vtable,clear,queue=owner+0x800,owner+0x900,owner+0xa00,owner+0xb00
write(owner+0x350,animator);write(animator,vtable)
write(vtable+0x14,clear);write(vtable+0x1c,queue)
cpu.mem_write(clear,b'\xc3');cpu.mem_write(queue,b'\xc2\x04\x00')
calls=[]
def observe(cpu,address,size,unused):
    if address==clear: calls.append({'operation':'clear'})
    if address==queue: calls.append({'operation':'queue','sprite_id':read(cpu.reg_read(UC_X86_REG_ESP)+4)})
hook=cpu.hook_add(UC_HOOK_CODE,observe,begin=clear,end=queue)
resource=owner+0x2000
cpu.mem_write(0x4edad0,b'\xb8'+struct.pack('<I',resource)+b'\xc2\x04\x00')
write(stack+0xff00,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
cpu.emu_start(0x4f8680,stop,count=1000)
entry=list(calls)
progress,friction,transition,bodyvt=owner+0xc00,owner+0xd00,owner+0xe00,owner+0xf00
write(owner,bodyvt);write(bodyvt+0x108,0x4d12d0);write(bodyvt+0xa8,friction);write(bodyvt+0x80,transition);write(vtable+0x10,progress)
for address in [progress,friction,transition]:cpu.mem_write(address,b'\xc2\x04\x00')
output={}
def capture(cpu,address,size,unused):
 if address in [progress,friction,transition]:
  key={progress:'progress',friction:'friction',transition:'target'}[address]
  output[key]=struct.unpack('<i',cpu.mem_read(cpu.reg_read(UC_X86_REG_ESP)+4,4))[0]
cpu.hook_add(UC_HOOK_CODE,capture,begin=progress,end=transition)
cases=[]
for facing in [-1,1]:
 for angle in [i*1024 for i in range(64)]+[-1,-65536,65536,2147483647,-2147483648]:
  for a,b in [(0,0),(1,0),(1,1),(1,-1)]:
   write(owner+0x1b0,facing&0xffffffff);write(owner+0x98,angle&0xffffffff);write(owner+0x104,a);write(owner+0x108,b&0xffffffff)
   output={'target':None}
   write(stack+0xff00,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
   cpu.emu_start(0x4f8720,stop,count=1000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Rope tick did not return')
   cases.append({'facing':facing,'angle':angle,'field104':a,'field108':b,'output':output})
args.output.write_text(json.dumps({'executable_sha256':digest,'entries':['004F8680','004F8720'],'method':'Original entry and animation tick execute; resource text disabled, animation/friction/state calls observed. Original angle getter executes unchanged.','entry':entry,'cases':cases},indent=2)+'\n')
print(f'Captured rope entry and {len(cases)} native pose cases')
