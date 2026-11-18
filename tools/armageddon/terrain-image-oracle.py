"""Execute original terrain-file reader with explicit CRT and image interfaces."""
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

def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(compressed,0x1000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global cursor,color_index
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==stop+0x100:calls.append(['tell',read(sp+4),snapshot()]);ret(cursor)
 elif address==stop+0x200:
  dest,n,count,file=[read(sp+i*4) for i in range(1,5)]
  calls.append(['read','scratch' if stack<=dest<stack+0x10000 else dest,n,count,file,snapshot()])
  chunk=stream[cursor:cursor+n*count];cursor+=len(chunk)
  if chunk:cpu.mem_write(dest,chunk)
  ret(len(chunk)//n if n else 0)
 elif address==stop+0x300:ret(0 if bytes(cpu.mem_read(read(sp+4),4))==b'IMG\x1a' else 1)
 elif address==0x4adcb0:
  color=list(struct.unpack('<HHH',cpu.mem_read(read(sp+4),6)));calls.append(['color',receiver,color,snapshot()]);color_index+=1;ret(color_index+10,4)
 elif address==0x492550:calls.append(['allocate',read(sp+4),snapshot()]);ret(bitmap)
 elif address==0x492bc0:
  values=[read(sp+i*4) for i in range(1,4)];calls.append(['construct',receiver,*values,snapshot()]);write(bitmap+4,values[0]);write(bitmap+8,values[1]);write(bitmap+12,values[2]);ret(bitmap,12)
 elif address==stop+0x400:
  calls.append(['storage',receiver,snapshot()]);write(read(sp+4),pixels);write(read(sp+8),bits);write(read(sp+12),pitch);ret(0,12)
 elif address==stop+0x500:
  calls.append(['remap',receiver,bytes(cpu.mem_read(read(sp+4),256)).hex(),snapshot()]);ret(0,4)
 elif address==0x4ab3c9:
  calls.append(['decode',read(sp+4),read(sp+8),bytes(cpu.mem_read(read(sp+12),256)).hex(),snapshot()]);ret()
for iat,target in [(0x517940,stop+0x100),(0x517930,stop+0x200),(0x51796c,stop+0x300)]:write(iat,target)
for vtable in [0x526328,0x5249b0]:write(vtable+0x20,stop+0x400);write(vtable+0x60,stop+0x500)
for address in [stop+0x100,stop+0x200,stop+0x300,stop+0x400,stop+0x500,0x4adcb0,0x492550,0x492bc0,0x4ab3c9]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for pattern in [0,0xa5]:
 for bits in [1,8,4]:
  for flags in [0,128,64,192]:
   for width,height in [(1,1),(9,3),(32,0)]:
    cursor=5;color_index=0;calls=[];pitch=((width*bits+31)//32)*4
    cpu.mem_write(owner,bytes([pattern])*0x10000);cpu.mem_write(stack,bytes([pattern])*0x10000);cpu.mem_write(compressed,bytes([pattern])*0x1000)
    body=bytes([bits,flags])
    if flags&128:body+=struct.pack('<H',3)+bytes([255,0,0,0,255,0,0,0,255])
    body+=struct.pack('<HH',width,height)
    body+=bytes((i*13)&255 for i in range(19 if flags&64 else ((width*bits+7)//8)*height))
    stream=b'xxxxx'+b'IMG\x1a'+struct.pack('<I',len(body)+8)+body
    sp=stack+0xf000;write(sp,stop);write(sp+4,0x4567);write(sp+8,0x1234)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4f08e0,stop,count=10000)
    assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(pattern=pattern,bits=bits,pitch=pitch,stream=stream.hex(),calls=calls,result=cpu.reg_read(UC_X86_REG_EAX),sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004F08E0',method='Original embedded image loader;72 full64KiB output plus4KiB compressed-buffer captures. CRT transport, palette insertion, bitmap construction/storage/remap and compressed decode are interfaces. Covers1/8bpp, unsupported4bpp, optional palettes/compression, padded storage and zero height. Does not claim compressed pixel decoding or live terrain integration.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} embedded image sequences')
