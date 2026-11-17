"""Execute full 004DF270 worm position, placement and information queries with original key classification and queue writes; external input/registry/worm queries are interfaces."""
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

vtable=owner+0x1000;payload=owner+0x2000
write(owner,vtable)
for offset,address,argc in [(0x5c,stop+0x100,2),(0x74,stop+0x110,0),(0x78,stop+0x120,1),(0x100,stop+0x130,2),(0x7c,stop+0x140,0)]:
 write(vtable+offset,address);cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
cpu.mem_write(0x4f4520,b'\xc2\x0c\x00')
def signed(address):return struct.unpack('<i',cpu.mem_read(address,4))[0]
def put(address,value):write(address,value&0xffffffff)
calls=[];position=[];mode=0;result=0;status=0;accept_at=None

def hook(cpu,address,size,user):
 global position,mode
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  calls.append(['position']);put(read(sp+4),position[0]);put(read(sp+8),position[1])
 elif address==stop+0x110:
  calls.append(['mode']);cpu.reg_write(UC_X86_REG_EAX,mode&0xffffffff)
 elif address==stop+0x120:
  mode=signed(sp+4);calls.append(['setMode',mode])
 elif address==stop+0x130:
  position=[signed(sp+4),signed(sp+8)];calls.append(['place',*position]);count=len([c for c in calls if c[0]=='place']);answer=(int((count-1)//2==accept_at) if count%2 else 99) if accept_at is not None else (result if count==1 else 99);cpu.reg_write(UC_X86_REG_EAX,answer&0xffffffff)
 elif address==stop+0x140:
  calls.append(['status']);cpu.reg_write(UC_X86_REG_EAX,status&0xffffffff)
 elif address==0x4f4520:
  calls.append(['base',read(sp+4),read(sp+8)]);put(read(sp+12)+12,123456);cpu.reg_write(UC_X86_REG_EAX,result&0xffffffff)
for address in [stop+0x100,stop+0x110,stop+0x120,stop+0x130,stop+0x140,0x4f4520]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for event in [0x7d0,0x7d1,0x7d3,0x7d2,0x123]:
 for seed in range(8):
  for result in [0,1,-1]:
   body=bytes((i*17+seed*31)&255 for i in range(0x300));cpu.mem_write(owner,body);write(owner,vtable)
   initial=bytearray([0xa5]*0x154);xy=[[-1,32768],[123,456],[-32769,65536],[0,0]][seed%4]
   struct.pack_into('<ii',initial,0,*xy);cpu.mem_write(payload,bytes(initial))
   position=[(seed-4)*65536+123,(seed+2)*65536+456];initial_position=position.copy();mode=seed-2;initial_mode=mode;status=seed*123-1;calls=[]
   sp=stack+0xf000
   for i,value in enumerate([stop,event,0x154,payload]):write(sp+i*4,value)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4df270,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   eax=cpu.reg_read(UC_X86_REG_EAX);eax=eax if eax<0x80000000 else eax-0x100000000
   cases.append(dict(event=event,seed=seed,result=result,status=status,position=initial_position,mode=initial_mode,input=list(initial),calls=calls,output=list(cpu.mem_read(payload,0x154)),returned=eax,finalPosition=position,finalMode=mode))
context=0x2300000;cpu.mem_map(context,0x20000);xp=owner+0x3000;yp=xp+4
composed=[]
for ceiling in [0,1]:
 for y in [7*65536+123,10*65536+456,40*65536+789]:
  for accept_at in [0,1,30,31,62,-1]:
   seed=3;cpu.mem_write(owner,bytes((i*17+seed*31)&255 for i in range(0x300)));write(owner,vtable);write(owner+0x38,context);write(vtable+0x0c,0x4df270);write(context+0x1b8ac,ceiling)
   x=123*65536+789;put(xp,x);put(yp,y);position=[456*65536+123,321*65536+456];initial_position=position.copy();mode=5;calls=[]
   sp=stack+0xf000
   for i,value in enumerate([stop,xp,yp,owner]):write(sp+i*4,value)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x501880,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   composed.append(dict(seed=seed,x=x,y=y,ceiling=ceiling,acceptAt=accept_at,position=initial_position,mode=5,calls=calls,accepted=cpu.reg_read(UC_X86_REG_EAX),output=[signed(xp),signed(yp)],finalPosition=position,finalMode=mode))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004DF270',cases=cases,composed=composed),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} worm query and {len(composed)} composed teleport cases')
