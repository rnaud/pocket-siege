"""Capture original wind-meter drawing requests."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI
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

context=owner+0x20000;cpu.mem_map(context,0x20000);write(owner+0x38,context)

surface=owner+0x2000;vtable=owner+0x2100
write(context+0x2f0,surface);write(surface,vtable)
ops={0x14:('dimensions',2),0x3c:('rectangle',5),0x38:('line',4),0x4c:('strip',8),0x58:('pixel',3)}
for offset in ops:write(vtable+offset,stop+offset)
write(context+0xb0,1);write(context+0xb4,2)
calls=[]
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address-stop in ops:
  operation,count=ops[address-stop]
  if operation=='dimensions':write(read(sp+4),181);write(read(sp+8),17)
  else:calls.append({'operation':operation,'args':[signed(read(sp+4+i*4)) for i in range(count)]})
  ret(0,count*4)
 elif address==0x4f4410:ret(0,16)
 elif address==0x4edb70:ret(read(sp+4),4)
 elif address==0x4eed30:
  args=[signed(read(sp+4+i*4)) for i in range(9)];args[3]=0
  calls.append({'operation':'draw','args':args});ret(0,36)
cpu.hook_add(UC_HOOK_CODE,hook)
import itertools
cases=[]
for wind,phase,visibility in itertools.product([-65536,-21846,-18724,-1000,-1,0,1,1000,18724,21846,65536],range(0,65536,8192),[0,65536]):
 write(owner+0x104,wind);write(owner+0x1750,phase);write(owner+0x1754,visibility);write(context+0x1b8dc,640);write(context+0x1b8e0,480)
 calls.clear();sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4d2f90,stop+1,count=2000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('meter did not exit')
 cases.append({'input':dict(wind=wind,phase=phase,visibility=visibility,width=181,height=17,viewportWidth=640,viewportHeight=480),'calls':list(calls)})
ticks=[]
for current,target in itertools.product([-2147483648,-65536,-328,-327,-326,-1,0,1,326,327,328,65536,2147483647],repeat=2):
 write(owner+0x104,current);write(owner+0x108,target)
 sp=stack+0xf000
 for i,value in enumerate([stop,owner,0x3ea,0,0]):write(sp+4*i,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4d2b60,stop+1,count=2000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('meter tick did not exit')
 ticks.append({'current':current,'target':target,'result':signed(read(owner+0x104))})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004D2F90 with original clamp helper. Surface primitives and final draw captured; dimensions181x17 and palette slots8/9 explicit.','cases':cases,'ticks':ticks},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} wind-meter frames')
