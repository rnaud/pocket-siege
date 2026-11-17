"""Execute original004F9870 immediate-fire routing with captured interfaces."""
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

record=owner+0x2000
write(owner+0x354,record)
fields={'weapon':0x170,'enabled':0x2a0,'field27c':0x27c,'shots':0x298,'power':0x25c,'field2a4':0x2a4,'field2a8':0x2a8}
helpers={0x4edb10:'beginAction',0x4f9a20:'projectile',0x4f9c30:'placed',0x4f9d90:'utility',0x4faf90:'launchSetup',0x4fa840:'launch',0x4d75e0:'finish'}
def hook(cpu,address,size,user):
 if address not in helpers:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4);count=0
 op=helpers[address]
 if op=='beginAction':
  calls.append(dict(operation=op))
  for key,value in changes.items():
   if key=='actionType':write(record+0x68,value)
   else:write(owner+fields[key],value)
 elif op=='launchSetup':
  calls.append(dict(operation=op,value=signed(arg(4))));count=5
  for i,value in enumerate(vector):write(arg(i),value)
 elif op=='launch':calls.append(dict(operation=op,request=[signed(arg(i)) for i in range(4)]));count=4
 else:
  calls.append(dict(operation=op))
  cpu.reg_write(UC_X86_REG_EAX,result)
 cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
configs=[(kind,subtype,mode) for kind in [-1,0,1,2,3,4,5] for subtype in range(26) for mode in ([2,3] if kind==1 else [3])]
for kind,subtype,mode in configs:
 for weapon,enabled,shots,changes,result in [(1,1,0,{},1),(0,1,0,{},1),(1,0,0,{},1),(1,1,2147483647,{},-7),(1,1,9,{'enabled':0},0),(1,1,9,{'weapon':0},0),(1,1,9,{'actionType':0},0)]:
  body=dict(weapon=weapon,enabled=enabled,field27c=93,shots=shots,power=65536,field2a4=4,field2a8=8)
  config={'0x68':kind,'0x6c':subtype,'0x70':mode}
  vector=[-123456,987654,2147483647,-2147483648]
  for key,offset in fields.items():write(owner+offset,body[key])
  for key,value in config.items():write(record+int(key,16),value)
  sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[]
  cpu.emu_start(0x4f9870,stop,count=1000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Immediate fire failed to return')
  output=dict(body={key:signed(read(owner+offset)) for key,offset in fields.items()},record={key:signed(read(record+int(key,16))) for key in config},result=signed(cpu.reg_read(UC_X86_REG_EAX)),calls=calls)
  cases.append(dict(body=body,record=config,changes=changes,vector=vector,result=result,output=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F9870 machine code. Begin-action, delegated projectile/placed/utility fire, launch setup/dispatch and finish are captured interfaces; supplied begin-action mutations exercise native airstrike rechecks. No delegated action behavior is asserted.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} immediate-fire cases')
