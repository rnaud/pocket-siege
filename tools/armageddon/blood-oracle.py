"""Execute original blood emission instructions in Unicorn.

Original blood emission instructions execute; native RNG executes and particle requests are captured. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
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




context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
manager,vtable,gravity_fn=owner+0x2000,owner+0x3000,owner+0x4000
write(context+0x7d4,manager);write(manager,vtable);write(vtable+0x24,gravity_fn)
cpu.mem_write(gravity_fn,b'\xb8\x70\x3d\x00\x00\xc3');cpu.mem_write(0x4ee7f0,b'\xc2\x30\x00')
requests=[]
def capture(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);requests.append(list(struct.unpack('<12i',cpu.mem_read(sp+4,48))))
cpu.hook_add(UC_HOOK_CODE,capture,begin=0x4ee7f0,end=0x4ee7f0)
cases=[]
for x,y in [(0,0),(10<<16,0),(0,10<<16),(-20<<16,-20<<16)]:
 for damage in [2,3,16,30]:
  for amount in [0,100,255]:
   for mode in [0,1]:
    requests=[];write(context+0x1acc,42);write(context+0x7f0,91);write(context+0x1ac0,mode);cpu.mem_write(context+0x11d6f,bytes([amount]));sp=stack+0xf000
    for i,value in enumerate([stop,x,y,0,0,damage]):write(sp+i*4,value&0xffffffff)
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4d9670,stop,count=100000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Blood emission failed to return')
    cases.append(dict(x=x,y=y,damage=damage,amount=amount,mode=mode,seed=42,frame=91,requests=requests,random=read(context+0x1acc)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004D9670',method='Original blood emission, vector normalization, logic RNG and fixed arithmetic; supplied gravity and captured particle calls.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} blood emissions')
