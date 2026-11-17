"""Capture shared terrain palettes using original IMG and SPR loaders."""
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

root=Path(__file__).resolve().parents[2]
position=0;raw=b'';mapping=None
source=0x2400000
cpu.mem_map(source,0x400000)
compare=stop+0x100
write(0x51796c,compare)
def ret(value,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
 cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup)
def hook(cpu,address,size,user):
 global position,mapping
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x492550:ret(0) # unused SPR bitmap wrapper
 elif address==0x4acb80:ret(position)
 elif address==0x4acc70:
  target,count=read(sp+4),read(sp+8)
  cpu.mem_write(target,raw[position:position+count]);position+=count;ret(count,8)
 elif address==compare:
  count=read(sp+12);a=bytes(cpu.mem_read(read(sp+4),count));b=bytes(cpu.mem_read(read(sp+8),count))
  ret((a>b)-(a<b))
 elif address==0x492858:
  count=struct.unpack_from('<H',raw,10)[0]
  mapping=list(cpu.mem_read(sp+0x34,count+1));cpu.emu_stop()
cpu.hook_add(UC_HOOK_CODE,hook)
def call(entry,values,receiver=owner):
 sp=stack+0xf000
 for i,v in enumerate([stop]+values):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ECX,receiver);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(entry,stop,count=1000000)
 if cpu.reg_read(UC_X86_REG_EIP) not in [stop,0x492858]:raise RuntimeError('Unexpected IMG exit')
cases=[]
for directory in sorted((root/'public/armageddon/media/level').glob('*/level')):
 cpu.mem_write(owner,bytes(0x4000));call(0x4adac0,[137,248]);rows=[]
 for name in ['soil.img','grass.img','gradient.img','back.spr','debris.spr']:
  path=directory/name;raw=path.read_bytes();position=0;mapping=None
  if name.endswith('.img'):call(0x492750,[owner,owner+0x3000])
  else:
   cpu.mem_write(source,raw);call(0x4af790,[owner,source],owner+0x3000)
   mapping=list(cpu.mem_read(read(owner+0x302c),struct.unpack_from('<H',raw,10)[0]+1))
  if mapping is None:raise RuntimeError('Palette not captured')
  n=struct.unpack('<h',cpu.mem_read(owner+0x90e,2))[0]
  used=struct.unpack('<'+'h'*n,cpu.mem_read(owner+0x910,n*2))
  entries=[[i,list(struct.unpack('<3h',cpu.mem_read(owner+12+i*6,6)))] for i in used]
  rows.append({'name':name,'sha256':hashlib.sha256(raw).hexdigest(),'mapping':mapping,'entries':entries})
 cases.append({'theme':directory.parent.name,'rows':rows})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'00492750..00492858/004AF790',
 'method':'Sequential original IMG palette blocks and full SPR loaders share bank137..248. Order follows soil/grass in004A78A0 then gradient/back/debris in004A5350. Real palette add executes; file interfaces supplied and SPR bitmap allocation returns null. Does not execute serialized level loading or capture its preceding palette entries.',
 'cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} shared theme palettes')
