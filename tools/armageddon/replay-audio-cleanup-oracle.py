"""Execute full 00496EA0 replay-entry audio cleanup; only DirectSound interfaces are substituted."""
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

vtable, query, release = owner+0x2000, stop+0x100, stop+0x200
write(vtable+0x24,query);write(vtable+8,release)
cpu.mem_write(query,b'\xc2\x08\x00');cpu.mem_write(release,b'\xc2\x04\x00')
calls=[];statuses=[]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);buffer=read(sp+4);index=(buffer-owner-0x4000)//0x100
 if address==query:
  calls.append(['query',index]);result,flags=statuses[index];write(read(sp+8),flags);cpu.reg_write(UC_X86_REG_EAX,result & 0xffffffff)
 else:
  calls.append(['release',index]);cpu.reg_write(UC_X86_REG_EAX,0)
cpu.hook_add(UC_HOOK_CODE,hook,begin=query,end=query)
cpu.hook_add(UC_HOOK_CODE,hook,begin=release,end=release)
cases=[]
for mask in [0,1,128,85,170,255]:
 for handle in [-2,-1,0,1,31]:
  for result in [0,1,-1]:
   for flags in [0,1,2,3]:
    channels=[];statuses=[]
    for i in range(8):
     buffer=owner+0x4000+i*0x100;write(buffer,vtable)
     words=[i+70,handle,i+20,i+30,i+40,buffer if mask & (1<<i) else 0]
     for j,value in enumerate(words):write(owner+0x14+i*24+j*4,value & 0xffffffff)
     channels.append(words);statuses.append([result,flags])
    calls=[];sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x496ea0,stop,count=1000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    after=[list(struct.unpack('<6i',cpu.mem_read(owner+0x14+i*24,24))) for i in range(8)]
    cases.append(dict(channels=channels,statuses=statuses,result=cpu.reg_read(UC_X86_REG_EAX),after=after,calls=calls))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='00496EA0',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} replay audio cleanup cases')
