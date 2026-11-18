"""Execute addressed base task restoration against the original executable."""
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

heapStart=0x2400000;cpu.mem_map(heapStart,0x40000)
parent=owner+0x1000;parentSlots=owner+0x2000;parentRegistry=owner+0x4000
stream=owner+0x5000;buffer=owner+0x5100
calls=[]
def hook(cpu,address,size,user):
 global heap
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x492510:calls.append(['free',read(sp+4)])
 else:
  count=read(sp+(8 if address==0x4924d0 else 4));pointer=heap;heap+=(count+15)&~15
  calls.append(['array',count,read(sp+4)] if address==0x4924d0 else ['allocate',count])
  cpu.mem_write(pointer,bytes(count));cpu.reg_write(UC_X86_REG_EAX,pointer)
 cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4)
for address in [0x4924d0,0x492550,0x492510]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
def invoke():
 sp=stack+0xf000
 for i,v in enumerate([stop,0 if root else parent,stream]):write(sp+4*i,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4b1de0,stop,count=100000)
 assert cpu.reg_read(UC_X86_REG_EIP)==stop
cases=[]
import itertools,base64,zlib
for root,count,identity,marker,terminator in itertools.product([False,True],[0,1,15,16,32],[(0,255),(2,3),(19,2),(255,255)],[0,255],[0,255]):
 cpu.mem_write(owner,bytes(0x10000));cpu.mem_write(owner,bytes([0xa5])*0x3c)
 cpu.mem_write(heapStart,bytes([0xcc])*0x40000);heap=heapStart;calls.clear()
 write(parent+0xc,16 if count<=16 else 32);write(parent+0x14,count)
 write(parent+0x18,parentSlots);write(parent+0x1c,parentSlots+0x200);write(parent+0x30,parentRegistry)
 for i in range(count):write(parentSlots+4*i,100+i if i%3 else 0)
 #Pre-existing matching key checks prepend ordering in the shared registry.
 typ,index=identity
 if typ:
  node=owner+0x4800;write(parentRegistry+4+((index*17+typ)%256)*4,node)
  for off,value in [(4,0),(8,typ),(12,index),(16,parent)]:write(node+off,value)
 payload=bytes([marker,18,typ,index,terminator])
 cpu.mem_write(buffer,payload);write(stream+4,buffer);write(stream+8,256);write(stream+12,len(payload));write(stream+16,0)
 initial=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(heapStart,0x40000))
 invoke()
 final=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(heapStart,0x40000))
 cases.append(dict(root=root,inputMemory=base64.b64encode(zlib.compress(initial)).decode(),sha256=hashlib.sha256(final).hexdigest(),calls=list(calls),position=read(stream+16)))
args.output.write_text(json.dumps(dict(executableSha256=digest,method='Original004B1DE0 with complete parent attachment, registry construction/insertion, stream reads and004B2230 terminator/unknown-tag dispatch. Only heap allocate/free substituted.320KiB complete memory hashes and ordered allocation/free calls for160 root/parent, capacity boundary, duplicate registry, zero/nonzero identity and marker/terminator cases. Concrete child reconstruction is not exercised.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} addressed task restores')
