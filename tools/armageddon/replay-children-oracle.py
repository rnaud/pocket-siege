"""Execute every concrete child-task replay writer and original physics reference lookup."""
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

import itertools
schemas=json.loads(Path('src/armageddon/replay-task-types.json').read_text())
context=owner+0x20000;env=owner+0x30000
cpu.mem_map(context,0x10000);cpu.mem_map(env,0x10000)
stream=owner+0x4000;buffer=owner+0x5000;points=owner+0xa000;animation=owner+0xb000
write(context+0x7d4,env);write(env,env+0x1000);write(env+0x1044,0x4c9300)
write(stream+4,buffer);write(stream+8,0x4000)
write(animation,animation+0x200);write(animation+0x204,0x4fd370)
def hook(cpu,address,size,user):
 if address==stop:cpu.emu_stop()
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for schema in schemas:
 for position,membership,count in itertools.product([0,1,3],[0,1,2],([0,2] if schema['physics'] else [0])):
  tag=schema['tag'];memory=bytes((i*13+tag*7+position)&255 for i in range(schema['size']))
  cpu.mem_write(owner,memory);write(owner+0x14,0);write(owner+0x2c,tag);write(owner+0x28,0x115);write(owner+0x24,0x129);write(owner+0x38,context)
  if schema['physics']:
   write(owner+0x3c,2);write(owner+0xc8,1 if count else 0);write(owner+0xdc,count);write(owner+0xf8,points);write(owner+0xe4,-29);write(owner+0xe8,88)
  payload=bytes((i*17+tag)&255 for i in range(count*8));cpu.mem_write(points,payload)
  if schema['nestedAnimation']:write(owner+0x350,animation)
  animationBytes=bytes((i*19+tag)&255 for i in range(0x15c));cpu.mem_write(animation+8,animationBytes)
  allList=[0,owner,owner] if membership==1 else ([owner+0xf000,0,owner] if membership==2 else [0,owner+0xf000])
  categoryList=[owner+0xf000,0,owner] if membership==1 else [0,owner+0xf000]
  write(env+0x24,len(allList));write(env+0x28,env+0x2000)
  group=env+0x34+2*0x1c;write(group+0xc,len(categoryList));write(group+0x10,env+0x2100)
  for i,value in enumerate(allList):write(env+0x2000+4*i,value)
  for i,value in enumerate(categoryList):write(env+0x2100+4*i,value)
  cpu.mem_write(buffer,bytes([0xa5])*0x4000);write(stream+0x10,position);write(stream+0xc,position)
  sp=stack+0xf000;write(sp,stop);write(sp+4,stream);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(int(schema['writer'],16),stop+1,count=100000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('child serializer did not exit')
  end=read(stream+0x10)
  cases.append(dict(tag=tag,position=position,membership=membership,count=count,result=cpu.reg_read(UC_X86_REG_EAX),length=read(stream+0xc),bytes=list(cpu.mem_read(buffer,end)),references=[signed(read(owner+0xe4)),signed(read(owner+0xe8))] if schema['physics'] else None))
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'All21 concrete serializers from004B2230, original inheritance writers,004C9300 physics reference lookup,004FD370 animation serializer and stream writes. No algorithm hooks; null child lists (tree traversal verified separately).','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} complete original child records')
