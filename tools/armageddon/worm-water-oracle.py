"""Execute original worm water skim callback."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_ESI, UC_X86_REG_EDI
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


vt,world,state,state_set=owner+0x1000,owner+0x20000,owner+0x2000,owner+0x2100
cpu.mem_map(world,0x20000);write(owner,vt);write(owner+0x38,world);write(vt+0x7c,state);write(vt+0x80,state_set)
def hook(cpu,address,size,user):
 if address not in [state,state_set,0x4edc90]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:signed(read(sp+4+i*4));count=0;result=0
 if address==state:result=read(owner+0x50)
 elif address==state_set:
  count=1;write(owner+0x50,arg(0));calls.append(dict(operation='state',target=arg(0)))
 else:
  count=5;calls.append(dict(operation='sound',request=[arg(i) for i in range(5)]))
 cpu.reg_write(UC_X86_REG_EAX,result);cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for initial in [0,0x65,0x70,0x73,0x78,0x79,0x7b,0x7c,0x7d,0x7e,0x7f,0x80,0x81,0x88]:
 for flag in [0,1,99]:
  write(owner+0x50,initial);write(world+0x12418,flag);sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[]
  cpu.emu_start(0x4d6720,stop,count=1000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Skim failed to return')
  cases.append(dict(body=dict(state=initial),worldSkim=flag,output=dict(body=dict(state=read(owner+0x50)),calls=calls,worldSkim=read(world+0x12418))))
drowning=[]
write(vt+0xf8,0x4d1220)
for initial in [0x65,0x73,0x7b,0x81,0x87,0x88]:
 for submerged in [0,1,-1]:
  write(owner+0x50,initial);write(owner+0xbc,submerged)
  sp=stack+0xff00;cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESI,vt);cpu.reg_write(UC_X86_REG_EBX,state);calls=[]
  cpu.emu_start(0x4de7c2,0x4de7e6,count=1000)
  if cpu.reg_read(UC_X86_REG_EIP)!=0x4de7e6:raise RuntimeError('Drowning gate failed')
  drowning.append(dict(body=dict(state=initial,submerged=submerged),target=calls[0]['target'] if calls else None))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004D6720 and004F4FC0. Explicit state getter/entry and queued audio interfaces; captures request order, state and world+12418 flag. Drowning cases execute004DE7C2..004DE7E6 with original+F8 submerged getter and explicit state entry.',cases=cases,drowning=drowning),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} worm skim callbacks')
