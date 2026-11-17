"""Execute the original replay physics environment constructor, including all list constructors."""
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

stream=owner+0x1000;buffer=owner+0x2000;context=0x3456789
heapBase=0x2300000
cpu.mem_map(heapBase,0x20000)
heap=heapBase;allocations=[]
def hook(cpu,address,size,user):
 global heap
 if address==stop:cpu.emu_stop();return
 if address==0x4924d0:
  sp=cpu.reg_read(UC_X86_REG_ESP);size=read(sp+8)
  pointer=heap;heap+=size;allocations.append(size)
  cpu.mem_write(pointer,bytes(size))
  cpu.reg_write(UC_X86_REG_EAX,pointer)
  cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4)
cpu.hook_add(UC_HOOK_CODE,hook)
write(stream+4,buffer)
cases=[]
for position in range(8):
 for marker in [0,33,255]:
  for seed in [0,17,255]:
   heap=heapBase;allocations.clear()
   cpu.mem_write(owner,bytes([0xa5])*0x3c4)
   payload=bytearray([0xcc]*position+[marker])
   while len(payload)%4:payload.append(255)
   payload.extend((seed+i*37)&255 for i in range(12))
   cpu.mem_write(buffer,bytes(payload));write(stream+0x10,position);write(stream+0xc,len(payload))
   sp=stack+0xf000;write(sp,stop);write(sp+4,context);write(sp+8,stream)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4c8e40,stop+1,count=100000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('constructor did not exit')
   lists=[]
   for offset in [0x18]+[0x34+i*0x1c for i in range(32)]:
    lists.append({'capacity':read(owner+offset+4),'count':read(owner+offset+12),'cursor':read(owner+offset+8)})
    for pointerOffset in [16,20]:
     if any(cpu.mem_read(read(owner+offset+pointerOffset),1024)):raise RuntimeError('list storage is not zeroed')
   result={'lists':lists,'state':list(cpu.mem_read(owner+0x3b4,12)),'dirty':read(owner+4),'context':read(owner+0x3c0),'position':read(stream+0x10),'allocations':list(allocations)}
   cases.append({'input':{'position':position,'bytes':list(payload),'context':context},'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004C8E40 and all32 original004C8D10 list constructors, original byte/aligned block readers. Only zeroed heap allocation substituted. All66 allocated buffers checked for zero contents.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} environment restores')
