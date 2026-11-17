"""Execute original004E0270 barrel contact callback and004F4C30 receiver dispatch."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EBP
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

context=0x3000000;cpu.mem_map(context,0x20000)
other=owner+0x3000;vtable=owner+0x4000;other_vtable=owner+0x5000
write(owner+0x38,context);write(owner,vtable);write(other,other_vtable)
write(vtable+0x60,0x4d0f70);write(vtable+0x80,0x4d1000)
for offset,address in [(0x48,stop+0x100),(0x24,stop+0x200)]:write(vtable+offset,address)
write(other_vtable+0x28,stop+0x300)
def signed(v):return v if v<0x80000000 else v-0x100000000
calls=[];accepted=0
def hook(cpu,address,size,user):
 if address not in [stop+0x100,stop+0x200,stop+0x300]:return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  calls.append(dict(operation='sound',request=[signed(read(sp+4+i*4)) for i in range(4)]));n=16
 else:
  calls.append(dict(operation='receive' if address==stop+0x300 else 'bounce',side=signed(read(sp+8))));n=8
 cpu.reg_write(UC_X86_REG_EAX,accepted if address==stop+0x300 else 0)
 cpu.reg_write(UC_X86_REG_ESP,sp+4+n);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for vx,vy in [(0,0),(65536,-131072),(-17,29),(0x7fffffff,1),(-0x80000000,0),(-345678,-876543)]:
 for suppress in [0,1]:
  for force in [0]:
   for dud in [0]:
    for accepted in [0,1]:
     for side in [1,4,8]:
      calls=[]
      for off,value in [(0x9c,vx),(0xa0,vy),(0x108,force),(0x138,dud),(0x50,0)]:write(owner+off,value&0xffffffff)
      write(context+0x1ac4,suppress)
      sp=stack+0xff00;write(sp,stop);write(sp+4,other);write(sp+8,side)
      cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4d15f0,stop,count=10000)
      if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Contact did not finish')
      cases.append(dict(vx=vx,vy=vy,suppress=suppress,forceBlast=force,dud=dud,accepted=accepted,side=side,calls=calls,state=read(owner+0x50)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004D15F0 and004F4C30 execute with real velocity getter and state setter. Sound, receiver and bounce interfaces captured; receiver result supplied.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} barrel contact cases')
