"""Execute original barrel render event3EB."""
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

context=owner+0x20000;cpu.mem_map(context,0x20000);write(owner,0x526988);write(owner+0x38,context);write(owner+0x100,0)
def ret(cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4eedf0:events.append([signed(read(sp+4+i*4)) for i in range(6)]);ret(24)
 elif address==0x4f4410:ret(16)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for damage in [-1,0,12,13,25,38,49,50,100,2147483647]:
 for submerged in [0,1]:
  for frame in [0,1,49,50,32768]:
   for rank in [0,17]:
    body={'x':123456,'y':-765432,'damage':damage,'threshold':50,'submerged':submerged}
    for key,off in [('x',0x90),('y',0x94),('damage',0x104),('threshold',0x108),('submerged',0xbc)]:write(owner+off,body[key])
    write(context+0x1030,rank);write(context+0x1b8ec,frame)
    sp=stack+0xf000;write(sp,stop)
    for i,v in enumerate([0,0x3eb,0,0]):write(sp+4+i*4,v)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);events=[];cpu.emu_start(0x4d1860,stop,count=20000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Barrel art did not return')
    cases.append({'body':body,'frame':frame,'rank':rank,'request':events[0]})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D1860 event3EB','method':'Original render handler, position/submersion getters and water sprite substitution; queue captured, base cleanup stubbed.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} barrel art cases')
