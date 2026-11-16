"""Execute original mine timer and scan block004EA0F4..004EA499, stopping at expiry dispatch."""
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

from unicorn.x86_const import UC_X86_REG_EDI
context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
vtable=owner+0x1000
hooks={0x4e9f00:('proximity',1),0x4edb40:('announce',0),0x4edc90:('sound',5),stop+0x100:('awake',0),stop+0x200:('submerged',0),stop+0x300:('friction',1),stop+0x400:('complex',1)}
for offset,address in [(0xf4,stop+0x100),(0xf8,stop+0x200),(0x94,stop+0x300),(0x58,stop+0x400)]:write(vtable+offset,address)
for address,(name,count) in hooks.items():cpu.mem_write(address,b'\xc2'+struct.pack('<H',count*4) if count else b'\xc3')
calls=[];environment={};expired=False
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 global expired
 if address==0x4ea200:expired=True;cpu.emu_stop();return
 if address not in hooks:return
 name,count=hooks[address];sp=cpu.reg_read(UC_X86_REG_ESP);request=[signed(read(sp+4+i*4)) for i in range(count)]
 if name in ['awake','submerged']:cpu.reg_write(UC_X86_REG_EAX,environment[name]);return
 calls.append(dict(operation=name,request=request))
 if name=='proximity':cpu.reg_write(UC_X86_REG_EAX,environment['near'])
cpu.hook_add(UC_HOOK_CODE,hook)
fields={'arm':0x11c,'fuse':0x118,'triggered':0x128,'lastBeep':0x12c,'enabled':0x104,'radius':0x120}
cases=[]
for arm in [-1,0,1,20,21,4000]:
 for triggered in [0,1]:
  for fuse in [1,20,21,250,251,3000]:
   for submerged in [0,1]:
    for vx,vy in [[0,0],[16384,0],[65536,-131072]]:
     for frame in [0,1]:
      for near in [0,1]:
       before=dict(arm=arm,fuse=fuse,triggered=triggered,lastBeep=fuse//250,enabled=1,radius=48)
       for name,offset in fields.items():write(owner+offset,before[name]&0xffffffff)
       write(context+0x7f0,frame);cpu.mem_write(context+0x11ba0,b'\x42')
       environment=dict(submerged=submerged,awake=int(vx!=0 or vy!=0),near=near,frame=frame,vx=vx,vy=vy,friction=66)
       calls=[];expired=False;sp=stack+0xfe00;write(sp+0x24,vy&0xffffffff);write(sp+0x28,vx&0xffffffff)
       cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EDI,vtable);cpu.reg_write(UC_X86_REG_EBX,10)
       cpu.emu_start(0x4ea0f4,0x4ea499,count=10000)
       if not expired and cpu.reg_read(UC_X86_REG_EIP)!=0x4ea499:raise RuntimeError('Mine block did not finish')
       after={name:signed(read(owner+offset)) for name,offset in fields.items()}
       cases.append(dict(before=before,environment=environment,after=after,calls=calls,expired=expired))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004EA0F4..004EA499 executes unchanged; expiry stops at004EA200 before dud/blast dispatch. Awake/submerged/proximity supplied, friction/complex/audio interfaces captured.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mine timer cases')
