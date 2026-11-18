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
archive_data=[(args.executable.parents[2]/name).read_bytes() for name in ['DATA/CUSTOM/SNOW/LEVEL.DIR','DATA/WATER/BLUE/WATER.DIR']]
archive_sources=[]
for data_ in archive_data:
 offset=struct.unpack_from('<I',data_,8)[0]+4
 archive_sources.append(dict(sha256=hashlib.sha256(data_).hexdigest(),header=data_[:12].hex(),offset=offset,index=data_[offset:].hex()))

def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(compressed,0x1000))+bytes(cpu.mem_read(0x560230,4))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return result.decode('latin1')
def hook(cpu,address,size,user):
 global cursor,color_index,bitmap,pixels,archives
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==stop+0xb00:
  value=cstring(read(sp+8)).replace('%s',cstring(read(sp+12)));cpu.mem_write(read(sp+4),value.encode('latin1')+b'\0');ret(len(value))
 elif address==stop+0xc00:
  file,offset,origin=[read(sp+i*4) for i in range(1,4)];calls.append(['seek',file,offset,origin,snapshot()]);archive_cursors[file-0x5001]=offset;ret(0)
 elif address==stop+0x800:calls.append(['palette',receiver,read(sp+4),snapshot()]);ret(owner+0x8000,4)
 elif address==stop+0x900:calls.append(['submit',receiver,read(sp+4),snapshot()]);ret(0,4)
 elif address==stop+0x600:
  path=read(sp+4);path=path if path==owner+0x800 else cstring(path)
  calls.append(['open',path,'rb',snapshot()]);ret(0x1234 if isinstance(path,int) else (0 if variant&(1<<(archives-1)) else 0x5000+archives))
 elif address==stop+0x700:calls.append(['close',read(sp+4),snapshot()]);ret()
 elif address==stop+0x100:calls.append(['tell',read(sp+4),snapshot()]);ret(cursor)
 elif address==stop+0x200:
  dest,n,count,file=[read(sp+i*4) for i in range(1,5)]
  calls.append(['read','scratch' if stack<=dest<stack+0x10000 else dest,n,count,file,snapshot()])
  if file==0x1234:chunk=stream[cursor:cursor+n*count];cursor+=len(chunk)
  else:
   index=file-0x5001;position=archive_cursors[index];chunk=archive_data[index][position:position+n*count];archive_cursors[index]+=len(chunk)
  if chunk:cpu.mem_write(dest,chunk)
  ret(len(chunk)//n if n else 0)
 elif address==stop+0x300:ret(0 if bytes(cpu.mem_read(read(sp+4),4))==bytes(cpu.mem_read(read(sp+8),4)) else 1)
 elif address==0x492550:
  calls.append(['allocate',read(sp+4),snapshot()])
  if read(sp+4)==0x19c:archives+=1;ret(owner+0x7000+(archives-1)*0x200)
  else:bitmap+=0x40;pixels=owner+0x2000+(bitmap-owner-0x1000)//0x40*0x400;ret(bitmap)
 elif address==0x4924d0:
  calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(owner+0x9000+(archives-1)*0x2000 if read(sp+4)==0x560220 else pixels)
for iat,target in [(0x5178ec,stop+0xc00),(0x5178f4,stop+0xb00),(0x51794c,stop+0x600),(0x51793c,stop+0x700),(0x517940,stop+0x100),(0x517930,stop+0x200),(0x51796c,stop+0x300)]:write(iat,target)
for address in [stop+0xb00,stop+0xc00,stop+0x800,stop+0x900,stop+0x100,stop+0x200,stop+0x300,stop+0x600,stop+0x700,0x492550,0x4924d0]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for pattern in [0,0xa5]:
 for variant in range(4):
  for count in [0,1,8,32]:
   cursor=0;archive_cursors=[0,0];archives=0;color_index=0;calls=[];bitmap=owner+0x1000;pixels=0
   cpu.mem_write(owner,bytes([pattern])*0x10000);cpu.mem_write(stack,bytes([pattern])*0x10000);cpu.mem_write(compressed,bytes([pattern])*0x1000)
   cpu.mem_write(0x560230,bytes([pattern])*4)
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
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner+0x4000);cpu.emu_start(0x4a78a0,0x4a7a67,count=100000)
   assert cpu.reg_read(UC_X86_REG_EIP)==0x4a7a67
   cases.append(dict(nativeDirectories=True,terrainStartup=True,themeArchives=True,nativeRectangles=True,composed=True,nativeBitmaps=True,nativePalette=True,first=first,last=last,pattern=pattern,variant=variant,count=count,stream=stream.hex(),calls=calls,result=cpu.reg_read(UC_X86_REG_EAX),sha256=snapshot()))
args.output.write_text(json.dumps(dict(archive_sources=archive_sources,executable_sha256=digest,entry='004A78A0..004A7A67',method='32 original terrain constructor prefixes compose complete file/image/bitmap/palette/decompression loading. Full68KiB plus shared signature memory at callbacks and completion. Renderer palette access/submission, CRT transport and heap allocation remain interfaces. Includes water percentages0/23/100/101. Native rectangle clipping and1/8-bit clearing execute. Original theme archive constructors and004CC460 file opening execute, including real CUSTOM/SNOW/LEVEL.DIR and WATER/BLUE/WATER.DIR directory reading and pointer relocation. File-backed virtual read/seek/view implementations execute. Remaining terrain construction and live startup remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} composed terrain sequences')
