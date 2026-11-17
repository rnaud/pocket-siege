"""Execute original004DC730 rope and traversal directional input with captured interfaces."""
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
velocity,state,length,resize,impulse=[owner+0x2000+i*0x100 for i in range(5)]
write(owner,vt)
for offset,address in [(0x60,velocity),(0x7c,state),(0xd4,length),(0xd8,resize),(0x118,impulse)]:write(vt+offset,address)
fields={'state':0x84,'up':0x1dc,'down':0x1e0,'left':0x1e4,'right':0x1e8,'field1f0':0x1f0,'ropeLength':0x274,'length':0xd4,'moving':0x2ec}
def hook(cpu,address,size,user):
 if address not in [velocity,state,length,resize,impulse]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4);count=0
 if address==velocity:write(arg(0),0);write(arg(1),0);count=2
 elif address==state:cpu.reg_write(UC_X86_REG_EAX,read(owner+0x84))
 elif address==length:cpu.reg_write(UC_X86_REG_EAX,read(owner+0xd4))
 elif address==resize:calls.append(dict(operation='resize',length=signed(arg(0))));count=1
 else:calls.append(dict(operation='impulse',request=[signed(arg(i)) for i in range(3)]));count=3
 cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for current in [0x65,0x73,0x7b,0x7c]:
 for keys in range(16):
  for distance,maximum,accumulator in [(20<<16,378,0),(378<<16,378,2147483647),(377<<16,378,-2147483648),(2147483647,32768,0)]:
   body=dict(state=current,up=keys&1,down=keys&2,left=keys&4,right=keys&8,field1f0=accumulator,ropeLength=maximum,length=distance,moving=99)
   for key,offset in fields.items():write(owner+offset,body[key])
   sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[]
   cpu.emu_start(0x4dc730,stop,count=1000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Rope input failed to return')
   output=dict(body={key:signed(read(owner+offset)) for key,offset in fields.items()},calls=calls)
   cases.append(dict(body=body,output=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004DC730. Motion/state/length getters supplied; impulse and resize captured without downstream body mutation. Covers opposing keys, up precedence, state-dependent impulse, exact range gate and signed overflow.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} rope-input cases')
