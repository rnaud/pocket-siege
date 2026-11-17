"""Execute original worm poison state and damage decisions."""
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

vt=owner+0x1000;payload=owner+0x2000
write(owner,vt);write(vt+0x7c,0x4d0ff0)
fields={'team':0xfc,'worm':0x100,'state':0x50,'latched':0x144,'amount':0x148}
calls=[];hp=0;boundary=0x4db56f

def ret(cleanup,value=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp)
 cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def hook(cpu,address,size,user):
 if address in [boundary,0x4db56f]:cpu.emu_stop();return
 if address==0x4c2cc0:ret(8,hp)
 elif address==0x4d8440:
  sp=cpu.reg_read(UC_X86_REG_ESP);calls.append([signed(read(sp+i)) for i in [4,8,12]]);ret(12)
cpu.hook_add(UC_HOOK_CODE,hook)
def run(body,entry,end,record):
 global boundary
 boundary=end;calls.clear()
 for key,off in fields.items():write(owner+off,body[key])
 for i,v in enumerate(record):write(payload+i*4,v)
 sp=stack+0xf000
 for reg,value in [(UC_X86_REG_ESP,sp),(UC_X86_REG_EDI,owner),(UC_X86_REG_ESI,vt),(UC_X86_REG_EBX,payload)]:cpu.reg_write(reg,value)
 cpu.emu_start(entry,stop,count=1000)
 if cpu.reg_read(UC_X86_REG_EIP) not in [end,0x4db56f]:raise RuntimeError('Unexpected exit')
 return {'body':{key:signed(read(owner+off)) for key,off in fields.items()},'calls':list(calls)}
cases=[]
for state in [0x65,0x6f,0x88]:
 for amount in [-1,0,5,2147483647]:
  for latched in [0,1]:
   body=dict(team=2,worm=3,state=state,amount=amount,latched=latched)
   cases.append({'operation':'reset','input':body,'result':run(body,0x4dadc9,0x4db56f,[])})
   for hp in [0,1,3,100,2147483647]:
    cases.append({'operation':'tick','input':body,'hp':hp,'result':run(body,0x4daec8,0x4db56f,[])})
   for team in [1,2]:
    for category in [1,2,4,5]:
     record=[team,7,category]
     cases.append({'operation':'pickup','input':body,'record':record,'result':run(body,0x4da0a7,0x4db56f,record)})
   for amountAdded in [-1,0,5]:
    cases.append({'operation':'infect','input':body,'added':amountAdded,'result':run(body,0x4db44b,0x4db49d,[amountAdded])})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Original420 latch reset,426 damage decision and3EF cure branches;439 state prefix before report/text. Native state getter executes unchanged; HP lookup and damage interface captured.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} poison cases')
