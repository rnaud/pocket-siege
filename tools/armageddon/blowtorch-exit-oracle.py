"""Execute original004F9160 Blowtorch exit with captured interfaces."""
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


vtable,record,animation,animation_table=owner+0x1000,owner+0x2000,owner+0x3000,owner+0x4000
position,attempt,probe,clear,queue,suspend=[owner+0x5000+i*0x100 for i in range(6)]
write(owner,vtable);write(owner+0x354,record);write(owner+0x350,animation)
write(animation,animation_table);write(animation_table+0x14,clear);write(animation_table+0x18,queue)
for offset,address in [(0x5c,position),(0x100,attempt),(0xfc,probe),(0x6c,suspend)]:write(vtable+offset,address)
fields={'x':0x90,'y':0x94,'aim':0x260,'suspended':0x54,'field19c':0x19c}
def hook(cpu,address,size,user):
 global cursor
 if address not in [position,attempt,probe,clear,queue,suspend]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4);count=0
 if address==position:
  write(arg(0),read(owner+0x90));write(arg(1),read(owner+0x94));count=2
 elif address==probe:
  calls.append(dict(operation='probe',request=[signed(arg(0)),signed(arg(1))]));count=2
  cpu.reg_write(UC_X86_REG_EAX,occupied)
 elif address==attempt:
  calls.append(dict(operation='tryPosition',request=[signed(arg(0)),signed(arg(1))]));count=2
  accepted=pattern[cursor];cursor+=1
  if accepted:write(owner+0x90,arg(0));write(owner+0x94,arg(1))
  cpu.reg_write(UC_X86_REG_EAX,accepted)
 elif address==clear:calls.append(dict(operation='clear'))
 elif address==queue:
  calls.append(dict(operation='queueControlled',sprite=arg(0),progress=signed(arg(1))));count=2
 elif address==suspend:
  calls.append(dict(operation='suspend',value=arg(0)));write(owner+0x54,arg(0));count=1
 cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for x,y in [(0,0),(100<<16,200<<16),(-1,-65537),(2147483647,2147483647)]:
 for aim in [0,32768,65536,-1]:
  for occupied in [0,1]:
   for pattern in [[0],[1,0],[1,1,1,0]]:
    for prior in [0,5]:
     body=dict(x=x,y=y,aim=aim,suspended=1,field19c=prior)
     config={'0x68':4,'0x6c':11}
     for key,offset in fields.items():write(owner+offset,body[key])
     for key,value in config.items():write(record+int(key,16),value)
     sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[];cursor=0
     cpu.emu_start(0x4f9160,stop,count=1000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Blowtorch exit failed to return')
     output=dict(body={key:signed(read(owner+offset)) for key,offset in fields.items()},calls=calls)
     cases.append(dict(body=body,record=config,occupied=occupied,pattern=pattern,attemptCount=cursor,output=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F9160 plus native004FA490 weapon animation selection. Position getter, suspension, probe, placement acceptance and animation interfaces captured; full collision manager is not executed.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} Blowtorch exits')
