"""Execute original mine expiry, dud pool and blast dispatch004EA200..004EA499."""
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
vtable=owner+0x1000;cpu.mem_write(vtable,bytes(cpu.mem_read(0x527300,0x180)));write(owner,vtable)
delete=stop+0x100;write(vtable,delete)
hooks={0x4e9f00:('proximity',1),0x4edc90:('sound',5),0x4ef070:('blast',6),0x4ee190:('smoke',1),delete:('delete',1)}
for address,(name,count) in hooks.items():cpu.mem_write(address,b'\xc2'+struct.pack('<H',count*4))
calls=[];near=0;deleted=False
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 global deleted
 if address not in hooks:return
 name,count=hooks[address];sp=cpu.reg_read(UC_X86_REG_ESP)
 request=[signed(read(sp+4+i*4)) for i in range(count)]
 if name=='smoke':request=[signed(read(read(sp+4)+i*4)) for i in range(7)]
 calls.append(dict(operation=name,request=request))
 if name=='proximity':cpu.reg_write(UC_X86_REG_EAX,near)
 if name=='delete':deleted=True;cpu.emu_stop()
cpu.hook_add(UC_HOOK_CODE,hook)
fields={'fuse':0x118,'triggered':0x128,'radius':0x120,'dud':0x138,'forceBlast':0x108,'placed':0x13c,'damage':0x124}
cases=[]
for pool,usedBefore in [([0,0,0,0,0,1],[]),([1],[]),([0],[]),([1,0],[]),([0],[1,0]),([1],[0,0,1])]:
 for seed in [0,42,0xffffffff]:
  for damage in [0,50]:
   for flags in range(16):
    before=dict(fuse=0,triggered=1,radius=48,dud=0,forceBlast=flags&1,placed=(flags>>1)&1,damage=damage)
    near=(flags>>2)&1;dudsEnabled=(flags>>3)&1
    for key,off in fields.items():write(owner+off,before[key])
    x,y=0x123456,0x234567;write(owner+0x90,x);write(owner+0x94,y)
    write(context+0x1acc,seed);write(context+0x1ad0,seed);write(context+0x7f0,100)
    cpu.mem_write(context+0x11d43,bytes([dudsEnabled]));write(context+0x1474,len(pool));write(context+0x14b8,len(usedBefore))
    for i,v in enumerate(pool):write(context+0x1434+i*4,v)
    for i,v in enumerate(usedBefore):write(context+0x1478+i*4,v)
    sp=stack+0xfe00;write(sp+0x1c,x);write(sp+0x18,y)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EDI,vtable)
    calls=[];deleted=False;cpu.emu_start(0x4ea200,0x4ea499,count=10000)
    if not deleted and cpu.reg_read(UC_X86_REG_EIP)!=0x4ea499:raise RuntimeError('Mine expiry did not finish')
    after={key:signed(read(owner+off)) for key,off in fields.items()}
    remaining=[read(context+0x1434+i*4) for i in range(read(context+0x1474))]
    used=[read(context+0x1478+i*4) for i in range(read(context+0x14b8))]
    cases.append(dict(before=before,pool=pool,usedBefore=usedBefore,seed=seed,frame=100,x=x,y=y,near=near,dudsEnabled=dudsEnabled,after=after,calls=calls,remaining=remaining,used=used,logic=read(context+0x1acc),visual=read(context+0x1ad0)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004EA200..004EA499 and both original RNG streams execute unchanged. Proximity supplied; blast, delete, sound and seven-word smoke packets captured.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mine expiry cases')
