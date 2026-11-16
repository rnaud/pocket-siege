"""Execute original004D3660 Dragon Ball events with captured interfaces."""
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
owner, stack, stop, world = 0x2000000, 0x2100000, 0x2200000, 0x2300000
for address in [owner, stack, stop]: cpu.mem_map(address,0x10000)
cpu.mem_map(world,0x20000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v): return v if v<0x80000000 else v-0x100000000
vtable,terrain,terrain_table,delete,solid= [owner+0x1000+i*0x1000 for i in range(5)]
write(owner,vtable);write(vtable,delete);write(owner+0x38,world)
write(world+0x24,terrain);write(terrain,terrain_table);write(terrain_table+0x28,solid)
fields={'x':0x3c,'y':0x40,'progress':0x44,'remaining':0x60,'direction':0x74,'sprite':0x50}
def hook(cpu,address,size,user):
 if address not in [delete,solid,0x4d34d0,0x4ee990,0x4eebe0,0x4ee7f0,0x4eedf0]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:signed(read(sp+4+i*4));cleanup=0
 if address==0x4d34d0:
  calls.append(dict(operation='hit'));cpu.reg_write(UC_X86_REG_EAX,hit)
 elif address==solid:
  calls.append(dict(operation='terrain',request=[arg(0),arg(1)]));cleanup=8;cpu.reg_write(UC_X86_REG_EAX,blocked)
 elif address==0x4eebe0:calls.append(dict(operation='schedule'))
 else:
  operation,count={delete:('delete',1),0x4ee990:('camera',3),0x4ee7f0:('particle',12),0x4eedf0:('render',6)}[address]
  calls.append(dict(operation=operation,request=[arg(i) for i in range(count)]));cleanup=count*4
 cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for event in [0x3ea,0x3eb,0x999]:
 for remaining in [-2147483648,-1,0,1,20,21,1000]:
  for direction in [-65536,0,65536]:
   for x in [-100*65536,100*65536,0x7fffffff]:
    for hit,blocked in [(0,0),(0,1),(1,0)]:
     body=dict(x=x,y=-65537,progress=0x7ffffffe,remaining=remaining,direction=direction,sprite=676)
     bounds=dict(left=0,right=200*65536)
     for key,offset in fields.items():write(owner+offset,body[key])
     write(world+0x1b8cc,bounds['left']);write(world+0x1b8d0,bounds['right'])
     sp=stack+0xff00
     for i,value in enumerate([stop,0,event,0,0]):write(sp+i*4,value)
     cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[]
     cpu.emu_start(0x4d3660,stop,count=10000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Dragon Ball event did not return')
     output={key:signed(read(owner+offset)) for key,offset in fields.items()}
     cases.append(dict(body=body,event=event,bounds=bounds,hit=hit,solid=blocked,output=dict(body=output,calls=calls)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004D3660; hit scan and terrain result supplied; render, camera, scheduler, particle and deletion captured. Constructor and hit receiver are outside this oracle.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} Dragon Ball events')
