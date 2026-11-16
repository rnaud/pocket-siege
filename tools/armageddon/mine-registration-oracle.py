"""Execute original004E9A40 mine slot registration and eviction."""
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
delete=read(0x527300)
def signed(v):return v if v<0x80000000 else v-0x100000000
calls=[]
def hook(cpu,address,size,user):
 if address not in [0x4ee7f0,delete]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);n=12 if address==0x4ee7f0 else 1
 calls.append(dict(operation='effect' if n==12 else 'delete',request=[signed(read(sp+4+i*4)) for i in range(n)]))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+n*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
patterns=[[None]*24,[None if i==7 else i for i in range(24)],[None if i in [3,15] else i for i in range(24)],list(range(24)),list(range(24,0,-1)),[9]*24,[-5 if i==17 else 10 for i in range(24)],[2147483647 if i%2 else -2147483648 for i in range(24)]]
for frames in patterns:
 for frame in [0,123456,-2147483648]:
  for color in [0,2]:
   slots=[]
   for i,f in enumerate(frames):
    old=owner+0x2000+i*0x200;write(context+0x450+i*4,old if f is not None else 0)
    if f is None:slots.append(None);continue
    write(old,0x527300);write(old+0x38,context);write(old+0xfc,f&0xffffffff);write(old+0x90,i*65536);write(old+0x94,(i+100)*65536)
    slots.append(dict(frame=f,x=i*65536,y=(i+100)*65536))
   write(owner+0x144,1);cpu.mem_write(context+0x3cd1+3000,bytes([color]));write(context+0x7f0,frame&0xffffffff)
   calls=[];sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4e9a40,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Registration did not finish')
   cases.append(dict(slots=slots,frame=frame,color=color,slot=read(owner+0x100),registeredFrame=signed(read(owner+0xfc)),calls=calls))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E9A40 with real old-body position getter. Effect/destructor boundaries captured; slot table, oldest-frame comparison and new registration execute unchanged.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mine registration cases')
