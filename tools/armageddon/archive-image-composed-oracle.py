"""Execute original named archive image loading with native bitmap and palette composition."""
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


compressed=0x714be0
bitmap=owner;pixels=owner+0x1000
archive=owner+0x4000;handle=owner+0x8000;directory=owner+0x9000;name=owner+0x7000;normalized=0x7d6058

def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(compressed,0x1000))+bytes(cpu.mem_read(normalized,256))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global cursor,color_index
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==stop+0x100:
  cursor=read(sp+4);calls.append(['seek',receiver,cursor,snapshot()]);ret(1,4)
 elif address==stop+0x200:
  dest,n=read(sp+4),read(sp+8)
  calls.append(['read','scratch' if stack<=dest<stack+0x10000 else dest,n,receiver,snapshot()])
  chunk=stream[cursor:cursor+n];cursor+=len(chunk)
  if chunk:cpu.mem_write(dest,chunk)
  ret(len(chunk),8)
 elif address==0x492590:calls.append(['free',read(sp+4),read(sp+8),snapshot()]);ret()
 elif address==stop+0x300:ret(0 if bytes(cpu.mem_read(read(sp+4),4))==b'IMG\x1a' else 1)
 elif address==0x492550:calls.append(['allocate',read(sp+4),snapshot()]);ret(handle if read(sp+4)==12 else bitmap)
 elif address==0x4924d0:calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(pixels)
for iat,target in [(0x517940,stop+0x100),(0x517930,stop+0x200),(0x51796c,stop+0x300)]:write(iat,target)
for address in [stop+0x100,stop+0x200,0x492590,stop+0x300,0x492550,0x4924d0]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for pattern in [0,0xa5]:
 for bits in [1,8,4]:
  for flags in [0,128,64,192]:
   for width,height in [(1,1),(9,3),(32,1)]:
    cursor=5;color_index=0;calls=[];pitch=((width*bits+31)//32)*4
    cpu.mem_write(owner,bytes([pattern])*0x10000);cpu.mem_write(stack,bytes([pattern])*0x10000);cpu.mem_write(compressed,bytes([pattern])*0x1000)
    first,last={0:(137,248),128:(0,2),64:(254,254),192:(2,1)}[flags]
    sp=stack+0xf000;write(sp,stop);write(sp+4,first);write(sp+8,last)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner+0xc000);cpu.emu_start(0x4adac0,stop,count=10000)
    assert cpu.reg_read(UC_X86_REG_EIP)==stop
    body=bytes([bits,flags])
    if flags&128:body+=struct.pack('<H',3)+bytes([255,0,0,0,255,0,0,0,255])
    body+=struct.pack('<HH',width,height)
    body+=bytes((- (8+len(body)))%4)
    body+=bytes([1,2,3,0x88,0,0x80,3,0,0x80,0]) if flags&64 else bytes((i*13)&255 for i in range(((width*bits+7)//8)*height))
    stream=b'xxxxx'+b'IMG\x1a'+struct.pack('<I',len(body)+8)+body
    cpu.mem_write(normalized,bytes([pattern])*256)
    cpu.mem_write(name,b'SOIL.IMG\0');cpu.mem_write(directory,bytes(0x1000))
    write(archive,owner+0x6000);write(owner+0x6008,stop+0x200);write(owner+0x600c,stop+0x100);write(owner+0x6014,0x4ad780)
    write(archive+4,directory);write(archive+0x18c,16);write(archive+0x190,0)
    for i in range(16):write(archive+0x10c+i*4,i);write(archive+i*16+12,0)
    h=0
    for b in b'soil.img':h=(b+((h>>9)|((h*2)&1023)))&1023
    entry=directory+0x1000;write(directory+h*4,entry);write(entry,0);write(entry+4,5);write(entry+8,len(stream)-5);cpu.mem_write(entry+12,b'soil.img\0')
    sp=stack+0xf000;write(sp,stop);write(sp+4,owner+0xc000);write(sp+8,archive);write(sp+12,name)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x492710,stop,count=10000)
    assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(nativeImageServices=True,first=first,last=last,pattern=pattern,bits=bits,pitch=pitch,stream=stream.hex(),calls=calls,result=cpu.reg_read(UC_X86_REG_EAX),sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='00492710',method='72 original named image sequences execute lookup, entry read/alignment, palette construction/insertion, bitmap construction/storage/remap, decompression and handle cleanup together. Full64KiB owner plus4KiB packed and256-byte normalized-name memory at callbacks and completion. Only archive seek/read, heap allocation/free and signature comparison remain interfaces. Synthetic single-entry directory and payloads cover1/8bpp, unsupported4bpp, optional palettes/compression, padded rows, palette exhaustion and retained memory. Real directories/payloads and live terrain ownership remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} archive image sequences')
