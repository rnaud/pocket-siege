"""Execute original environment presentation replay constructor, weather initialization and drawing requests."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000

import itertools,base64,zlib
stream=owner+0x4000;buffer=owner+0x5000;context=owner+0x20000;environment=owner+0x40000
cpu.mem_map(context,0x20000);cpu.mem_map(environment,0x10000)
write(stream+4,buffer);write(stream+8,2048);write(stream+0x14,context);write(context+0x7d4,environment)
write(environment,environment+0x1000);write(environment+0x1034,0x4c8f80);write(environment+0x3c0,environment+0x2000);write(environment+0x2000+0x3a4,17)
paletteObject=environment+0x5000;surface=environment+0x5200
write(context+0x28,paletteObject);write(paletteObject,paletteObject+0x100)
write(paletteObject+0x114,stop+0x100);write(paletteObject+0x154,stop+0x110)
write(context+0x2f0,surface);write(surface,surface+0x100)
for offset in [0x14,0x34,0x38,0x3c,0x58]:write(surface+0x100+offset,stop+0x200+offset)
write(context+0x12434+8*4,8);write(context+0x12434+9*4,9)
heap=owner+0x7000;calls=[];requests=[];pixels=[];dimensions=[181,17]
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def hook(cpu,address,size,user):
 global heap
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4924d0,0x492550]:
  size=read(sp+(8 if address==0x4924d0 else 4));pointer=heap;heap+=(size+15)&~15;cpu.mem_write(pointer,bytes(size));requests.append(['array',size,read(sp+4),pointer] if address==0x4924d0 else ['allocate',size,pointer]);ret(pointer)
 elif address==0x492510:requests.append(['free',read(sp+4)]);ret()
 elif address in [stop+0x100,stop+0x214]:
  requests.append(['dimensions',cpu.reg_read(UC_X86_REG_ECX)])
  width,height=(1,len(pixels)) if address==stop+0x100 else dimensions
  write(read(sp+4),width);write(read(sp+8),height);ret(0,8)
 elif address==stop+0x110:
  x,y=read(sp+4),read(sp+8);calls.append(['sample',x,y]);requests.append(['sample',cpu.reg_read(UC_X86_REG_ECX),x,y]);ret(pixels[y],8)
 elif address in [stop+0x234,stop+0x238,stop+0x23c,stop+0x258]:
  offset=address-stop-0x200;count={0x34:4,0x38:4,0x3c:5,0x58:3}[offset]
  calls.append([offset]+[signed(read(sp+4+i*4)) for i in range(count)]);requests.append(['draw',cpu.reg_read(UC_X86_REG_ECX)]+calls[-1]);ret(0,count*4)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
patterns=[[],[7,7,9,7,9,11],list(range(25)),[0xffffffff,0,0xffffffff,4]]
bounds=[[-13107199,125829120,696],[0,0,0],[2147418112,-2147418112,1200]]
for position,detail,limits,pixels,dimensions in itertools.product([0,1,3],[0,1],bounds,patterns,[[181,17],[47,9]]):
 heap=owner+0x7000;calls.clear();requests.clear();cpu.mem_write(owner,bytes([0xa5])*0x175c)
 for offset,storage in [(0x18,environment+0x3000),(0x34+2*0x1c,environment+0x3400)]:
  write(environment+offset+4,256);write(environment+offset+12,0);write(environment+offset+16,storage);write(environment+offset+20,storage+0x100)
 for offset,value in [(0x1b8ac,detail),(0x1b8cc,limits[0]),(0x1b8d0,limits[1]),(0x804,limits[2])]:write(context+offset,value)
 payload=bytearray([0xcc]*position+[1,28,21,3,0,2,3])
 while len(payload)%4:payload.append(255)
 body=bytearray((i*13)&255 for i in range(0xb0))
 for offset,number in [(0x3c,2),(0x44,0),(0xc8,0),(0xdc,0),(0xe4,-1),(0xe8,-1)]:struct.pack_into('<I',body,offset-0x3c,number&0xffffffff)
 payload.extend(body);payload.append(28)
 while len(payload)%4:payload.append(255)
 payload.extend(range(16))
 cpu.mem_write(buffer,bytes(payload));write(stream+0x10,position);write(stream+0xc,len(payload))
 initial=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))+bytes(cpu.mem_read(environment,0x10000))
 sp=stack+0xf000;write(sp,stop);write(sp+4,0);write(sp+8,stream);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4d2180,stop+1,count=100000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('presentation constructor did not exit')
 result={'body':list(cpu.mem_read(owner+0x3c,0x1720)),'position':read(stream+0x10),'calls':list(calls)}
 final=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))+bytes(cpu.mem_read(environment,0x10000))
 cases.append({'inputMemory':base64.b64encode(zlib.compress(initial)).decode(),'sha256':hashlib.sha256(final).hexdigest(),'requests':list(requests),'input':{'position':position,'bytes':list(payload),'detail':detail,'limits':limits,'pixels':pixels,'dimensions':dimensions},'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004D2180 including original base/physics,004D21C0 initialization,004D2770 weather particles and004D2050 drawing. Only heap and virtual pixel/surface interfaces substituted. Full body bytes and sampling/draw request order captured. Complete256KiB owner/context/environment memory and interleaved allocation/dimensions/pixel/draw requests also captured.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} presentation restores')
