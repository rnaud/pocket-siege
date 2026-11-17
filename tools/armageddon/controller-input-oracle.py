"""Execute full 005010E0 controller input collection; individual collectors and worm query are explicit interfaces."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]

context=0x2300000;cpu.mem_map(context,0x20000)
queue=0x7654321;calls=[];answers=[]
helpers=[(0x501ff0,'menu',1),(0x501370,'pointer',1),(0x5019c0,'keyboard',1),(0x502550,'weapon',1),(0x502220,'movement',1),(0x4c2d60,'wormState',2)]
for address,name,argc in helpers:
 cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
 def hook(cpu,address,size,user,name=name,argc=argc):
  sp=cpu.reg_read(UC_X86_REG_ESP);args=list(struct.unpack('<'+str(argc)+'i',cpu.mem_read(sp+4,argc*4)))
  calls.append([name,args]);cpu.reg_write(UC_X86_REG_EAX,answers.pop(0) if name=='wormState' else 0)
 cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
scenarios=[(7,7,0,7,[7], [101,101]),(7,7,0,7,[7],[100,100]),(7,7,0,7,[7],[101,100]),(7,7,0,7,[9,7],[101,101]),(7,7,0,-1,[7],[101,101]),(7,7,1,7,[7],[101,101]),(-1,-1,0,7,[7,7],[100,101]),(-1,255,0,7,[],[101,101]),(7,7,0,7,[],[101,101]),(7,7,0,8,[7],[101,101])]
for bits in range(64):
 for active,controller,replaying,key,controllers,state_results in scenarios:
  fields={0x38:context,0x3c:2,0x40:bits&1,0x44:controller,0x48:(bits>>2)&1,0x4c:3,0x70:(bits>>1)&1,0x74:(bits>>3)&1,0x84:(bits>>4)&1,0xac:(bits>>5)&1,0xf0:key}
  for offset,value in fields.items():write(owner+offset,value & 0xffffffff)
  cpu.mem_write(context+0x11d7c,bytes([active&255]));write(context+0x1d444,replaying)
  cpu.mem_write(context+0x1b8aa,struct.pack('<h',len(controllers)))
  for i,value in enumerate(controllers):cpu.mem_write(context+0x1b88a+i*2,struct.pack('<h',value))
  calls=[];answers=state_results.copy();sp=stack+0xf000;write(sp,stop);write(sp+4,queue)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x5010e0,stop,count=1000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(fields={str(k):v for k,v in fields.items() if k!=0x38},active=active,replaying=replaying,controllers=controllers,stateResults=state_results,queue=queue,calls=calls))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='005010E0',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} controller input collection cases')
