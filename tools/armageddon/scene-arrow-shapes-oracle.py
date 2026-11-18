"""Execute original32-arrow startup image and collision-shape setup."""
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
parser.add_argument('--image',type=Path,required=True)
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
owner, stack, stop = 0x3000000, 0x2100000, 0x2200000
cpu.mem_map(owner,0x200000)
for address in [stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


sources=json.loads(args.image.read_text())
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x200000))).hexdigest()
def ret(value,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return result.decode('latin1')
def hook(cpu,address,size,user):
 global allocated,descriptors
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x492550:
  allocated+=1;n=read(sp+4);calls.append(['allocate',n,snapshot()])
  if n==0x9c:descriptors+=1
  ret(0 if n==0x9c and descriptors==failure else owner+0x70000+allocated*0x100)
 elif address==0x4924d0:calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(owner+0xc0000+allocated*0x400)
 elif address==stop+0x100:
  calls.append(['palette',cpu.reg_read(UC_X86_REG_ECX),read(sp+4),snapshot()]);ret(owner+0x9000,4)
 elif address==stop+0x200:
  value=cstring(read(sp+8))%read(sp+12);cpu.mem_write(read(sp+4),value.encode()+b'\0');ret(len(value))
 elif address==0x492710:
  name=cstring(read(sp+12));calls.append(['image',read(sp+4),read(sp+8),name,snapshot()]);ret(owner+0x10000+int(name[5:7])*0x40)
write(0x5178f4,stop+0x200)
for a in [0x492550,0x4924d0,0x492710,stop+0x100,stop+0x200]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,0xa5]:
 for failure in [0,16]:
  calls=[];allocated=0;descriptors=0;cpu.mem_write(owner,bytes([pattern])*0x200000)
  for i,source in enumerate(sources):
   pixels=owner+0x20000+i*0x2000;cpu.mem_write(pixels,bytes(source['pixels']))
   for offset,v in [(0,0x5249b0),(4,1),(8,pixels),(12,8),(16,60),(20,60),(24,60),(28,0),(32,0),(36,60),(40,60)]:write(owner+0x10000+i*0x40+offset,v)
  write(owner+0x5cd0,owner+0xc000);write(owner+0x2ac,owner+0x7000);write(owner+0xc008,owner+0x6000);write(owner+0x6000,owner+0x6100);write(owner+0x6114,stop+0x100)
  cpu.reg_write(UC_X86_REG_ESP,stack+0xf000);cpu.reg_write(UC_X86_REG_EBX,owner);cpu.emu_start(0x4a59cf,0x4a5a69,count=100000000)
  assert cpu.reg_read(UC_X86_REG_EIP)==0x4a5a69
  cases.append(dict(pattern=pattern,failure=failure,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,sources=[dict(name=s['name'],sha256=hashlib.sha256(bytes(s['pixels'])).hexdigest()) for s in sources],entry='004A59CF..004A5A69',method='Four complete original32-arrow setup loops use real decoded arrow image pixels. All owned collision constructors and32 shifted bitmap planes run natively, including middle descriptor allocation failure. Full2MiB memory matches at external callbacks and completion. Heap, renderer palette, named image loading and sprintf are interfaces. Archive decoding composition and live startup ownership remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} original32-arrow setup sequences')
