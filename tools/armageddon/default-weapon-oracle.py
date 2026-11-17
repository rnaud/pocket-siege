"""Execute004E54D0/004E55D0 with original descriptor decoding; inventory and task dispatch are interfaces."""
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

import random
rng=random.Random(0x4e55d0)
context=0x2300000;cpu.mem_map(context,0x20000);descriptor=owner+0x1000
interfaces=[(0x4c2d60,2),(0x4c31c0,2),(0x4edad0,1),(0x4c2ee0,2),(0x4c29c0,1),(0x4c2fb0,3),(0x4c31f0,3),(0x4b26a0,6),(0x4edc90,5)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4c2d60,0x4c31c0,0x4c2ee0,0x4c29c0]:
  name,n,result={0x4c2d60:('state',2,state),0x4c31c0:('selected',2,selected),0x4c2ee0:('available',2,int(read(sp+8) in inventory)),0x4c29c0:('flags',1,flags)}[address]
  calls.append([name]+[signed(sp+4+i*4) for i in range(n)]);cpu.reg_write(UC_X86_REG_EAX,result)
 elif address==0x4edad0:
  slot=read(sp+4);calls.append(['descriptor',slot]);cpu.mem_write(descriptor,bytes(0x200))
  for o,v in descriptors.get(slot,{}).items():write(descriptor+o,v&0xffffffff)
  cpu.reg_write(UC_X86_REG_EAX,descriptor)
 elif address in [0x4c2fb0,0x4c31f0]:calls.append(['ammo' if address==0x4c2fb0 else 'inventory']+[signed(sp+4+i*4) for i in range(3)])
 elif address==0x4edc90:calls.append(['sound']+[signed(sp+4+i*4) for i in range(5)])
 elif address==0x4b26a0:
  p=read(sp+24)
  if p:calls.append(['command']+[signed(p+i*4) for i in range(4)]+[read(sp+20)])
  else:calls.append(['send']+[signed(sp+4+i*4) for i in range(1,6)])
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for iteration in range(240):
 state=[100,0x65,0x78,0x79,0x7b,0x7c,0x7d,0x88][iteration%8];flags=4 if iteration%3==0 else 0;selected=[0,1,7,40][iteration%4]
 inventory=rng.sample(range(1,71),iteration%12);descriptors={}
 for slot in set([*inventory,selected]):
  descriptors[slot]={0x4c:rng.randrange(2),0x68:rng.randrange(1,5),0x70:rng.choice([2,3,4]),0x7c:rng.randrange(2),0x84:2,0xdc:rng.randrange(3),0xf0:rng.randrange(3)}
 controller=-1 if iteration%5==0 else 2;saved=7 if iteration%7==0 else 0
 for routine in [0x4e55d0,0x4e54d0,0x4e5a50]:
  cpu.mem_write(owner,bytes(0x200));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
  for o,v in [(0x3c,2),(0x4c,3),(0x44,controller),(0x40,1),(0xf0,-1),(0xe8,-1)]:write(owner+o,v&0xffffffff)
  write(context+0x4730+(2*75+4)*40,saved);calls=[]
  sp=stack+0xf000;write(sp,stop);write(sp+4,4);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(routine,stop,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(routine=hex(routine),controller=controller,saved=saved,state=state,flags=flags,selected=selected,inventory=inventory,descriptors={str(k):{str(o):v for o,v in d.items()} for k,d in descriptors.items()},calls=calls,result=cpu.reg_read(UC_X86_REG_EAX) if routine==0x4e55d0 else None))
args.output.write_text(json.dumps(dict(executableSha256=digest,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} default-weapon cases')
