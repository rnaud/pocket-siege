"""Execute original004E9DD0 mine render selection and004AAFD0 water remapping."""
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

context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context);write(owner,0x527300)
def signed(v):return v if v<0x80000000 else v-0x100000000
calls=[]
def hook(cpu,address,size,user):
 if address!=0x4eedf0:return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 calls.append([signed(read(sp+4+i*4)) for i in range(6)])
 cpu.reg_write(UC_X86_REG_ESP,sp+28);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for triggered in [0,1]:
 for fuse in [-250,0,249,250,500,2999]:
  for submerged in [0,1]:
   for fieldB0 in [0,1]:
    for angle in [0,12345,65535]:
     for order in [0,7]:
      calls=[];body=dict(x=123*65536+45,y=-50*65536+67,angle=angle,submerged=submerged,fieldB0=fieldB0)
      for off,value in [(0x90,body['x']),(0x94,body['y']),(0x98,angle),(0xbc,submerged),(0xb0,fieldB0),(0x128,triggered),(0x118,fuse),(0x110,3)]:write(owner+off,value&0xffffffff)
      write(context+0x1030+3*4,order)
      sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
      cpu.emu_start(0x4e9dd0,stop,count=10000)
      if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Render did not finish')
      cases.append(dict(body=body,timer=dict(triggered=triggered,fuse=fuse),order=order,request=calls[0]))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E9DD0 with real mine vtable getters and004AAFD0 remapping; only render queue004EEDF0 captured.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mine render cases')
