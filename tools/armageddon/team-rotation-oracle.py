"""Execute original team rotation initialization and normal/deployment selection."""
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

import random
registry=context+0x1b94
calls=[]
def hook(cpu,address,size,user):
 if address==stop:cpu.emu_stop();return
 if address in [0x4c2c40,0x4c3a90]:
  calls.append({'operation':'health' if address==0x4c2c40 else 'deployment','team':read(cpu.reg_read(UC_X86_REG_ESP)+4)})
cpu.hook_add(UC_HOOK_CODE,hook)
def byte(address,value):cpu.mem_write(address,bytes([value&255]))
def run(entry):
 sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);calls.clear()
 cpu.emu_start(entry,stop+1,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('rotation did not exit')
 return {'group':signed(read(owner+0xe8)),'cursors':[signed(read(owner+0xec+4*i)) for i in range(6)]}
reset=[]
for groups in range(7):
 for initialGroup in [-1,0,5,127,128,255]:
  initial=[9]*6;starts=[-1,0,1,5,127,255]
  byte(context+0x114e0,groups);byte(context+0x11b96,initialGroup)
  for i in range(6):write(owner+0xec+4*i,initial[i]);byte(context+0x113c4+(i+1)*0x11e,starts[i])
  reset.append({'input':dict(groups=groups,initialGroup=initialGroup,cursors=initial,starts=starts),'result':run(0x4b36b0)})
rng=random.Random(4321)
cases=[]
for sample in range(300):
 count=rng.randint(1,6);groups=rng.randint(1,6);group=rng.randrange(groups)
 cursors=[rng.randint(1,count) for i in range(6)]
 teams=[dict(group=rng.choice(list(range(groups))+[255]),unavailable=rng.choice([0,0,1]),eliminated=rng.choice([0,0,1]),worms=[dict(hp=rng.choice([0,1,100,2147483647]),state=rng.choice([100,101,137])) for j in range(rng.randint(0,3))]) for i in range(count)]
 for deployment in [False,True]:
  write(owner+0xe4,count);write(owner+0xe8,group);byte(context+0x114e0,groups)
  for i in range(6):write(owner+0xec+i*4,cursors[i])
  for i,team in enumerate(teams,1):
   byte(context+i*3000+0x3cd3,team['group']);byte(context+i*3000+0x3cd2,team['unavailable'])
   write(registry+i*0x51c-12,team['eliminated']);write(registry+i*0x51c,len(team['worms']))
   for j,worm in enumerate(team['worms']):
    write(registry+i*0x51c-0x49c+j*0x9c,worm['hp']);write(registry+i*0x51c-0x4f8+j*0x9c,worm['state'])
  result=run(0x4b37f0 if deployment else 0x4b38c0)
  result.update(team=cpu.reg_read(UC_X86_REG_EAX),calls=list(calls))
  cases.append({'input':dict(groups=groups,group=group,cursors=cursors,teams=teams,deployment=deployment),'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004B36B0,004B38C0 and004B37F0 with original health and deployment registry queries. No substituted interfaces; query calls recorded. Valid nonzero group/team counts for selection.','reset':reset,'cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(reset)} initializations and {len(cases)} selections')
