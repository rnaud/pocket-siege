"""Execute original worm pickup latch, query gate and post-tick clearing."""
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

vt=owner+0x1000;query=stop+0x100;payload=owner+0x2000
write(owner,vt);write(vt+0x4c,query);write(vt+0x7c,0x4d0ff0)
fields={'team':0xfc,'worm':0x100,'field104':0x104,'field154':0x154,'field188':0x188,'state':0x50}
calls=[];boundary=stop;query_result=0;contact_mode=False
def hook(cpu,address,size,user):
 if address==boundary or (contact_mode and address in [0x4d6e45,0x4d6ef6,0x4d7432]):
  cpu.emu_stop();return
 if address==query:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  calls.append([signed(read(sp+4+i*4)) for i in range(3)])
  cpu.reg_write(UC_X86_REG_EAX,query_result&0xffffffff)
  cpu.reg_write(UC_X86_REG_ESP,sp+16);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
def run(body,entry,end):
 global calls,boundary
 calls=[];boundary=end
 for key,off in fields.items():write(owner+off,body[key])
 sp=stack+0xf000;write(sp,stop)
 for reg,value in [(UC_X86_REG_ESP,sp),(UC_X86_REG_ECX,owner),(UC_X86_REG_EDI,owner),(UC_X86_REG_ESI,vt),(UC_X86_REG_EBX,payload)]:cpu.reg_write(reg,value)
 cpu.emu_start(entry,stop,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP)!=end:raise RuntimeError('Unexpected pickup exit')
 return dict(body={key:signed(read(owner+off)) for key,off in fields.items()},calls=calls.copy())
cases=[]
for state in [0x65,0x6f,0x77,0x79,0x7a,0x7e,0x80,0x87,0x88]:
 for active in [0,1]:
  for flag in [0,1,-1]:
   for blocked in [0,1]:
    body=dict(team=2,worm=3,field104=active,field154=flag,field188=blocked,state=state)
    cases.append(dict(input=body,result=run(body,0x4de0e4,0x4de12e)))
events=[]
for team,worm in [(2,3),(1,3),(2,4),(-1,-1)]:
 for flag in [0,1,-1]:
  body=dict(team=2,worm=3,field104=0,field154=flag,field188=0,state=0x65)
  write(payload,team);write(payload+4,worm)
  events.append(dict(input=body,record=[team,worm],result=run(body,0x4db0c6,0x4db56f)))
queries=[]
for flag in [0,1,-1]:
 for query_result in [0,1,5,-1]:
  body=dict(team=2,worm=3,field104=0,field154=flag,field188=0,state=0x65)
  result=run(body,0x4ddab0,stop)
  result['value']=signed(cpu.reg_read(UC_X86_REG_EAX))
  queries.append(dict(input=body,query_result=query_result,result=result))
contacts=[];contact_mode=True
other=owner+0x3000;other_vt=owner+0x4000
write(other,other_vt);write(other_vt+0x50,0x4d0ef0)
for state in [0x65,0x6e,0x73,0x78,0x79,0x80,0x88]:
 for kind in [1,2,10,11,12,17]:
  for flag in [0,1,-1]:
   for query_result in [0,1,5]:
    body=dict(team=2,worm=3,field104=1,field154=flag,field188=0,state=state)
    for key,off in fields.items():write(owner+off,body[key])
    write(other+0x3c,kind)
    calls=[];boundary=stop;sp=stack+0xf000
    for i,value in enumerate([stop,other,1]):write(sp+i*4,value)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4d6e30,stop,count=10000)
    end=cpu.reg_read(UC_X86_REG_EIP)
    if end not in [0x4d6e45,0x4d6ef6,0x4d7432]:raise RuntimeError('Unexpected contact prefix exit')
    contacts.append(dict(input=body,otherType=kind,query_result=query_result,calls=calls.copy(),intercept=end==0x4d7432))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004DE0E4..004DE12E tick gate/clear,004DB0C6..004DB56F event42F and complete004DDAB0 wrapper. Native state getter unchanged; pickup query is an explicit captured interface. Other task tick effects are outside the captured slice.',cases=cases,events=events,queries=queries,contacts=contacts),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} ticks, {len(events)} events, {len(queries)} query gates and {len(contacts)} contacts')
