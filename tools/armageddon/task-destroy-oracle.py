"""Execute original task-tree construction, registration, deletion and resource release."""
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


heap=0x2400000;cpu.mem_map(heap,0x10000);calls=[];cursor=heap+0x8000
for entry in [0x492550,0x4924d0,0x492510,0x492590]:cpu.mem_write(entry,b'\xc3')
def hook(cpu,entry,size,user):
 global cursor
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if entry==0x492510:calls.append(['free',read(sp+4)]);return
 if entry==0x492590:calls.append(['release',read(sp+4),read(sp+8)]);return
 kind='array' if entry==0x4924d0 else 'allocate';size=read(sp+(8 if kind=='array' else 4));value=cursor;cursor+=(size+15)&~15
 calls.append([kind,size,value]+([read(sp+4)] if kind=='array' else []));cpu.reg_write(UC_X86_REG_EAX,value)
for entry in [0x492550,0x4924d0,0x492510,0x492590]:cpu.hook_add(UC_HOOK_CODE,hook,begin=entry,end=entry)
def invoke(entry,at,values):
 sp=stack+0xf000
 for i,value in enumerate([stop]+values):write(sp+i*4,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,at);cpu.emu_start(entry,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
cases=[]
for count in range(8):
 for flags in range(4):
  for mode in range(4):
   cpu.mem_write(owner,bytes((i*11+5)&255 for i in range(0x10000)));cpu.mem_write(heap,bytes((i*7+3)&255 for i in range(0x10000)));cursor=heap+0x8000;calls.clear()
   invoke(0x4b1ae0,owner,[0]);invoke(0x4b2670,owner,[20,0])
   for index in range(count):
    child=heap+0x100+index*0x300;invoke(0x4b1ae0,child,[owner]);invoke(0x4b2670,child,[20 if mode<2 else -20,0 if mode==1 else index+2])
    for j in range(mode%3):
     grandchild=child+(j+1)*0x100;invoke(0x4b1ae0,grandchild,[child]);invoke(0x4b2670,grandchild,[3,index*3+j])
   if count and mode&1:invoke(0x4b1c60,heap+0x100,[1])
   if mode&2:invoke(0x4b2a00,owner,[])
   invoke(0x4b1c60,owner,[flags])
   cases.append(dict(count=count,flags=flags,mode=mode,calls=list(calls),sha256=hashlib.sha256(cpu.mem_read(owner,0x10000)+cpu.mem_read(heap,0x10000)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004B1C60/004CCED0/004CCDD0/004CCEA0',method='Native constructors, registration, recursive child destruction, registry removal, cleanup and resource destructors execute. Only allocation/free services are observed. Full owner and heap memory plus ordered allocator calls compared.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'task tree destructions')
