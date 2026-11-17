"""Execute original004F9A20 moving projectile release with captured interfaces."""
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

record,vt=owner+0x2000,owner+0x1000
velocity,position=owner+0x5000,owner+0x5100
write(owner,vt);write(vt+0x60,velocity);write(vt+0x5c,position);write(owner+0x354,record)
fields={'weapon':0x170,'enabled':0x2a0,'field27c':0x27c,'shots':0x298,'power':0x25c,'field2a4':0x2a4,'field2a8':0x2a8,'x':0x90,'y':0x94,'vx':0x98,'vy':0x9c}
helpers={velocity:'velocity',position:'position',0x4fa840:'launch',0x4d75e0:'finish'}
def hook(cpu,address,size,user):
 if address not in helpers:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4);count=0
 op=helpers[address]
 if op in ['velocity','position']:
  offset=0x98 if op=='velocity' else 0x90
  write(arg(0),read(owner+offset));write(arg(1),read(owner+offset+4));count=2
 elif op=='launch':calls.append(dict(operation=op,request=[signed(arg(i)) for i in range(4)]));count=4
 else:calls.append(dict(operation=op))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
configs=[(1,subtype,3) for subtype in [0,2,3,7,8,9,10]]+[(kind,3,mode) for kind,mode in [(0,3),(2,3),(3,3),(4,3),(1,0),(1,1),(1,2),(1,4)]]
vectors=[(0,0),(1,-1),(15719,0),(15720,0),(15743,0),(15744,0),(65536,0),(0,-65536),(-65536,65536),(1234567,-7654321),(2147483647,0),(-2147483648,0),(2147483647,-2147483648)]
for kind,subtype,mode in configs:
 for vx,vy in vectors:
  for weapon,enabled,shots,x,y in [(1,1,0,100<<16,200<<16),(1,1,2147483647,2147483647,-2147483648),(0,1,0,0,0),(1,0,0,0,0)]:
   body=dict(weapon=weapon,enabled=enabled,field27c=93,shots=shots,power=65536,field2a4=4,field2a8=8,x=x,y=y,vx=vx,vy=vy)
   config={'0x68':kind,'0x6c':subtype,'0x70':mode}
   for key,offset in fields.items():write(owner+offset,body[key])
   for key,value in config.items():write(record+int(key,16),value)
   sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[]
   cpu.emu_start(0x4f9a20,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Moving fire failed to return')
   output=dict(body={key:signed(read(owner+offset)) for key,offset in fields.items()},record=config,result=signed(cpu.reg_read(UC_X86_REG_EAX)),calls=calls)
   cases.append(dict(body=body,record=config,output=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F9A20 with real0049BF50 vector normalization,004AE15F length and004AE081 division. Position/velocity getters, launch dispatch and finish captured; downstream launch/task effects not executed.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} moving-fire cases')
