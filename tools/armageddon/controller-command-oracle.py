"""Execute004E6810 movement, targeting and setting command branches with original controller writes."""
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

context=0x2300000;cpu.mem_map(context,0x20000);command=owner+0x1000
interfaces=[(0x4c32b0,2),(0x4c31a0,1),(0x4ef050,1),(0x4c29c0,1),(0x4ee7f0,12),(0x4b26f0,4),(0x4b26a0,6)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4c32b0,0x4c31a0,0x4ef050,0x4c29c0]:
  name,n,result={0x4c32b0:('busy',2,busy),0x4c31a0:('reset',1,0),0x4ef050:('visible',1,visible),0x4c29c0:('flags',1,flags)}[address]
  calls.append([name]+[signed(sp+4+i*4) for i in range(n)]);cpu.reg_write(UC_X86_REG_EAX,result)
 elif address==0x4ee7f0:calls.append(['effect']+[signed(sp+4+i*4) for i in range(12)])
 elif address==0x4b26f0:calls.append(['forward',read(sp+8),list(cpu.mem_read(read(sp+16),read(sp+12)))])
 elif address==0x4b26a0:calls.append(['send',read(sp+8),signed(sp+12),read(sp+16),list(cpu.mem_read(read(sp+24),read(sp+20)))])
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
offsets=[0x58,0xb4,0xb8,0xdc,0xe0,0xf8,0xfc,0x100];cases=[]
def run(event,bits=0,slot=1,xy=[-32768,32767],value=-1):
 global calls,busy,visible,flags
 busy=(bits>>4)&1;visible=(bits>>5)&1;flags=8 if bits&64 else 0;calls=[]
 cpu.mem_write(owner,bytes(0x200));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
 fields={0x3c:2,0x4c:3,0x40:0 if bits&2 else 1,0x48:(bits>>2)&1,0x54:7,0x64:slot,**{o:123 for o in offsets}}
 for o,v in fields.items():write(owner+o,v&0xffffffff)
 words=[1 if bits&1 else 2,4 if bits&8 else 3,0,17,4]
 if event in [0x3f9,0x3fa,0x3fb]:words[1]=value;words[2]=32769
 cpu.mem_write(command,bytes(20))
 for i,v in enumerate(words):write(command+i*4,v&0xffffffff)
 if event==0x41a:cpu.mem_write(command+8,struct.pack('<hh',*xy))
 length=20 if event==0x41a else 12 if event in [0x3f9,0x417,0x418,0x419] else 8 if event in [0x3fa,0x3fb] else 4
 payload=list(cpu.mem_read(command,length));sp=stack+0xf000
 for i,v in enumerate([stop,0,event,length,command]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4e6810,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(event=event,fields={str(k):v for k,v in fields.items()},payload=payload,busy=busy,visible=visible,flags=flags,calls=calls,body=[signed(owner+o) for o in offsets],target=[signed(context+o) for o in [0x1247c,0x12480]]))
for event in [0x3f9,0x3fa,0x3fb,*range(0x406,0x410),0x411,0x413,0x417,0x418,0x419]:
 for bits in range(32):run(event,bits)
for slot in [0,1,34,36,40,54,70]:
 for bits in range(128):run(0x41a,bits,slot)
for event in [0x3f9,0x3fa,0x3fb]:
 for value in [-2147483648,-65537,65537,2147483647]:run(event,value=value)
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E6810 command branches',offsets=offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} controller command cases')
