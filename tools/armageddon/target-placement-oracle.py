"""Execute full 00501630 placement bounds and00501880 teleport target search with original key classification and queue writes; external input/registry/worm queries are interfaces."""
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

context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
shape=owner+0x1000;vtable=owner+0x2000;xp=owner+0x3000;yp=xp+4
write(shape,vtable);write(vtable+0x14,stop+0x100);write(vtable+0x0c,stop+0x110)
for address,argc in [(stop+0x100,2),(stop+0x110,3)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(address):return struct.unpack('<i',cpu.mem_read(address,4))[0]
def fixedwrite(address,value):write(address,value&0xffffffff)
calls=[];dimensions=[];accept_at=0;adjust=[]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  for i,value in enumerate(dimensions):fixedwrite(read(sp+4+i*4),value)
 elif address==stop+0x110:
  payload=read(sp+12);calls.append([read(sp+4),read(sp+8),signed(payload),signed(payload+4)])
  fixedwrite(payload,signed(payload)+adjust[0]);fixedwrite(payload+4,signed(payload+4)+adjust[1]);cpu.reg_write(UC_X86_REG_EAX,int(len(calls)-1==accept_at))
for address in [stop+0x100,stop+0x110]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
def run(routine,x,y,ceiling):
 fixedwrite(xp,x);fixedwrite(yp,y);write(context+0x1b8ac,ceiling)
 sp=stack+0xf000
 for i,value in enumerate([stop,xp,yp,shape]):write(sp+i*4,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(routine,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 return [signed(xp),signed(yp)]
bounds=[];teleport=[]
for dimensions in [[32,16],[33,17],[1,1],[128,64],[2000,800]]:
 for ceiling in [0,1]:
  for x in [-65537,0,15*65536+123,1910*65536+321,2147483647]:
   for y in [-65537,0,8*65536+456,690*65536+654,2147483647]:
    bounds.append(dict(x=x,y=y,dimensions=dimensions,ceiling=ceiling,output=run(0x501630,x,y,ceiling)))
for ceiling in [0,1]:
 for y in [7*65536+123,8*65536,10*65536+456,40*65536+65535,-1]:
  for accept_at in [0,1,2,30,31,32,61,62,63,-1]:
   for adjust in [[0,0],[1,-2]]:
    x=123*65536+789;calls=[];output=run(0x501880,x,y,ceiling)
    teleport.append(dict(x=x,y=y,ceiling=ceiling,acceptAt=accept_at,adjust=adjust,calls=calls,accepted=cpu.reg_read(UC_X86_REG_EAX),output=output))
args.output.write_text(json.dumps(dict(executableSha256=digest,bounds=bounds,teleport=teleport),separators=(',',':'))+'\n')
print(f'Wrote {len(bounds)} bounds and {len(teleport)} teleport cases')
