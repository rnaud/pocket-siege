"""Execute camera focus and pause input collectors against the original executable."""
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
keyboard=owner+0x2000;kvtable=owner+0x2100;worm=owner+0x2200;wvtable=owner+0x2300
interfaces=[(stop+0x100,1),(stop+0x200,1),(stop+0x300,3),(0x4c2d60,2),(0x4ccf50,2),(0x4b26a0,6),(0x4eea10,1),(0x4eeb70,2)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:calls.append(['key',read(sp+4)]);cpu.reg_write(UC_X86_REG_EAX,pressed)
 elif address==stop+0x200:calls.append(['consume',read(sp+4)])
 elif address==0x4c2d60:calls.append(['state',signed(sp+4),signed(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,state)
 elif address==0x4ccf50:calls.append(['lookup',signed(sp+4),signed(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,worm if exists else 0)
 elif address==stop+0x300:
  calls.append(['query',1,read(sp+4),read(sp+8)]);write(read(sp+12),x&0xffffffff);write(read(sp+12)+4,y&0xffffffff);cpu.reg_write(UC_X86_REG_EAX,valid)
 elif address==0x4b26a0:calls.append(['send',read(sp+8),signed(sp+12),read(sp+16),read(sp+20),list(cpu.mem_read(read(sp+24),4))])
 elif address==0x4eea10:calls.append(['mode',signed(sp+4)])
 elif address==0x4eeb70:calls.append(['position',signed(sp+4),signed(sp+8)])
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for kind in ['camera','pause']:
 for owners,handle in [([],7),([7],7),([3,7],7),([3],7),([7],-1)]:
  for bits in range(128):
   cpu.mem_write(owner,bytes(0x3000));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
   fields={0x3c:2,0x4c:3,0x40:bits&1,0xf0:handle}
   for o,v in fields.items():write(owner+o,v&0xffffffff)
   cpu.mem_write(context+0x1b8aa,struct.pack('<h',len(owners)))
   for i,v in enumerate(owners):cpu.mem_write(context+0x1b88a+i*2,struct.pack('<h',v))
   pressed=(bits>>1)&1;state=100 if bits&4 else 7;exists=(bits>>3)&1;valid=(bits>>4)&1;paused=(bits>>5)&1
   x=2147483647 if bits&64 else -123456;y=-2147483648 if bits&64 else 7654321
   write(context+0x12418,paused);write(context+0x1247c,111);write(context+0x12480,222)
   write(context+4,keyboard);write(keyboard,kvtable);write(kvtable+4,stop+0x100);write(kvtable+12,stop+0x200);write(worm,wvtable);write(wvtable+12,stop+0x300)
   calls=[];sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x502850 if kind=='camera' else 0x5027d0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   cases.append(dict(kind=kind,fields={str(k):v for k,v in fields.items()},owners=owners,pressed=pressed,state=state,exists=exists,valid=valid,paused=paused,x=x,y=y,calls=calls,scene=[signed(context+o) for o in [0x12418,0x1247c,0x12480]]))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='00502850 and005027D0',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} camera and pause input cases')
