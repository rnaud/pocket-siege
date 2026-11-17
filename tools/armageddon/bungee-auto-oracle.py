"""Execute original004F8790 automatic bungee drop detection with captured interfaces."""
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
context=owner+0x2000
record=owner+0x3000
getpos,gettype,settype,attempt=[owner+0x4000+i*0x100 for i in range(4)]
write(owner,vt);write(owner+0x38,context);write(owner+0x354,record)
for offset,address,pop in [(0x5c,getpos,8),(0x74,gettype,0),(0x78,settype,4),(0x100,attempt,8)]:
 write(vt+offset,address);cpu.mem_write(address,bytes([0xc2,pop,0]))
cpu.mem_write(0x4f88a0,b'\xc3')
fields={'x':0x90,'y':0x94,'type':0x114,'enabled':0x170,'field104':0x104,'field108':0x108,'minimumDrop':0x1a8,'bungeeLength':0x1ec}
def hook(cpu,address,size,user):
 global attempts
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==getpos:write(read(sp+4),read(owner+0x90));write(read(sp+8),read(owner+0x94))
 elif address==gettype:cpu.reg_write(UC_X86_REG_EAX,read(owner+0x114))
 elif address==settype:
  value=read(sp+4);write(owner+0x114,value);calls.append({'operation':'type','value':value})
 elif address==attempt:
  x,y=signed(read(sp+4)),signed(read(sp+8))
  calls.append({'operation':'tryPosition','request':[x,y]})
  accepted=read(owner+0x114)==2 or attempts<clearSteps
  attempts+=1
  if accepted:write(owner+0x90,x);write(owner+0x94,y)
  cpu.reg_write(UC_X86_REG_EAX,int(accepted))
 elif address==0x4f88a0:calls.append({'operation':'activate'})
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for gate in range(6):
 for clearSteps in [0,1,9,10,20,69,70,100]:
  for height in [100,107,500,1000]:
   for minimumDrop in [6,60,66,120]:
    body={'x':123<<16,'y':100<<16,'type':3,'enabled':int(gate!=1),'field104':int(gate!=2),'field108':int(gate==3),'minimumDrop':minimumDrop,'bungeeLength':12345}
    weapon={'type':1 if gate==4 else 4,'subtype':1 if gate==5 else 7}
    for key,offset in fields.items():write(owner+offset,body[key])
    write(context+0x804,height);write(record+0x68,weapon['type']);write(record+0x6c,weapon['subtype'])
    sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
    calls=[];attempts=0;cpu.emu_start(0x4f8790,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Bungee check did not return')
    output={'body':{key:signed(read(owner+offset)) for key,offset in fields.items()},'calls':calls}
    cases.append({'body':body,'weapon':weapon,'height':height,'clearSteps':clearSteps,'output':output})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004F8790','method':'Original eligibility, six-pixel search, position restoration and cord-length calculation execute. Position acceptance and activation are supplied interfaces.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} automatic bungee cases')
