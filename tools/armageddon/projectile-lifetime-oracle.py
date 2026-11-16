"""Execute original004E477A..004E4877 projectile lifetime branch."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EBP, UC_X86_REG_EDI
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

vtable,context=owner+0x2000,owner+0x4000
write(owner+0x38,context)
write(vtable+0x80,owner+0x3200);write(vtable,owner+0x3300)
hooks={owner+0x3000:('submerged',0),owner+0x3100:('awake',0),owner+0x3200:('state',4),owner+0x3300:('delete',4),0x4eeb70:('position',8),0x4e4170:('special',0),0x4eebe0:('update',0)}
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 if address not in hooks:return
 name,cleanup=hooks[address];sp=cpu.reg_read(UC_X86_REG_ESP)
 args=[signed(read(sp+4+i*4)) for i in range(cleanup//4)]
 if name in ['submerged','awake']:cpu.reg_write(UC_X86_REG_EAX,environment[name])
 else:calls.append(dict(operation=name,request=args))
 if name=='delete':cpu.emu_stop();return
 cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for x in [-32768,-11541,-11540,-11539,0,960,13459,13460,13461,32767]:
 for y in [807*65536+65535,808*65536,935*65536+65535,936*65536]:
  for variant in range(16):
   body=dict(x=x*65536,y=y,secondary=variant%2,mode=2 if variant%3 else 1,count=(variant//2)%2,sideMask=8 if variant%4 else 0,phase=variant%3)
   environment=dict(awake=(variant//4)%2,submerged=(variant//8)%2,depth=808)
   for key,off in [('secondary',0x100),('mode',0x330),('count',0x35c),('sideMask',0x344),('phase',0x394)]:write(owner+off,body[key])
   write(context+0x808,environment['depth'])
   sp=stack+0xff00;write(sp+0x14,body['x']&0xffffffff);write(sp+0x10,body['y']&0xffffffff)
   cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EBX,vtable);cpu.reg_write(UC_X86_REG_EBP,owner+0x3100);cpu.reg_write(UC_X86_REG_EDI,owner+0x3000);cpu.reg_write(UC_X86_REG_ESP,sp)
   calls=[];cpu.emu_start(0x4e477a,0x4e4877,count=1000)
   if cpu.reg_read(UC_X86_REG_EIP) not in [0x4e4877,owner+0x3300]:raise RuntimeError('Lifetime branch did not finish')
   cases.append(dict(body=body,environment=environment,calls=calls))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E477A..004E4877 with awake/submerged getters and state/position/special/update/destructor interfaces captured.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} projectile lifetime cases')
