"""Execute original004F88A0 bungee attachment with captured interfaces."""
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
getpos,attempt,constrain,state=[owner+0x4000+i*0x100 for i in range(4)]
write(owner,vt)
for offset,address,pop in [(0x5c,getpos,8),(0x100,attempt,8),(0xcc,constrain,8),(0x80,state,4)]:
 write(vt+offset,address);cpu.mem_write(address,bytes([0xc2,pop,0]))
for address,pop in [(0x4edaf0,8),(0x4edc90,20),(0x4faf90,20),(0x4fa840,16),(0x4d75e0,0)]:cpu.mem_write(address,bytes([0xc2,pop,0]))
fields={'x':0x90,'y':0x94,'state':0x50,'team':0xfc,'shots':0x298,'field2a4':0x2a4,'field2a8':0x2a8}
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:signed(read(sp+4+4*i))
 if address==getpos:write(read(sp+4),read(owner+0x90));write(read(sp+8),read(owner+0x94))
 elif address==attempt:
  calls.append({'operation':'tryPosition','request':[arg(0),arg(1)]})
  if accepted:write(owner+0x90,arg(0));write(owner+0x94,arg(1))
  cpu.reg_write(UC_X86_REG_EAX,accepted)
 elif address==constrain:
  calls.append({'operation':'constrain','request':[arg(0),arg(1)]});cpu.reg_write(UC_X86_REG_EAX,attached)
 elif address==state:
  write(owner+0x50,arg(0));calls.append({'operation':'state','value':arg(0)})
 elif address==0x4edaf0:
  calls.append({'operation':'voice','request':[arg(0),arg(1)]});cpu.reg_write(UC_X86_REG_EAX,777)
 elif address==0x4edc90:calls.append({'operation':'sound','request':[arg(i) for i in range(5)]})
 elif address==0x4faf90:
  calls.append({'operation':'launchSetup','value':arg(4)})
  for i,v in enumerate([101,-202,303,-404]):write(read(sp+4+4*i),v)
 elif address==0x4fa840:calls.append({'operation':'launch','request':[arg(i) for i in range(4)]})
 elif address==0x4d75e0:calls.append({'operation':'finish'})
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for x,y in [(100<<16,200<<16),(-1234567,-8765432),(2147483647,2147483647)]:
 for accepted,attached in [(0,0),(1,0),(1,1)]:
  for shots in [0,2,2147483647]:
   body={'x':x,'y':y,'state':0x65,'team':2,'shots':shots,'field2a4':0,'field2a8':7}
   for key,offset in fields.items():write(owner+offset,body[key])
   sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
   calls=[];cpu.emu_start(0x4f88a0,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Bungee attachment did not return')
   output={'body':{key:signed(read(owner+offset)) for key,offset in fields.items()},'calls':calls}
   cases.append({'body':body,'accepted':accepted,'attached':attached,'output':output})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004F88A0','method':'Original attachment controller executes. Position, constraint, state, speech and launch interfaces are captured; downstream physics and launch are tested separately.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} bungee attachment cases')
