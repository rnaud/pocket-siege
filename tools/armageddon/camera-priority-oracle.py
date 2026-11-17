"""Execute original004EE990 camera accumulation and004EEAA0 priority selection."""
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

context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
def signed(v):return v if v<0x80000000 else v-0x100000000
def run(address,args):
 sp=stack+0xff00;write(sp,stop)
 for i,value in enumerate(args):write(sp+4+4*i,value&0xffffffff)
 cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(address,stop,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Camera routine did not finish')
cases=[]
for cap in [-1,5,7,13,14]:
 for elapsed in [0,49,50,51]:
  for disabled in [0,1]:
   for requests in [[],[[7,100,-200],[7,-300,500],[8,900,200]],[[5,-100,400],[5,200,100],[10,0,0]]]:
    cpu.mem_write(context+0x124a4,b'\0'*(14*20));write(context+0x12414,cap&0xffffffff);write(context+0x12410,100);write(context+0x7f0,100+elapsed);write(context+0x1ac8,disabled)
    for request in requests:run(0x4ee990,request)
    out=owner+0x2000;cpu.mem_write(out,b'\0'*16);run(0x4eeaa0,[out,out+4,out+8,out+12]);found=cpu.reg_read(UC_X86_REG_EAX)
    groups=[[signed(read(context+0x124a4+i*20+j*4)) for j in range(5)] for i in range(14)]
    cases.append(dict(cap=cap,lastFrame=100,frame=100+elapsed,disabled=disabled,requests=requests,groups=groups,outputCap=signed(read(context+0x12414)),outputFrame=read(context+0x12410),bounds=[signed(read(out+j*4)) for j in range(4)] if found else None))
resets=[]
for cap in [-1,0,9,13,14]:
 cpu.mem_write(context+0x124a4,b'\0'*(14*20));write(context+0x1ac8,0)
 for request in [[1,100,200],[9,-300,400],[13,500,-600]]:run(0x4ee990,request)
 write(context+0x12490,1);write(context+0x12410,123)
 run(0x4eea10,[cap])
 resets.append(dict(cap=cap,groups=[[signed(read(context+0x124a4+i*20+j*4)) for j in range(5)] for i in range(14)],lastFrame=read(context+0x12410),special=read(context+0x12490),outputCap=signed(read(context+0x12414))))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004EE990 and004EEAA0 executed unchanged, plus004EEA10 priority reset, including disabled accumulation and50-frame priority timeout.',cases=cases,resets=resets),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} camera priority cases')
