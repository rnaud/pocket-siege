"""Execute original004F89D0 bungee spring and pose update with captured interfaces."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP
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

vt=owner+0x1000
animator,animvt=owner+0x2000,owner+0x2100
getangle,getlength,resize,state,progress=[owner+0x4000+i*0x100 for i in range(5)]
write(owner,vt);write(owner+0x350,animator);write(animator,animvt);write(animvt+0x10,progress)
for offset,address,pop in [(0x108,getangle,4),(0xd4,getlength,0),(0xd8,resize,4),(0x80,state,4)]:
 write(vt+offset,address);cpu.mem_write(address,bytes([0xc2,pop,0]))
cpu.mem_write(progress,b'\xc2\x04\x00')
fields={'angle':0x98,'length':0xd4,'state':0x50,'facing':0x1b0,'field104':0x104,'field108':0x108,'bungeeLength':0x1ec,'field1f0':0x1f0}
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);value=signed(read(sp+4))
 if address==getangle:write(read(sp+4),read(owner+0x98))
 elif address==getlength:cpu.reg_write(UC_X86_REG_EAX,read(owner+0xd4))
 elif address==resize:
  calls.append({'operation':'resize','length':value})
  if accepted:write(owner+0xd4,value)
  cpu.reg_write(UC_X86_REG_EAX,accepted)
 elif address==state:write(owner+0x50,value);calls.append({'operation':'state','value':value})
 elif address==progress:calls.append({'operation':'progress','value':value})
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for angle in [-1,0,0x2000,0x7fff,0x8000,0xa000,0xffff,0x10000]:
 for facing in [-1,1]:
  for target in [12<<16,100<<16,420<<16]:
   for velocity in [-0x50000,0,0x50000]:
    for accepted in [0,1]:
     for field104,field108 in [(1,0),(0,0),(1,1)]:
      body={'angle':angle,'length':100<<16,'state':0x7c,'facing':facing,'field104':field104,'field108':field108,'bungeeLength':target,'field1f0':velocity}
      for key,offset in fields.items():write(owner+offset,body[key])
      sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
      calls=[];cpu.emu_start(0x4f89d0,stop,count=10000)
      if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Bungee tick did not return')
      output={'body':{key:signed(read(owner+offset)) for key,offset in fields.items()},'calls':calls}
      cases.append({'body':body,'accepted':accepted,'output':output})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004F89D0','method':'Original spring arithmetic, clamp, fixed multiplication, pose selection and release gate. Length acceptance and animator/state interfaces supplied.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} bungee spring cases')
