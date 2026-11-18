"""Execute fresh base task construction and registration against the original executable."""
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

heapStart=0x2400000;cpu.mem_map(heapStart,0x40000);parent=owner+0x1000;parentSlots=owner+0x2000;parentRegistry=owner+0x4000
for address in [0x4924d0,0x492550,0x492510]:cpu.mem_write(address,b'\xc3')
def hook(cpu,address,size,user):
 global heap
 if address==0x492510:return
 sp=cpu.reg_read(UC_X86_REG_ESP);count=read(sp+(8 if address==0x4924d0 else 4));pointer=heap;heap+=(count+15)&~15;cpu.mem_write(pointer,bytes(count));cpu.reg_write(UC_X86_REG_EAX,pointer)
for address in [0x4924d0,0x492550,0x492510]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
def invoke(address,args):
 sp=stack+0xf000
 for i,v in enumerate([stop]+args):write(sp+4*i,v&0xffffffff)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(address,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
cases=[];offsets=[4,0xc,0x10,0x14,0x24,0x28,0x2c,0x34]
for root in [False,True]:
 for capacity in [16,32]:
  for count in [0,1,15,16,17,32]:
   cpu.mem_write(owner,bytes(0x8000));heap=heapStart
   children=[100+i if i%3 else 0 for i in range(count)]
   write(parent+0xc,capacity);write(parent+0x14,count);write(parent+0x18,parentSlots);write(parent+0x1c,parentSlots+0x200);write(parent+0x30,parentRegistry)
   for i,v in enumerate(children):write(parentSlots+4*i,v)
   invoke(0x4b1ae0,[0 if root else parent]);initial=[read(owner+o) for o in offsets];registry=read(owner+0x30)
   requests=[[2,3],[19,2],[2,3],[-2,0]]
   for typ,index in requests:invoke(0x4b2670,[typ,index])
   buckets={}
   for bucket in [53,-2]:
    entries=[];entry=read(registry+4+bucket*4)
    while entry:
     entries.append([struct.unpack('<i',cpu.mem_read(entry+8,4))[0],struct.unpack('<i',cpu.mem_read(entry+12,4))[0],read(entry+16)]);entry=read(entry+4)
    buckets[str(bucket)]=entries
   cases.append(dict(root=root,capacity=capacity,children=children,initial=initial,requests=requests,buckets=buckets,registryShared=registry==parentRegistry,parentCapacity=read(parent+0xc),parentChildren=[read(read(parent+0x18)+4*i) for i in range(read(parent+0x14))],final=[read(owner+o) for o in [0x24,0x28]]))
args.output.write_text(json.dumps(dict(executableSha256=digest,routines=['004B1AE0','004B2670','004CCE30'],owner=owner,parent=parent,offsets=offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} task construction cases')
