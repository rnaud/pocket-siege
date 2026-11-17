"""Execute original004E02E0 crate contents effects."""
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

context=0x3000000;cpu.mem_map(context,0x20000);write(owner,0x526f48);write(owner+0x38,context)
write(owner+0x90,123456);write(owner+0x94,(-765432)&0xffffffff)
def ret(value,cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def words(address,count):return [signed(read(address+4*i)) for i in range(count)]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4ee960:events.append(['random']);ret(random,0)
 elif address==0x4ccf50:events.append(['parent']+words(sp+4,2));ret(25,8)
 elif address==0x492550:events.append(['allocate',read(sp+4),allocated]);ret(owner+0x5000 if allocated else 0,0)
 elif address==0x4e1830:events.append(['projectile',read(sp+4),read(sp+8)-context,words(read(sp+12),11)]);ret(owner+0x5000,12)
 elif address==0x4edc90:events.append(['sound']+words(sp+4,5));ret(0,20)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for weapon in range(71):
 for allContents in [0,1]:
  for allocated in [0,1]:
   for random in [0,0xffffffff]:
    for pool,used in [([0,1],[]),([1],[0])]:
     write(context+0x1ab8,allContents)
     write(context+0x1500,len(pool));write(context+0x1544,len(used))
     for i,v in enumerate(pool):write(context+0x14c0+4*i,v)
     for i,v in enumerate(used):write(context+0x1504+4*i,v)
     sp=stack+0xf000;write(sp,stop);write(sp+4,weapon);write(sp+8,999)
     cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);events=[];cpu.emu_start(0x4e02e0,stop,count=20000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Contents did not return')
     cases.append({'weapon':weapon,'allContents':allContents,'allocated':allocated,'random':random,'pool':pool,'used':used,'events':events,'outputPool':words(context+0x14c0,read(context+0x1500)),'outputUsed':words(context+0x1504,read(context+0x1544))})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004E02E0','method':'Original full contents dispatcher, classifier004AA9B0 and no-repeat direction bag. RNG, parent lookup, allocation, projectile construction and sound are captured interfaces; supplied parent argument999 intentionally differs from lookup25.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} crate contents cases')
