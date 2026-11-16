"""Execute original004EBA80 natural mine/barrel selection with original weighted point pool and RNG."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EBP
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

context=0x3000000;cpu.mem_map(context,0x20000);scheme=0x3100000;cpu.mem_map(scheme,0x10000)
write(owner+0x38,context);pool=owner+0x1000;entries=owner+0x2000;write(context+0x44c,pool);write(pool+0xc,entries)
def signed(v):return v if v<0x80000000 else v-0x100000000
calls=[]
def hook(cpu,address,size,user):
 if address not in [0x4ccf50,0x492550,0x4e9400,0x4d0d30]:return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4ccf50:n=8;cpu.reg_write(UC_X86_REG_EAX,owner+0x500)
 elif address==0x492550:n=0;cpu.reg_write(UC_X86_REG_EAX,owner+0x6000)
 elif address==0x4e9400:
  n=20;record=read(sp+8);payload=read(sp+12)
  calls.append(dict(kind='mine',record=[signed(read(record+i*4)) for i in range(8)],payload=[signed(read(payload+i*4)) for i in range(11)],settle=read(sp+16),placed=read(sp+20)))
 else:
  n=16;calls.append(dict(kind='barrel',x=signed(read(sp+8)),y=signed(read(sp+12)),settle=read(sp+16)))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+n);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
points=[dict(position=((100+i*70)<<16)|(200+i*5),weight=i%4+1) for i in range(12)]
cases=[]
for reserve in [0,6]:
 for count in [0,3,20]:
  for kind in [0,1,2]:
   for edges in [0,1]:
    for fuse in [-1,3]:
     for seed in [0,42]:
      write(pool+4,len(points))
      for i,p in enumerate(points):write(entries+i*8,p['position']);write(entries+i*8+4,p['weight'])
      cpu.mem_write(context+0x4886,b'\x01');cpu.mem_write(context+0x543c,bytes([reserve]));cpu.mem_write(context+0x11d50,bytes([kind,edges]));cpu.mem_write(scheme+0xd5a6,bytes([fuse&255,count]));write(context+0x1241c,seed)
      calls=[];sp=stack+0xff00;write(sp,stop);write(sp+4,scheme);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
      cpu.emu_start(0x4eba80,stop,count=100000)
      if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Natural placement did not finish')
      remaining=[dict(position=read(entries+i*8),weight=read(entries+i*8+4)) for i in range(read(pool+4))]
      cases.append(dict(reserve=reserve,count=count,kind=kind,edges=edges,fuse=fuse,seed=seed,calls=calls,remaining=remaining,randomState=read(context+0x1241c)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004EBA80, weighted point selection/removal004CBC40/004CBCD0/004CBD60/004CBD80/004CBDB0 and RNG004EE900 execute unchanged. Actor lookup/allocation and object constructor boundaries supplied/captured.',points=points,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} natural object placement cases')
