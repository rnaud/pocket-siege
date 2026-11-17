"""Execute004E6420 targeting entry with worm and camera interfaces."""
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
worm=owner+0x1000;vtable=worm+0x100;write(worm,vtable);write(vtable+12,stop+0x100)
for address,argc in [(0x4c2d60,2),(0x4ccf50,2),(0x4eea10,1),(0x4eeb70,2),(stop+0x100,3)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4c2d60:calls.append(['state',read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,state)
 elif address==0x4ccf50:calls.append(['lookup',read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,worm)
 elif address==stop+0x100:
  calls.append(['query',read(sp+4),read(sp+8)]);p=read(sp+12);cpu.mem_write(p,bytes(0x154));write(p,position[0]&0xffffffff);write(p+4,position[1]&0xffffffff)
 elif address==0x4eea10:calls.append(['mode',read(sp+4)])
 elif address==0x4eeb70:calls.append(['target',signed(sp+4),signed(sp+8)])
for address in [0x4c2d60,0x4ccf50,0x4eea10,0x4eeb70,stop+0x100]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[];offsets=[0xac,0xbc,0xb0,0xb4,0xe8]
for state in [100,0x65]:
 for active in [2,3,-1]:
  for direction in [0,1]:
   for handle in [-1,9]:
    for priorities in [[],[4,3,1],[2,1]]:
     for free in [[],[10,11]]:
      cpu.mem_write(owner,bytes(0x200));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
      fields={0x3c:2,0x4c:3,0x44:2,0x98:direction,0xdc:-3,0xac:5,0xbc:6,0xe8:handle}
      for offset,value in fields.items():write(owner+offset,value&0xffffffff)
      write(context+0x804,696);cpu.mem_write(context+0x11d7c,struct.pack('<b',active))
      xy=[100*65536+123,700*65536+456];position=[-65537,0x80000001]
      for o,v in zip([0x1247c,0x12480],xy):write(context+o,v)
      for start,count,values in [(0x1b778,0x1b798,free),(0x1b7ba,0x1b7da,list(range(20,20+len(priorities))))]:
       cpu.mem_write(context+count,struct.pack('<h',len(values)))
       for i,value in enumerate(values):cpu.mem_write(context+start+2*i,struct.pack('<h',value))
      for i,value in enumerate(priorities):cpu.mem_write(context+0x1b79a+2*i,struct.pack('<h',value))
      initial=list(cpu.mem_read(context+0x1b778,0x64));calls=[]
      sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
      cpu.emu_start(0x4e6420,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
      cases.append(dict(fields={str(k):v for k,v in fields.items()},active=active,state=state,xy=xy,position=position,initial=initial,calls=calls,output=list(cpu.mem_read(context+0x1b778,0x64)),body=[signed(owner+o) for o in offsets],target=[signed(context+o) for o in [0x1247c,0x12480]]))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E6420',offsets=offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} targeting entry cases')
