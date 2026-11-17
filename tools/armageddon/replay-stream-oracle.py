"""Execute original replay snapshot stream primitives and checksum."""
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

import random
buffer=owner+0x1000;scratch=owner+0x5000
write(owner+4,buffer);write(owner+8,2048)
def hook(cpu,address,size,user):
 if address==stop:cpu.emu_stop()
cpu.hook_add(UC_HOOK_CODE,hook)
def invoke(address,values=[]):
 sp=stack+0xf000
 for i,value in enumerate([stop]+values):write(sp+i*4,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(address,stop+1,count=100000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('stream did not return')
 return cpu.reg_read(UC_X86_REG_EAX)
def execute(op):
 result=None;kind=op['kind']
 if kind=='reset':invoke(0x4c7370)
 elif kind=='seek':invoke(0x4c74d0,[op['position']])
 elif kind=='readByte':result=invoke(0x4c7400)&255
 elif kind=='writeByte':invoke(0x4c7460,[op['value']])
 elif kind=='readBlock':
  invoke(0x4c7420,[scratch,op['size']]);result=list(cpu.mem_read(scratch,op['size']))
 elif kind=='writeBlock':
  cpu.mem_write(scratch,bytes(op['bytes']));invoke(0x4c7480,[scratch,len(op['bytes'])])
 elif kind=='checksum':result=invoke(0x4c74f0)
 return {'operation':op,'result':result,'state':dict(position=read(owner+0x10),length=read(owner+0xc),checksum=invoke(0x4c74f0),bytes=list(cpu.mem_read(buffer,256)))}
cases=[]
for seed in range(8):
 initial=[(i*13+seed*31)&255 for i in range(2048)];cpu.mem_write(buffer,bytes(initial));invoke(0x4c7370)
 steps=[];rng=random.Random(seed)
 for i in range(80):
  if read(owner+0x10)>190:steps.append(execute({'kind':'seek','position':rng.randrange(16)}))
  kind=rng.choice(['reset','seek','readByte','writeByte','readBlock','writeBlock','checksum'])
  op={'kind':kind}
  if kind=='seek':op['position']=rng.randrange(0,65)
  elif kind=='writeByte':op['value']=rng.choice([-1,0,1,127,255,256,511])
  elif kind=='readBlock':op['size']=rng.randrange(0,16)
  elif kind=='writeBlock':op['bytes']=[rng.randrange(256) for _ in range(rng.randrange(0,16))]
  steps.append(execute(op))
 cases.append({'initial':initial[:256],'steps':steps})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Original004C7370/7400/7420/7460/7480/74D0/74F0 and full004AAA80 checksum, no algorithm hooks. Backing storage explicitly allocated; compare all bytes including padding and stale bytes after reset.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {sum(len(case["steps"]) for case in cases)} original stream operations')
