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
 global cursor,color_index,bitmap,pixels
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==stop+0x800:calls.append(['palette',receiver,read(sp+4),snapshot()]);ret(owner+0x8000,4)
 elif address==stop+0x900:calls.append(['submit',receiver,read(sp+4),snapshot()]);ret(0,4)
 elif address==stop+0xa00:calls.append(['clear',receiver,*[signed(read(sp+i*4)) for i in range(1,6)],snapshot()]);ret(0,20)
 elif address==stop+0x600:calls.append(['open',read(sp+4),'rb',snapshot()]);ret(0x1234)
 elif address==stop+0x700:calls.append(['close',read(sp+4),snapshot()]);ret()
 elif address==stop+0x100:calls.append(['tell',read(sp+4),snapshot()]);ret(cursor)
 elif address==stop+0x200:
  dest,n,count,file=[read(sp+i*4) for i in range(1,5)]
  calls.append(['read','scratch' if stack<=dest<stack+0x10000 else dest,n,count,file,snapshot()])
  chunk=stream[cursor:cursor+n*count];cursor+=len(chunk)
  if chunk:cpu.mem_write(dest,chunk)
  ret(len(chunk)//n if n else 0)
 elif address==stop+0x300:ret(0 if bytes(cpu.mem_read(read(sp+4),4))==b'IMG\x1a' else 1)
 elif address==0x492550:
  calls.append(['allocate',read(sp+4),snapshot()]);bitmap+=0x40;pixels=owner+0x2000+(bitmap-owner-0x1000)//0x40*0x400;ret(bitmap)
 elif address==0x4924d0:
  calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(pixels)
for iat,target in [(0x51794c,stop+0x600),(0x51793c,stop+0x700),(0x517940,stop+0x100),(0x517930,stop+0x200),(0x51796c,stop+0x300)]:write(iat,target)
for vtable in [0x526328,0x5249b0]:write(vtable+0x3c,stop+0xa00)
for address in [stop+0x800,stop+0x900,stop+0xa00,stop+0x100,stop+0x200,stop+0x300,stop+0x600,stop+0x700,0x492550,0x4924d0]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for pattern in [0,0xa5]:
 for variant in range(4):
  for count in [0,1,8,32]:
   cursor=0;color_index=0;calls=[];bitmap=owner+0x1000;pixels=0
   cpu.mem_write(owner,bytes([pattern])*0x10000);cpu.mem_write(stack,bytes([pattern])*0x10000);cpu.mem_write(compressed,bytes([pattern])*0x1000)
   first,last=[(137,248),(0,2),(254,254),(2,1)][variant]
   sp=stack+0xf000;write(sp,stop);write(sp+4,first);write(sp+8,last)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner+0x8000);cpu.emu_start(0x4adac0,stop,count=10000)
   write(owner+0x6000,owner+0x6100);write(owner+0x6114,stop+0x800);write(owner+0x6154,stop+0x900)
   water=[0,23,100,101][variant]
   stream=struct.pack('<7I',0x12345678,0,1920,696,77,water,count)+bytes((i*17)&255 for i in range(count*8))
   for index,bits in enumerate([8,1,8]):
    flags=128|(64 if (variant>> (index%2))&1 else 0)
    body=bytes([bits,flags])+struct.pack('<H',3)+bytes([255,0,0,0,255,0,0,0,255])+struct.pack('<HH',9,3)
    body+=bytes([1,2,3,0x88,0,0x80,3,0,0x80,0]) if flags&64 else bytes(i%4 for i in range(((9*bits+7)//8)*3))
    stream+=b'IMG\x1a'+struct.pack('<I',len(body)+8)+body
   stream+=b'\x0bcustom\\snow\x0awater\\blue'
   arguments=[0xabcdef,owner+0x6000,variant,owner+0x800,owner+8,owner+0x100,owner,owner+4]
   sp=stack+0xf000;write(sp,stop)
   for i,v in enumerate(arguments):write(sp+4+i*4,v)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner+0x4000);cpu.emu_start(0x4a78a0,0x4a79c2,count=100000)
   assert cpu.reg_read(UC_X86_REG_EIP)==0x4a79c2
   cases.append(dict(terrainStartup=True,composed=True,nativeBitmaps=True,nativePalette=True,first=first,last=last,pattern=pattern,variant=variant,count=count,stream=stream.hex(),calls=calls,result=cpu.reg_read(UC_X86_REG_EAX),sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A78A0..004A79C2',method='32 original terrain constructor prefixes compose complete file/image/bitmap/palette/decompression loading. Full68KiB memory at callbacks and completion. Renderer palette access/submission, waterline rectangle clearing, CRT transport and heap allocation remain interfaces. Includes water percentages0/23/100/101. Theme archive construction and live startup remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} composed terrain sequences')
