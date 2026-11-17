"""Execute full 00502220 movement input with original key classification and queue writes; external input/registry/worm queries are interfaces."""
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

context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
keyboard=owner+0x1000;vtable=owner+0x3000;queue=owner+0x4000;ring=owner+0x4100;buffer=owner+0x5000
write(context+4,keyboard);write(keyboard,vtable);write(vtable+4,stop+0x100);write(vtable+12,stop+0x110);write(queue+4,ring)
for address,argc in [(stop+0x100,1),(stop+0x110,1),(0x4c2d60,2),(0x4c32b0,2)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
calls=[];keys=[];answers=[];busy=0

def hook(cpu,address,size,user):
 global keys
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4c2d60:
  calls.append(['state',read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,answers.pop(0))
 elif address==0x4c32b0:
  calls.append(['busy',read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,busy)
 elif address==stop+0x100:
  key=read(sp+4);calls.append(['key',key]);cpu.reg_write(UC_X86_REG_EAX,int(key in keys))
 elif address==stop+0x110:
  key=read(sp+4);calls.append(['consume',key]);keys=[k for k in keys if k!=key];cpu.reg_write(UC_X86_REG_EAX,0)
for address in [0x4c2d60,0x4c32b0,stop+0x100,stop+0x110]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
def events():
 result=[];node=read(ring+0x18)
 while node:
  length=read(node);result.append([read(node+8),list(cpu.mem_read(node+12,length-4))]);node=read(node+4)
 return result
cases=[]
for state in [0x65,0x73,0x78,0x79,0x7b,0x7c,0x7d]:
 for bits in range(8):
  for keybits in range(32):
   # All primary/secondary combinations plus individual and simultaneous auxiliary keys.
   auxiliary=[[],[0x28],[0x24],[0x25],[0x22],[0x23],[0x1a],[0x28,0x24,0x25,0x22,0x23,0x1a]][keybits>>2]
   keys=([0x1b] if keybits&1 else [])+([0x1d] if keybits&2 else [])+auxiliary
   input_keys=keys.copy();capacity=[16,32,64,256][len(cases)%4]
   states=[state,0x78 if bits&4 else 0x65];answers=states.copy();busy=(keybits>>2)&1
   fields={0x3c:2,0x4c:3,0x64:bits&1,0x108:(bits>>1)&1,0xac:0,0xe4:0}
   # Include both early-return gates without losing the ordinary matrix.
   variants=[(0,0)] + ([(1,0),(0,1)] if keybits==31 else [])
   for ac,e4 in variants:
    fields[0xac]=ac;fields[0xe4]=e4;keys=input_keys.copy();answers=states.copy()
    for offset,value in fields.items():write(owner+offset,value)
    cpu.mem_write(ring,bytes(32));write(ring+4,buffer);write(ring+8,capacity);cpu.mem_write(buffer,bytes(capacity));calls=[]
    sp=stack+0xf000;write(sp,stop);write(sp+4,queue);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x502220,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(fields={str(k):v for k,v in fields.items()},states=states,busy=busy,keys=input_keys,capacity=capacity,calls=calls,events=events(),latch=read(owner+0x108)))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='00502220',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} controller movement input cases')
