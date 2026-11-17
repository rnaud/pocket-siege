"""Execute original team event42B next-worm selection."""
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

registry=context+0x1b94;record=owner+0x1000;calls=[]
def ret(cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def hook(cpu,address,size,user):
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4b26a0:
  calls.append({'operation':'event','event':read(sp+16)});ret(24)
 elif address==0x4c2b10:calls.append({'operation':'count'})
 elif address==0x4c2cc0:calls.append({'operation':'health','worm':read(sp+8)})
 elif address==0x4e5a50:
  selected=signed(read(sp+4));calls.append({'operation':'select','worm':selected});write(owner+0x4c,selected);ret(4)
cpu.hook_add(UC_HOOK_CODE,hook)
import itertools
cases=[]
for health in [[],[0],[100],[0,100,0],[100,0,100],[0,0,0],[1,-1,2147483647],[0,0,0,0,0,0,0,1]]:
 for previous in range(len(health)+1):
  for blocked,matching in itertools.product([0,1],[False,True]):
   write(owner+0x3c,2);write(owner+0x4c,previous);write(owner+0x7c,blocked);write(record,2 if matching else 1)
   write(registry+2*0x51c,len(health))
   for i,hp in enumerate(health,1):write(registry+2*0x51c+i*0x9c-0x538,hp)
   calls.clear();sp=stack+0xf000
   for i,value in enumerate([stop,owner,0x42b,0x124,record]):write(sp+4*i,value)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4e6810,stop+1,count=2000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('selection did not exit')
   cases.append({'input':dict(health=health,previous=previous,blocked=blocked,matching=matching),'result':dict(selected=signed(read(owner+0x4c)),blocked=read(owner+0x7c),calls=list(calls))})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004E6810 event42B with original count/health registry queries. Target449 captured;004E5A50 selection interface stores requested index, remaining selection side effects excluded.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} next-worm selections')
