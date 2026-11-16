"""Execute original004E2A95..004E2B92 projectile render-mode selection."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EDI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]

vtable,config,getangle=owner+0x2000,owner+0x3000,owner+0x4000
write(owner,vtable);write(vtable+0x108,getangle)
def hook(cpu,address,size,user):
 if address!=getangle:return
 sp=cpu.reg_read(UC_X86_REG_ESP);write(read(sp+4),case['angle']&0xffffffff)
 cpu.reg_write(UC_X86_REG_ESP,sp+8);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for mode in range(7):
 for vx,vy in [(0,0),(65536,0),(-65536,0),(0,65536),(0,-65536),(65536,65536),(0x90000,-0x40000),(-0x100000,0x100000)]:
  for variant in range(4):
   case=dict(mode=mode,vx=vx,vy=vy,sprite=600,override=variant%2,overrideSprite=700,remaining=[0,1500,3000,40000][variant],total=3000,progress=[0,12345,65535,-12345][variant],angle=variant*20000,facing=-1)
   write(config+4,case['sprite']);write(config+8,mode)
   for key,off in [('override',0x3a4),('overrideSprite',0x368),('remaining',0x37c),('total',0x318),('progress',0x3dc)]:write(owner+off,case[key]&0xffffffff)
   sp=stack+0xff00;write(sp+0x10,vx&0xffffffff);write(sp+0x14,vy&0xffffffff);write(sp+0x24,0xffffffff)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EBP,owner);cpu.reg_write(UC_X86_REG_EDI,config)
   cpu.emu_start(0x4e2a95,0x4e2b92,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=0x4e2b92:raise RuntimeError('Render block did not finish')
   signed=lambda v:v if v<0x80000000 else v-0x100000000
   cases.append(dict(input=case,output=dict(sprite=signed(cpu.reg_read(UC_X86_REG_EBX)),progress=signed(read(owner+0x3dc)),facing=signed(read(sp+0x24)))))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E2A95..004E2B92 including original direction conversion and clamp. Body angle getter supplied; excludes special mode4/water/render queue.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} projectile render-mode cases')
