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


def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def ret(value=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global cursor,image_index,reads
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  calls.append(['open',read(sp+4),'rb',snapshot()]);ret(0 if fail else 0x1234)
 elif address==stop+0x200:
  dest,n,count,file=[read(sp+i*4) for i in range(1,5)]
  normalized=dest if owner<=dest<owner+0x10000 else 'scratch'
  calls.append(['read',normalized,n,count,file,snapshot()])
  chunk=stream[cursor:cursor+n*count];cursor+=len(chunk)
  if chunk:cpu.mem_write(dest,chunk)
  reads+=1
  ret(len(chunk)//n if n else 0)
 elif address==0x4f08e0:
  calls.append(['image',read(sp+4),read(sp+8),snapshot()])
  result=images[image_index];image_index+=1;ret(result)
 elif address==stop+0x300:calls.append(['close',read(sp+4),snapshot()]);ret()
for iat,target in [(0x51794c,stop+0x100),(0x517930,stop+0x200),(0x51793c,stop+0x300)]:write(iat,target)
for address in [stop+0x100,stop+0x200,stop+0x300,0x4f08e0]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for pattern in [0,0xa5]:
 for count in [0,1,8,32,0x20000000,0x20000001]:
  for variant in range(5):
   fail=variant==4;cursor=0;image_index=0;reads=0;calls=[]
   cpu.mem_write(owner,bytes([pattern])*0x10000)
   write(owner+8,0)
   names=[b'',b'a',bytes(range(1,256)),b'custom\\snow'][variant%4], [b'water\\blue',b'',b'X',b'water'][variant%4]
   stream=struct.pack('<7I',0x12345678,0,1920,696,77,23,count)+bytes((i*17)&255 for i in range((count<<3)&0xffffffff))
   stream+=bytes([len(names[0])])+names[0]+bytes([len(names[1])])+names[1]
   if variant==3:stream=stream[:30]
   images=[0x3100000,0 if variant==2 else 0x3200000,0x3300000]
   arguments=[owner+0x800,0x4567,owner,owner+4,owner+8,owner+0x100,owner+0x10,owner+0x14,owner+0x18,owner+0x400,owner+0x600]
   sp=stack+0xf000;write(sp,stop)
   for i,v in enumerate(arguments):write(sp+4+i*4,v)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4cc500,stop,count=10000)
   assert cpu.reg_read(UC_X86_REG_EIP)==stop
   cases.append(dict(pattern=pattern,count=count,variant=variant,stream=stream.hex(),images=images,calls=calls,result=cpu.reg_read(UC_X86_REG_EAX),sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004CC500',method='Original terrain wrapper with CRT stream transport and embedded image loader as interfaces. Full64KiB external output memory at every callback and return. Covers open failure, short reads, ignored header values, zero and wrapped position sizes, null image results and length-prefixed names. Embedded IMG decoding and live terrain construction remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} terrain reader sequences')
