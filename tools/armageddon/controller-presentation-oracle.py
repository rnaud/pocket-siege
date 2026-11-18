"""Execute controller presentation updates with native smoothing against the original executable."""
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

context=0x2300000;cpu.mem_map(context,0x20000);widget=owner+0x2000;vtable=owner+0x2100
interfaces=[(0x4c29c0,1),(0x4ef050,1),(stop+0x100,2),(stop+0x200,4),(stop+0x300,2),(stop+0x400,0)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4c29c0:calls.append(['visible',signed(sp+4)]);cpu.reg_write(UC_X86_REG_EAX,visible)
 elif address==0x4ef050:calls.append(['indicator',signed(sp+4)]);cpu.reg_write(UC_X86_REG_EAX,indicator)
 elif address==stop+0x100:
  calls.append(['measure']);write(read(sp+4),width&0xffffffff);write(read(sp+8),height&0xffffffff)
 elif address==stop+0x200:
  calls.append(['layout',signed(sp+12),signed(sp+16)]);assert read(read(sp+4))==0 and read(read(sp+8))==0;write(read(sp+4),x&0xffffffff);write(read(sp+8),y&0xffffffff)
 elif address==stop+0x300:calls.append(['position',signed(sp+4),signed(sp+8)])
 elif address==stop+0x400:calls.append(['selection']);cpu.reg_write(UC_X86_REG_EAX,selection&0xffffffff)
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
offsets=[0xc0,0xc4,0xc8,0xcc,0xd0,0xd4,0x118];sceneOffsets=[0x1246c,0x12470,0x12474,0x12478];cases=[]
values=[0,1,-1,4915,4916,-4915,-4916,65536,-65536,2147483647,-2147483648,1234567]
for bits in range(512):
 cpu.mem_write(owner,bytes(0x3000));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
 fields={0x3c:2,0x40:bits&1,0xd8:65536 if bits&2 else 0,0xcc:values[bits%12],0xd4:values[(bits//2)%12],0xd0:9,0xe4:(bits>>2)&1,0xc8:(bits>>3)&1,0xc0:11,0xc4:12,0x118:13}
 for o,v in fields.items():write(owner+o,v&0xffffffff)
 initial=[values[(bits//3)%12],values[(bits//7)%12],values[bits%12],values[(bits//5)%12]]
 for o,v in zip(sceneOffsets,initial):write(context+o,v&0xffffffff)
 visible=[0,1,256,255][(bits>>4)%4];indicator=(bits>>6)&1;blocked=(bits>>7)&1;write(context+0x1d444,blocked)
 width=100+bits;height=200+bits;x=bits-256;y=32768 if bits&256 else -32769;selection=-1 if bits&256 else 42
 write(owner+0x110,widget);write(widget,vtable)
 for o,a in [(4,stop+0x300),(8,stop+0x200),(12,stop+0x100),(16,stop+0x400)]:write(vtable+o,a)
 calls=[];sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4e5f70,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(fields={str(k):v for k,v in fields.items()},initial=initial,visible=visible,indicator=indicator,blocked=blocked,width=width,height=height,x=x,y=y,selection=selection,calls=calls,body=[signed(owner+o) for o in offsets],scene=[signed(context+o) for o in sceneOffsets]))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E5F70 with004EDA70',offsets=offsets,sceneOffsets=sceneOffsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} presentation update cases')
