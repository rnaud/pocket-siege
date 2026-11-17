"""Execute original flame blast response."""
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

fields={'strength':0x40,'x':0x4c,'y':0x50,'vx':0x54,'vy':0x58,'initial':0x70,'contact':0x74}
context=owner+0x1000
write(owner+0x38,context)
cases=[]
for extent in [0,1,2]:
 for damage in [0,1,25,50,100]:
  for dx,dy in [(0,0),(1,0),(65536,0),(-65536,131072),(100*65536,100*65536),(201*65536,0),(-100*65536,-65536)]:
   for strength in [1,32768,65535]:
    body={'strength':strength,'x':dx,'y':dy,'vx':1234,'vy':-5432,'initial':0,'contact':1}
    for key,off in fields.items():write(owner+off,body[key])
    write(context+0x814,extent)
    sp=stack+0xf000;write(sp,stop)
    for i,v in enumerate([damage,0,0]):write(sp+4+i*4,v)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4d4b80,stop,count=20000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Flame blast did not return')
    cases.append({'input':body,'extent':extent,'packet':[1,0,0,100,damage,0],'output':{key:signed(read(owner+off)) for key,off in fields.items()}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D4B80','method':'Original blast routine and vector normalization execute unchanged.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} flame blast cases')
