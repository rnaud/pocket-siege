"""Execute original004F8D50 Blowtorch entry with captured interfaces."""
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
position,attempt,clear,queue,suspend=[owner+0x5000+i*0x100 for i in range(5)]
world=0x2300000;cpu.mem_map(world,0x10000)
write(owner,vtable);write(owner+0x38,world);write(owner+0x354,record);write(owner+0x350,animation)
write(animation,animation_table);write(animation_table+0x14,clear);write(animation_table+0x1c,queue)
write(vtable+0x5c,position);write(vtable+0x100,attempt);write(vtable+0x6c,suspend)
fields={'x':0x90,'y':0x94,'field1f4':0x1f4,'field1f8':0x1f8,'field1fc':0x1fc,'field27c':0x27c,'remaining':0x290,'suspended':0x54}
def hook(cpu,address,size,user):
 if address not in [position,attempt,clear,queue,suspend,0x4faf90]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4);count=0
 if address==position:
  write(arg(0),read(owner+0x90));write(arg(1),read(owner+0x94));count=2
 elif address==0x4faf90:
  calls.append(dict(operation='launchSetup',value=arg(4)));count=5
 elif address==attempt:
  calls.append(dict(operation='tryPosition',request=[signed(arg(0)),signed(arg(1))]));count=2
  if accepted:write(owner+0x90,arg(0));write(owner+0x94,arg(1))
  cpu.reg_write(UC_X86_REG_EAX,accepted)
 elif address==clear:calls.append(dict(operation='clear'))
 elif address==queue:calls.append(dict(operation='queue',sprite=arg(0)));count=1
 elif address==suspend:
  calls.append(dict(operation='suspend',value=arg(0)));write(owner+0x54,arg(0));count=1
 cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for team,worm in [(1,0),(2,7)]:
 for x,y in [(0,0),(65535,65537),(-1,-65537),(2147483647,-2147483648),(100<<16,200<<16)]:
  for duration in [0,1,5000,-1]:
   for counter in [0,2147483647,-2147483648]:
    for accepted in [0,1]:
     body=dict(x=x,y=y,field1f4=71,field1f8=72,field1fc=73,field27c=74,remaining=123,suspended=0)
     stats=dict(counter58c=counter,counter590=counter)
     config={'0x7c':duration}
     for key,offset in fields.items():write(owner+offset,body[key])
     write(owner+0xfc,team);write(owner+0x100,worm);write(record+0x7c,duration)
     counters=world+0x1b94+team*0x51c+worm*0x9c
     write(counters-0x58c,counter);write(counters-0x590,counter)
     sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[]
     cpu.emu_start(0x4f8d50,stop,count=1000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Blowtorch entry failed to return')
     output=dict(body={key:signed(read(owner+offset)) for key,offset in fields.items()},stats=dict(counter58c=signed(read(counters-0x58c)),counter590=signed(read(counters-0x590))),calls=calls)
     cases.append(dict(body=body,stats=stats,record=config,accepted=accepted,output=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F8D50 with real004C3520/004C3560 counter updates; launch setup, position getter/attempt, animation and suspension interfaces captured. Position attempt acceptance supplied; full launch helper and collision manager are not executed.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} Blowtorch entries')
