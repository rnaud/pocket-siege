"""Execute original physics construction, task ownership and sparse environment registration."""
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


context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x2a0,context)
heap=0x2400000;cpu.mem_map(heap,0x10000);body=heap+0x100;environment=heap+0x2000;table=owner+0x5000
for entry in [0x492550,0x4924d0,0x492510]:cpu.mem_write(entry,b'\xc3')
calls=[];cursor=heap+0x8000
def hook(cpu,entry,size,user):
 global cursor
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if entry==0x492510:calls.append(['free',read(sp+4)]);return
 kind='array' if entry==0x4924d0 else 'allocate';size=read(sp+(8 if kind=='array' else 4));value=cursor;cursor+=(size+15)&~15
 calls.append([kind,size,value]+([read(sp+4)] if kind=='array' else []));cpu.reg_write(UC_X86_REG_EAX,value)
for entry in [0x492550,0x4924d0,0x492510]:cpu.hook_add(UC_HOOK_CODE,hook,begin=entry,end=entry)
def invoke(entry,at,values):
 sp=stack+0xf000
 for i,value in enumerate([stop]+values):write(sp+i*4,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,at);cpu.emu_start(entry,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
cases=[]
for category in range(4):
 for shape in range(4):
  for capacity,count in [(2,0),(2,1),(2,2),(16,15),(16,16)]:
   for allIndex,categoryIndex in [(-1,-1),(0,0),(3,3),(20,1)]:
    cpu.mem_write(heap,bytes((i*7+3)&255 for i in range(0x10000)));cpu.mem_write(owner,bytes((i*11+5)&255 for i in range(0x3c)));cpu.mem_write(context,bytes(0x20000))
    cursor=heap+0x8000;calls.clear();invoke(0x4b1ae0,owner,[0]);write(owner+0x38,context)
    write(context+0x7d4,environment);cpu.mem_write(context+0x11ba0,bytes([[0,1,100,255][shape]]));write(environment,table);write(table+0x34,0x4c8f80);write(environment+0x3c0,heap+0x6000)
    for i in range(4):write(heap+0x63a4+i*4,0x12340000+i)
    for base,storage in [(environment+0x18,heap+0x4000),(environment+0x34+category*0x1c,heap+0x5000)]:
     for offset,value in [(4,capacity),(12,count),(16,storage),(20,storage+0x100)]:write(base+offset,value)
     for i in range(count):write(storage+i*4,0 if i%2==0 else 0x98760000+i)
    invoke(0x4f4000,body,[owner,category,shape]);write(body+0xe8,allIndex);write(body+0xe4,categoryIndex);invoke(0x4c8f80,environment,[body])
    cases.append(dict(category=category,shape=shape,capacity=capacity,count=count,all_index=allIndex,category_index=categoryIndex,calls=list(calls),sha256=hashlib.sha256(cpu.mem_read(owner,0x3c)+cpu.mem_read(heap,0x10000)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004F4000/004C8F80',method='Original task/root registry creation, fresh physics construction and repeated sparse membership insertion. Only allocation/free observed. Complete task/heap and allocator order compared.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'physics ownership sequences')
