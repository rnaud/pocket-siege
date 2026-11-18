"""Execute original task cleanup with mutable child callbacks and dirty list compaction."""
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


children=owner+0x4000;alternate=owner+0x5000;scratch=owner+0x6000;table=owner+0x8000;callback=stop+0x100
cpu.mem_write(callback,b'\xc3');calls=[]
def hook(cpu,entry,size,user):
 at=cpu.reg_read(UC_X86_REG_ECX);calls.append(at)
 if len(calls)!=1:return
 if mode==1:write(owner+20,0)
 elif mode==2:write(children+4,0);write(owner+16,1)
 elif mode==3:write(owner+24,alternate)
 elif mode==4:write(children+count*4,owner+0x1700);write(owner+20,count+1)
 elif mode==5:write(owner+20,1)
 elif mode==6:write(children,0);write(owner+16,1)
 elif mode==7:write(owner+16,0)
cpu.hook_add(UC_HOOK_CODE,hook,begin=callback,end=callback)
cases=[]
for count in range(8):
 for mode in range(8):
  for mask in range(4):
   for dirty in [0,1]:
    cpu.mem_write(owner,bytes((i*7+3)&255 for i in range(0x10000)))
    write(table+0x18,callback)
    for i in range(8):write(owner+0x1000+i*0x100,table)
    for i in range(count):
     write(children+i*4,0 if mask==1 or mask==2 and i%2==0 or mask==3 and i%2 else owner+0x1000+i*0x100)
     write(alternate+i*4,owner+0x1000+(7-i)*0x100)
    for offset,value in [(16,dirty),(20,count),(24,children),(28,scratch),(32,0xdeadbeef)]:write(owner+offset,value)
    calls.clear();sp=stack+0xf000;write(sp,stop)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4b2a00,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(count=count,mode=mode,mask=mask,dirty=dirty,calls=list(calls),sha256=hashlib.sha256(cpu.mem_read(owner,0x10000)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004B2A00',method='Original task cleanup and compaction execute unmodified. Child virtual callbacks mutate counts, holes, backing storage and dirty flags; full memory and ordered child calls compared.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'task cleanup sequences')
