"""Execute original004E45ED..004E477A projectile timer branch."""
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

vtable=owner+0x2000
hooks={owner+0x3000:('submerged',0),owner+0x3100:('awake',0),owner+0x3200:('state',4),0x4edc30:('stopSound',4),0x4ee960:('random',0),0x4e4250:('warning',8),0x4edc90:('sound',20),0x4e4170:('special',0)}
write(vtable+0xf8,owner+0x3000);write(vtable+0x80,owner+0x3200)
fields=dict(remaining=0x37c,delay=0x380,delayPlayed=0x384,waitForRest=0x320,delaySound=0x324,mode=0x330,specialSprite=0x36c,phase=0x394,loopSound=0x3d8,warningPending=0x164,warningBlocked=0x150,warningScale=0x174,state=0x50)
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 if address not in hooks:return
 name,cleanup=hooks[address];sp=cpu.reg_read(UC_X86_REG_ESP)
 arg=lambda i:signed(read(sp+4+4*i));result=0
 if name in ['submerged','awake','random']:
  result=environment[name]
  if name=='random':calls.append(dict(operation=name))
 elif name=='state':
  write(owner+0x50,arg(0));calls.append(dict(operation=name,value=arg(0)))
 else:calls.append(dict(operation=name,request=[arg(i) for i in range(cleanup//4)]))
 cpu.reg_write(UC_X86_REG_EAX,result);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for remaining in [-1,0,1,19,20,21,799,800,819,820,3000]:
 for delay in [0,1,20,21,1800]:
  for variant in range(24):
   body=dict(remaining=remaining,delay=delay,delayPlayed=variant%2,waitForRest=(variant//2)%2,delaySound=104,mode=3 if variant%3==0 else 2,specialSprite=123 if variant%4==0 else 0,phase=1,loopSound=99 if variant%2 else 0,warningPending=(variant//3)%2,warningBlocked=(variant//6)%2,warningScale=100,state=0)
   environment=dict(submerged=int(variant==23),awake=variant%2,random=(variant%3)<<16)
   for name,offset in fields.items():write(owner+offset,body[name]&0xffffffff)
   cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EBX,vtable);cpu.reg_write(UC_X86_REG_EBP,owner+0x3100);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
   calls=[];cpu.emu_start(0x4e45ed,0x4e477a,count=1000)
   if cpu.reg_read(UC_X86_REG_EIP)!=0x4e477a:raise RuntimeError('Timer block did not finish')
   cases.append(dict(body=body,environment=environment,output={name:signed(read(owner+offset)) for name,offset in fields.items()},calls=calls))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E45ED..004E477A. Submerged/awake getters, state setter, RNG, warning/sound and special transition interfaces supplied/captured.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} projectile timer cases')
