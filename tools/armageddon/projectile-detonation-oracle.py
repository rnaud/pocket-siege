"""Execute original004E2EA0 projectile detonation dispatch."""
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

context=owner+0x4000
write(owner+0x38,context)
hooks={0x4edc90:('sound',20),0x4ef070:('blast',24),0x4e2ca0:('fragments',8),0x4e3030:('fire',8)}
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 if address not in hooks:return
 name,cleanup=hooks[address];sp=cpu.reg_read(UC_X86_REG_ESP)
 calls.append(dict(operation=name,request=[signed(read(sp+4+i*4)) for i in range(cleanup//4)]))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for damage,variance in [(0,0),(15,0),(50,0),(100,25),(100,100),(-1,50)]:
 for offset in [-75,0,10,75]:
  for variant in range(12):
   body=dict(sprite=668 if variant%2 else 639,offset=offset,push=125,damage=damage,variance=variance,secondary=variant%3,repeat=(variant//3)%2)
   seed=[0,42,0xffffffff][variant%3];frame=variant*25
   for key,off in [('sprite',0x2ec),('offset',0x2d8),('push',0x2dc),('damage',0x2e0),('variance',0x2e4),('secondary',0x210),('repeat',0x150)]:write(owner+off,body[key]&0xffffffff)
   write(context+0x1acc,seed);write(context+0x7f0,frame)
   sp=stack+0xff00;write(sp,stop);write(sp+4,0x123456);write(sp+8,0x234567)
   cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
   calls=[];cpu.emu_start(0x4e2ea0,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Detonation did not finish')
   cases.append(dict(body=body,x=0x123456,y=0x234567,seed=seed,frame=frame,calls=calls,randomState=read(context+0x1acc)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E2EA0 and original damage variation/RNG run unchanged; blast, sound, fragment and fire interfaces captured.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} detonation cases')
