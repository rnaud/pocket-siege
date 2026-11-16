"""Execute original airstrike initialization, tick dispatch and missile payload generation."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EDI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EBP
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

context,manager,table,gravity_get,bodytable,delete,payload=owner+0x1000,owner+0x2000,owner+0x3000,owner+0x4000,owner+0x5000,owner+0x6000,owner+0x7000
write(owner+0x38,context);write(context+0x7d4,manager);write(manager,table);write(table+0x24,gravity_get);write(owner,bodytable);write(bodytable,delete)
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 if address not in [gravity_get,delete,0x4ccf50,0x492550,0x4e1830,0x4ee990,0x4eebe0]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);cleanup=0
 if address==gravity_get:cpu.reg_write(UC_X86_REG_EAX,gravity)
 elif address==delete:cleanup=4;calls.append(dict(operation='delete'))
 elif address==0x4ccf50:cleanup=8;cpu.reg_write(UC_X86_REG_EAX,owner+0x8000)
 elif address==0x492550:cpu.reg_write(UC_X86_REG_EAX,owner+0x9000)
 elif address==0x4e1830:
  cleanup=12;pointer=read(sp+12);calls.append(dict(operation='missile',payload=[signed(read(pointer+4*i)) for i in range(11)]))
 elif address==0x4ee990:cleanup=12;calls.append(dict(operation='camera',request=[signed(read(sp+4+4*i)) for i in range(3)]))
 else:calls.append(dict(operation='update'))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
initial=[];cases=[]
for direction in [-65536,65536]:
 for targetY in [-0xd00000,0,0x1500000,0x3000000]:
  for airborne in [0,1]:
   body=dict(count=5,spacing=32,speed=100,kind=2,airborne=airborne,direction=direction,targetX=600*65536,targetY=targetY)
   gravity=0x3d70
   for key,off in [('count',0x58),('spacing',0x5c),('speed',0x60),('kind',0x68),('airborne',0xac)]:write(owner+off,body[key])
   write(payload+0x10,direction&0xffffffff);write(payload+0x18,body['targetX']);write(payload+0x1c,targetY&0xffffffff)
   cpu.reg_write(UC_X86_REG_EBP,owner);cpu.reg_write(UC_X86_REG_EBX,payload);cpu.reg_write(UC_X86_REG_ESI,0);cpu.reg_write(UC_X86_REG_ESP,stack+0xfe00)
   calls=[];cpu.emu_start(0x4df43c,0x4df518,count=10000)
   initial.append(dict(body=body,gravity=gravity,x=signed(read(owner+0x44)),y=signed(read(owner+0x48)),threshold=signed(read(owner+0x4c))))
   for key,off in [('direction',0x1f4),('targetX',0x1fc),('targetY',0x200)]:write(owner+off,body[key]&0xffffffff)
   write(owner+0x1e4,123);write(owner+0x1e8,2);write(owner+0x208,55);write(owner+0x20c,3000);write(owner+0x3c,0)
   for tick in range(120):
    before={name:signed(read(owner+off)) for name,off in [('x',0x44),('y',0x48),('threshold',0x4c),('active',0x40),('count',0x58),('progress',0x3c)]}
    sp=stack+0xfe00;write(sp,stop);write(sp+4,0);write(sp+8,0x3ea);write(sp+12,0);write(sp+16,0)
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[];cpu.emu_start(0x4df7d0,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Strike tick did not finish')
    after={name:signed(read(owner+off)) for name,off in [('x',0x44),('y',0x48),('threshold',0x4c),('active',0x40),('count',0x58),('progress',0x3c)]}
    cases.append(dict(config=body,before=before,after=after,calls=calls))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004DF43C..004DF518 setup and004DF7D0 tick including004DF690 payload generation. Gravity getter, camera/update and allocation/constructor interfaces supplied.',initial=initial,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(initial)} initializations and {len(cases)} strike ticks')
