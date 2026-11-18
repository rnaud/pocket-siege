"""Execute original setup bitmap copy, palette sequencing and cleanup."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EDX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI
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



source=0x2300000;cpu.mem_map(source,0x10000)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return bytes(result)
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
for address,offset in [(0x517a28,0x100),(0x517408,0x200),(0x517450,0x300),(0x712ea4,0x400),(0x712e44,0x500),(0x712e38,0x600)]:write(address,stop+offset)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  values=[read(sp+i) for i in range(4,28,4)];values[1]=cstring(values[1]).decode()
  calls.append(['loadImage',*values,snapshot()]);ret(0 if fail else 0x1234,24)
 elif address==stop+0x200:
  calls.append(['getBitmap',read(sp+4),read(sp+8),snapshot()]);dest=read(sp+12)
  cpu.mem_write(dest,bytes(0x54));write(dest+4,bw);write(dest+8,bh);write(dest+12,stride);write(dest+20,bits);ret(0x54,12)
 elif address==stop+0x300:
  calls.append(['deleteImage',read(sp+4),snapshot()]);ret(1,4)
 elif address==stop+0x400:
  calls.append(['openPalette',cstring(cpu.reg_read(UC_X86_REG_EDX)).decode(),snapshot()]);write(cpu.reg_read(UC_X86_REG_ECX),0x5678);ret()
 elif address==stop+0x500:
  dest=cpu.reg_read(UC_X86_REG_EDX)
  calls.append(['readPalette',cpu.reg_read(UC_X86_REG_ECX),dest,read(sp+4),read(sp+8),snapshot()]);cpu.mem_write(dest,bytes((i*19+7)&255 for i in range(1024)));ret(256,8)
 elif address==stop+0x600:
  calls.append(['closePalette',read(cpu.reg_read(UC_X86_REG_ECX)),snapshot()]);ret()
for offset in range(0x100,0x700,0x100):cpu.hook_add(UC_HOOK_CODE,hook,begin=stop+offset,end=stop+offset)
cases=[]
for bw,bh,stride in [(20,17,20),(20,-17,20),(19,17,20),(21,17,24),(20,16,20),(19,16,20),(20,0,20),(20,-2147483648,20),(3,4,4),(5,-4,8),(1,1,1)]:
 for width,height in [(20,17),(bw,abs(bh) if bh!=-2147483648 else 17)]:
  for fail in [False,True]:
   for overlap in [False,True]:
    cpu.mem_write(owner,bytes((i*13+5)&255 for i in range(0x10000)));cpu.mem_write(source,bytes((i*7+11)&255 for i in range(0x10000)))
    bits=owner+0x1000 if overlap else source;pixels=owner+0x1004;palette=owner+0x8000
    cpu.mem_write(stack,b'fixture.bmp\0');calls=[]
    sp=stack+0xf000
    for i,value in enumerate([stop,stack,pixels,palette,width,height]):write(sp+i*4,value)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x40f210,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(width=width,height=height,bitmapWidth=bw,bitmapHeight=bh,stride=stride,fail=fail,overlap=overlap,result=cpu.reg_read(UC_X86_REG_EAX),calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executableSha256=digest,entry='0040F210',method='Original bitmap copy and lifetime sequencing. Windows bitmap/palette backends are explicit interfaces. Patterned destination memory, orientation, AND dimension guard, padding/overlap, acquisition failure and boundary dimensions are compared at every callback and return.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} bitmap setup loads')
