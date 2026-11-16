"""Execute original worm direct-hit response instructions in Unicorn.

Original receiver/getters execute with supplied post-impulse velocity.
State, blood, health and sound requests are captured. Original voice RNG executes. No game entry point runs.
"""
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




context=0x2300000;cpu.mem_map(context,0x20000);vtable=owner+0x2000;packet=owner+0x3000;set_state=owner+0x4000;sound=owner+0x4100
write(owner+0x38,context);write(owner,vtable);write(context+0x814,1)
# Audio allocation is captured; original voice selection and RNG execute.
write(context+0x7f0,24);write(context+0x11d40,13)
for offset,address in [(0x5c,0x4d0f50),(0x60,0x4d0f70),(0x108,0x4d12d0),(0x7c,0x4d0ff0),(0x80,set_state),(0xec,0x4d11c0),(0x104,0x4d12b0),(0x48,sound)]:write(vtable+offset,address)
for addr,n in [(set_state,4),(sound,16),(0x4f4410,16),(0x4d9670,20),(0x4d8440,12),(0x4edaf0,8),(0x4edc30,4),(0x4edb90,20)]:cpu.mem_write(addr,b'\xc2'+struct.pack('<H',n))
output=[]
def capture(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4f4410:output.append(dict(base=True))
 elif address==0x4edaf0:
  values=list(struct.unpack('<2i',cpu.mem_read(sp+4,8)));output.append(dict(lookup=values));cpu.reg_write(UC_X86_REG_EAX,0x10000+values[1])
 elif address==0x4edc30:output.append(dict(stop=read(sp+4)))
 elif address==0x4edb90:
  output.append(dict(play=list(struct.unpack('<5i',cpu.mem_read(sp+4,20)))));cpu.reg_write(UC_X86_REG_EAX,1234)
 elif address==set_state:
  value=read(sp+4);write(owner+0x50,value);output.append(dict(state=value))
 elif address==sound:output.append(dict(sound=list(struct.unpack('<4i',cpu.mem_read(sp+4,16)))))
 elif address==0x4d8440:output.append(dict(health=list(struct.unpack('<3i',cpu.mem_read(sp+4,12)))))
 else:output.append(dict(blood=list(struct.unpack('<5i',cpu.mem_read(sp+4,20)))))
for addr in [set_state,sound,0x4f4410,0x4d9670,0x4d8440,0x4edaf0,0x4edc30,0x4edb90]:cpu.hook_add(UC_HOOK_CODE,capture,begin=addr,end=addr)
cases=[]
for frame,last in [(0,0),(24,0),(25,0),(100,76),(101,76),(0x80000000,0x7fffffff),(0,0xffffffe7)]:
 for handle in [0,99]:
  for seed in [0,42,123]:
   output=[]
   for offset,value in [(0x50,0x65),(0xb0,0),(0x160,0),(0x2c0,last),(0x38c,handle),(0xfc,2)]:write(owner+offset,value)
   write(context+0x7f0,frame);write(context+0x1acc,seed)
   for i,value in enumerate([3,300000,400000,1234,5678,25]):write(packet+i*4,value)
   sp=stack+0xf000
   for i,value in enumerate([stop,0,0x433,0x124,packet]):write(sp+i*4,value)
   cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4d97f0,stop,count=20000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Receiver did not return')
   calls=[v for v in output if any(k in v for k in ['lookup','stop','play'])]
   cases.append(dict(frame=frame,last=last,handle=handle,seed=seed,calls=calls,resultFrame=read(owner+0x2c0),resultHandle=read(owner+0x38c),random=read(context+0x1acc)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004D97F0 event0x433 voice branch',method='Original cooldown, selection, RNG; supplied voice lookup and audio handles.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} direct-hit voice cases')
