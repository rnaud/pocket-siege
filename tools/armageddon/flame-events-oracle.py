"""Execute original flame lifecycle events."""
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

fields={'strength':0x40,'enabled':0x78,'persistent':0xac}
cases=[]
for event in [0x3fd,0x400,0x401]:
 for persistent in [0,1,-1]:
  for strength in [-2147483648,-1,0,6553,65535,2147483647]:
   for enabled in [0,1]:
    body={'strength':strength,'enabled':enabled,'persistent':persistent}
    for key,off in fields.items():write(owner+off,body[key])
    sp=stack+0xf000;write(sp,stop)
    for i,v in enumerate([0,event,0,0]):write(sp+4+i*4,v)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4d4590,stop,count=20000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Flame event did not return')
    cases.append({'input':body,'event':event,'output':{key:signed(read(owner+off)) for key,off in fields.items()}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D4590 events3FD/400','method':'Original event dispatcher executes unchanged including an unrelated event control.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} flame event cases')
