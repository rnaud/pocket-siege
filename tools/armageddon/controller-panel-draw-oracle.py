"""Execute controller team panel and arsenal drawing against the original executable."""
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

context=0x2300000;cpu.mem_map(context,0x20000)
interfaces=[(0x4c29c0,1),(0x4fffe0,3),(0x4eed30,9),(0x4eedc0,5)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4c29c0:calls.append(['visible',signed(sp+4)]);cpu.reg_write(UC_X86_REG_EAX,visible)
 elif address==0x4fffe0:
  calls.append(['panel',read(sp+4)]);write(read(sp+8),panelWidth&0xffffffff);write(read(sp+12),panelHeight&0xffffffff);cpu.reg_write(UC_X86_REG_EAX,panelImage)
 elif address==0x4eed30:calls.append(['draw']+[signed(sp+4+4*i) for i in range(9)])
 elif address==0x4eedc0:calls.append(['cursor']+[signed(sp+4+4*i) for i in range(5)])
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[];progress=[0,1,32768,65536,-1,2147483647,-2147483648]
for bits in range(512):
 cpu.mem_write(owner,bytes(0x200));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
 fields={0x3c:2,0x54:2147483647 if bits&256 else 3,0xcc:progress[bits%7],0xd4:progress[(bits//7)%7],0xc0:201 if bits&1 else 200,0xc4:121 if bits&2 else 120,0xf4:-1 if bits&4 else 7,0xe4:(bits>>3)&1}
 for o,v in fields.items():write(owner+o,v&0xffffffff)
 owners=[[],[7],[3,7],[3]][(bits>>4)%4];cpu.mem_write(context+0x1b7da,struct.pack('<h',len(owners)))
 for i,v in enumerate(owners):cpu.mem_write(context+0x1b7ba+i*2,struct.pack('<h',v))
 viewportWidth=801 if bits&64 else 800;viewportHeight=601 if bits&128 else 600;px=2147483647 if bits&256 else 0x12345;py=-123456
 for o,v in [(0x1b8dc,viewportWidth),(0x1b8e0,viewportHeight),(0xac,2468),(0x12474,px),(0x12478,py)]:write(context+o,v&0xffffffff)
 visible=[0,1,256,255][bits%4];panelImage=0 if bits&32 else 1234;panelWidth=99 if bits&2 else 100;panelHeight=39 if bits&1 else 40
 calls=[];sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4e5bf0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(fields={str(k):v for k,v in fields.items()},owners=owners,viewportWidth=viewportWidth,viewportHeight=viewportHeight,px=px,py=py,visible=visible,panelImage=panelImage,panelWidth=panelWidth,panelHeight=panelHeight,calls=calls))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E5BF0',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} panel drawing cases')
