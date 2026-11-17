"""Execute original team environment modifiers."""
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

write(owner,0x526f48)
fields={'kind':0x124,'state':0x50,'drag':0x64,'openingProgress':0x108,'progress':0x264,'variant':0x25c,'targetStyle':0x250,'targetDrag':0x254}
def call(entry,args):
 sp=stack+0xf000;write(sp,stop)
 for i,arg in enumerate(args):write(sp+4+i*4,arg)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(entry,stop,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Crate routine did not return')
cases=[]
for kind in range(7):
 for state in [-1,99,100,101,102,103,104,105]:
  for progress in [-1,0,65535,65536,0x7fffffff]:
   for variant in [0,1]:
    body={'kind':kind,'state':state,'drag':123,'openingProgress':progress,'progress':progress,'variant':variant,'targetStyle':variant,'targetDrag':progress}
    for key,offset in fields.items():write(owner+offset,body[key])
    call(0x4e0880,[owner+0x1000,owner+0x1004])
    art={'sprite':read(owner+0x1000),'progress':read(owner+0x1004)}
    call(0x4e07e0,[state])
    after={key:signed(read(owner+offset)) for key,offset in fields.items()}
    cases.append({'input':body,'state':state,'art':art,'output':after})
args.output.write_text(json.dumps({'executable_sha256':digest,'entries':['004E07E0','004E0880'],'method':'Original state entry, sprite selection, state getter, drag setter and water sprite conversion execute unchanged with original vtable; no hooks.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} crate state/art pairs')
