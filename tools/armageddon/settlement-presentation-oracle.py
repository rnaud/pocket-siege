"""Execute original turn-settlement presentation gates."""
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
fields={'activeTeam':(owner,0x128),'panelProgress':(owner,0x74),'panelTarget':(owner,0x78),'activity':(context,0x1ac8),'mode':(context,0x814),'rate':(context,0x818),'turnFlag':(context,0x1d43c),'refreshHealth':(context,0x1b9c),'refreshTeams':(context,0x1b98)}
queries={0x4ec190:'health',0x4ec290:'sort',0x4ebfe0:'death',0x4eca20:'announcements',0x4ec2d0:'removal'}
actions={0x4ec5d0:'showPanel',0x4ec200:'revealHealth',0x4c30f0:'refreshHealth',0x4c30d0:'refreshTeams',0x4ec2b0:'sortTeams',0x4ec060:'startDeath',0x4ec2f0:'removeTeam'}
stops=[0x4b6ff2,0x4b701c,0x4b7098,0x4b70d3,0x4b7771,0x4b70de]
calls=[];inputs={}
def ret(value=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 if address in stops:cpu.emu_stop();return
 if address in queries:
  name=queries[address];calls.append(name);ret(inputs[name])
 elif address in actions:
  calls.append(actions[address])
  # Panel setter and registry refresh helpers execute unmodified.
  if address not in [0x4ec5d0,0x4c30f0,0x4c30d0]:ret()
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for bits in range(64):
 for active in [0,2]:
  inputs={name:(bits>>i)&1 for i,name in enumerate(queries.values())}
  body={'activeTeam':active,'panelProgress':65536 if bits&32 else 32768,'panelTarget':0,'activity':7,'mode':8,'rate':9,'turnFlag':10,'refreshHealth':11,'refreshTeams':12}
  for k,(address,offset) in fields.items():write(address+offset,body[k])
  calls.clear();cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xf000)
  cpu.emu_start(0x4b6fb5,stop,count=1000)
  end=cpu.reg_read(UC_X86_REG_EIP)
  if end not in stops:raise RuntimeError('Gate block did not exit')
  after={k:signed(read(address+offset)) for k,(address,offset) in fields.items()}
  cases.append({'input':dict(body,**inputs),'result':{'body':after,'calls':list(calls),'ready':end==0x4b70de}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004B6FB5..004B70DE','method':'Original controller branch block; query results explicit, presentation actions captured. Panel setter004EC5D0 and registry refresh004C30F0/004C30D0 execute unchanged. Stops at original returns or continuation.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} settlement presentation decisions')
