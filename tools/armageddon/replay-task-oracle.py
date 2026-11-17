"""Execute original task header, match-controller and environment serialization."""
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
stream=owner+0x1000;buffer=owner+0x2000;children=owner+0x4000
write(stream+4,buffer);write(stream+8,2048)
current={};calls=[]
def hook(cpu,address,size,user):
 if address==stop:cpu.emu_stop();return
 if address==stop+0x100:
  child=cpu.reg_read(UC_X86_REG_ECX);index=read(child+8)
  calls.append(index)
  body=current['children'][index];position=read(stream+0x10)
  cpu.mem_write(buffer+position,bytes(body['bytes']))
  write(stream+0x10,position+len(body['bytes']));write(stream+0xc,position+len(body['bytes']))
  sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp)
  cpu.reg_write(UC_X86_REG_EAX,body['result']);cpu.reg_write(UC_X86_REG_ESP,sp+8);cpu.reg_write(UC_X86_REG_EIP,target)
cpu.hook_add(UC_HOOK_CODE,hook)
def run(address,argument=True):
 sp=stack+0xf000;write(sp,stop);write(sp+4,stream)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(address,stop+1,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('task serializer did not exit')
 return cpu.reg_read(UC_X86_REG_EAX)
cases=[]
childLists=[[],[None],[{'bytes':[0x71,9],'result':1}], [None,{'bytes':[0x72,8,7],'result':1},None,{'bytes':[0x73],'result':1}], [{'bytes':[0x74],'result':0},{'bytes':[0x75],'result':1}]]
for kind,position,typeValue,registryType in itertools.product(['header','controller','environment'],[0,1,2,3,7],[1,6,0x123],[-1,0,21]):
 for childList in childLists:
  current=dict(type=typeValue,registryType=registryType,registryIndex=0x134,children=childList,presentation=[(i*17+typeValue)&255 for i in range(0x5c)],controller=[(i*19+registryType)&255 for i in range(0x138)],environment=[(i*23+position)&255 for i in range(12)])
  cpu.mem_write(buffer,bytes([0xa5])*2048);write(stream+0x10,position);write(stream+0xc,position)
  write(owner+0x2c,typeValue);write(owner+0x28,registryType);write(owner+0x24,0x134)
  write(owner+0x14,len(childList));write(owner+0x18,children)
  for index,child in enumerate(childList):
   obj=owner+0x5000+index*0x100
   write(children+index*4,obj if child else 0)
   if child:write(obj,obj+0x20);write(obj+0x24,stop+0x100);write(obj+8,index)
  cpu.mem_write(owner+0x3c,bytes(current['presentation']));cpu.mem_write(owner+0xd8,bytes(current['controller']));cpu.mem_write(owner+0x3b4,bytes(current['environment']))
  calls.clear();result=run({'header':0x4b1f50,'controller':0x4b2d80,'environment':0x4c8ee0}[kind])
  end=read(stream+0x10)
  cases.append({'kind':kind,'position':position,'input':current,'result':result,'calls':list(calls),'bytes':list(cpu.mem_read(buffer,end)),'length':read(stream+0xc)})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004B1F50/004B2D80/004C8EE0 with original base serializers and stream writes. Child virtual serializers are explicit byte/result interfaces, captured in traversal order.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} original task records')
