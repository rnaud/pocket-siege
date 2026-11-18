"""Execute target cursors and placement preview drawing against the original executable."""
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

context=0x2300000;cpu.mem_map(context,0x20000);sprite=owner+0x2000;vtable=owner+0x2100
interfaces=[(0x4ef050,1),(0x4c29c0,1),(0x4c3a90,1),(0x4eedf0,6),(0x4eed70,10),(stop+0x100,2)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4ef050,0x4c29c0,0x4c3a90]:
  name,result={0x4ef050:('indicator',indicator),0x4c29c0:('visible',visible),0x4c3a90:('teleport',marker)}[address];calls.append([name,signed(sp+4)]);cpu.reg_write(UC_X86_REG_EAX,result)
 elif address==stop+0x100:calls.append(['size',sprite]);write(read(sp+4),width);write(read(sp+8),height)
 elif address==0x4eedf0:calls.append(['target']+[signed(sp+4+4*i) for i in range(6)])
 elif address==0x4eed70:calls.append(['placement']+[signed(sp+4+4*i) for i in range(10)])
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[];angles=[0,1,63,64,8192,16384,32768,65535,-1,2147483647,-2147483648]
for weapon in [0,34,36,40,1]:
 for bits in range(256):
  cpu.mem_write(owner,bytes(0x3000));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
  fields={0x3c:2,0x54:2147483647 if bits&128 else 3,0x64:weapon,0xac:bits&1,0xbc:(bits>>1)&1,0xe8:-1 if bits&4 else 7,0xf8:(bits>>3)&1,0xfc:123456,0x100:-654321,0x104:angles[(bits//3)%11],0xb0:angles[bits%11],0xe0:4 if bits&16 else 0}
  for o,v in fields.items():write(owner+o,v&0xffffffff)
  owners=[[],[7],[3,7],[3]][(bits>>5)%4];cpu.mem_write(context+0x1b7da,struct.pack('<h',len(owners)))
  for i,v in enumerate(owners):cpu.mem_write(context+0x1b7ba+i*2,struct.pack('<h',v))
  x=2147483647 if bits&128 else 100000;y=-2147483648 if bits&128 else 200000
  write(context+0x1247c,x&0xffffffff);write(context+0x12480,y&0xffffffff);write(context+0x310+fields[0xe0]*4,sprite);write(sprite,vtable);write(vtable+20,stop+0x100)
  width=64;height=16;indicator=(bits>>4)&1;visible=8 if bits&8 else 0;marker=(bits>>7)&1
  calls=[];sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x4e6190,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(fields={str(k):v for k,v in fields.items()},owners=owners,x=x,y=y,sprite=sprite,width=width,height=height,indicator=indicator,visible=visible,marker=marker,calls=calls))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E6190 with native trig',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} targeting draw cases')
