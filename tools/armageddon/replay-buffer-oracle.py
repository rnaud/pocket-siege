"""Execute native circular replay buffers and event serialization."""
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
buffers=[owner+0x1000,owner+0x5000]
objects=[owner,owner+0x100]
wrappers=[owner+0x200,owner+0x300]
scratch=owner+0xa000

def hook(cpu,address,size,user):
 if address==stop:cpu.emu_stop()
cpu.hook_add(UC_HOOK_CODE,hook)
def invoke(address,obj,values=[]):
 sp=stack+0xf000
 for i,value in enumerate([stop]+values):write(sp+i*4,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,obj)
 cpu.emu_start(address,stop+1,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('buffer did not return')
 return read_register()
def read_register():return cpu.reg_read(UC_X86_REG_EAX)
def init(capacity):
 for obj,buf,wrapper in zip(objects,buffers,wrappers):
  cpu.mem_write(buf,bytes(0x3000));write(obj+4,buf);write(obj+8,capacity)
  write(wrapper+4,obj);invoke(0x4af390,obj)
def snapshot(index):
 obj=objects[index];buf=buffers[index];head=read(obj+0x18);records=[]
 while head:
  records.append({'offset':head-buf,'payload':list(cpu.mem_read(head+8,read(head)))})
  head=read(head+4)
  if len(records)>1000:raise RuntimeError('cyclic native queue')
 return dict(writeOffset=read(obj+0xc),readOffset=read(obj+0x10),head=read(obj+0x18)-buf if read(obj+0x18) else None,tail=read(obj+0x14)-buf if read(obj+0x14) else None,count=read(obj+0x1c),percent=invoke(0x4af3c0,obj),records=records)
def execute(op):
 index=op.get('queue',0);obj=objects[index];buf=buffers[index];kind=op['kind']
 if kind=='push':
  payload=bytes(op['payload']);pointer=invoke(0x4af470,obj,[len(payload)])
  if pointer:cpu.mem_write(pointer,payload)
  result=pointer-buf if pointer else None
 elif kind=='pop':result=invoke(0x4af410,obj)
 elif kind=='clear':invoke(0x4af390,obj);result=None
 elif kind=='contains':result=invoke(0x4af440,obj,[buf+op['offset']])
 elif kind=='peek':
  pointer=invoke(0x4af3f0,obj,[scratch]);result={'offset':pointer-buf,'payload':list(cpu.mem_read(pointer,read(scratch)))} if pointer else None
 elif kind=='copy':result=invoke(0x4af4f0,obj,[objects[1-index]])
 elif kind=='writeEvent':
  payload=bytes(op['payload']);cpu.mem_write(scratch,payload)
  result=invoke(0x49c7f0,wrappers[index],[op['event'],len(payload),scratch])
 elif kind=='readEvent':
  result=invoke(0x49c780,wrappers[index],[0x124,scratch,scratch+4,scratch+8])
  result={'event':read(scratch),'payload':list(cpu.mem_read(scratch+8,read(scratch+4)))} if result else None
 return {'operation':op,'result':result,'buffers':[snapshot(0),snapshot(1)]}
cases=[]
for capacity in [16,32,64,128,512,1024]:
 init(capacity);rng=random.Random(capacity);steps=[]
 for i in range(100):
  queue=rng.randrange(2);kind=rng.choice(['push','push','pop','peek','contains','copy','clear'])
  op={'kind':kind,'queue':queue}
  if kind=='push':op['payload']=[(i+j)&255 for j in range(rng.choice([0,1,3,4,5,8,12,capacity-12,capacity-8,capacity]))]
  if kind=='contains':op['offset']=rng.choice([8,12,24,capacity-4])
  steps.append(execute(op))
 cases.append({'capacity':capacity,'steps':steps})
# Force wraparound, strict boundary rejection, address reuse and partial copy.
init(128);steps=[]
for i in range(6):steps.append(execute({'kind':'push','payload':[i]*8}))
for i in range(3):steps.append(execute({'kind':'pop'}))
for length in [12,8,8,8]:steps.append(execute({'kind':'push','payload':[length]*length}))
for offset in [8,24,40,56,104]:steps.append(execute({'kind':'contains','offset':offset}))
steps.append(execute({'kind':'push','queue':1,'payload':[99]*64}))
steps.append(execute({'kind':'copy','queue':1}))
for i in range(8):steps.append(execute({'kind':'pop'}))
steps.append(execute({'kind':'peek'}))
steps.append(execute({'kind':'copy','queue':0}))
cases.append({'capacity':128,'steps':steps})
for capacity in [32,128,512,1024]:
 init(capacity);steps=[]
 for length in [0,1,3,4,5,291,292,293,300]:
  steps.append(execute({'kind':'clear'}))
  steps.append(execute({'kind':'writeEvent','event':0x3ea+length,'payload':[(j*13)&255 for j in range(length)]}))
  steps.append(execute({'kind':'readEvent'}))
  steps.append(execute({'kind':'readEvent'}))
 cases.append({'capacity':capacity,'steps':steps})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Original004AF390/3C0/3F0/410/440/470/4F0 and full0049C780/7F0, with no algorithm hooks. Explicit allocated backing storage; pointers normalized to byte offsets.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {sum(len(case["steps"]) for case in cases)} original buffer operations')
