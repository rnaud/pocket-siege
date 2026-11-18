"""Execute original fixed scene collision-shape table construction and source cleanup."""
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
owner, stack, stop = 0x2000000, 0x2100000, 0x2200000
cpu.mem_map(owner,0xa0000)
for address in [stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


source=json.loads(args.image.read_text());pixels=bytes(source['pixels'])
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0xa0000))).hexdigest()
def ret(value):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global allocated,descriptors
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x492550:
  allocated+=1;n=read(sp+4);calls.append(['allocate',n,snapshot()])
  if n==0x9c:descriptors+=1
  ret(0 if n==0x9c and descriptors==failure else owner+0x20000+allocated*0x100)
 elif address==0x4924d0:calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(owner+0x40000+allocated*0x400)
 elif address==0x492590:calls.append(['free',read(sp+4),read(sp+8),snapshot()]);ret(0)
for a in [0x492550,0x4924d0,0x492590]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,0xa5]:
 for failure in [0,1,6,8]:
  calls=[];allocated=0;descriptors=0;cpu.mem_write(owner,bytes([pattern])*0xa0000)
  cpu.mem_write(owner+0x10000,pixels)
  for offset,v in [(0,0x5249b0),(4,1),(8,owner+0x10000),(12,8),(16,512),(20,512),(24,64),(28,0),(32,0),(36,512),(40,64)]:write(owner+0x1000+offset,v)
  sp=stack+0xf000;write(sp,stop)
  write(owner+0x5cd0,owner+0x8000);write(owner+0x2b0,owner+0xa000);write(owner+0xa000,0x526588);write(owner+0xa0c4,0x11223344)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner+0x8000);cpu.reg_write(UC_X86_REG_EAX,owner+0xa000);cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_ESI,owner+0x1000);cpu.emu_start(0x4a5781,0x4a59cf,count=100000000)
  assert cpu.reg_read(UC_X86_REG_EIP)==0x4a59cf
  cases.append(dict(pattern=pattern,failure=failure,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,source=dict(width=source['width'],height=source['height'],pixels=pixels.hex(),sha256=hashlib.sha256(pixels).hexdigest()),entry='004A5781..004A59CF',method='Eight original scene table sequences build all eight fixed collision shapes with native32-plane construction, bind the original terrain collision shape and destroy the source bitmap. Includes descriptor allocation failures1/6/8 and retained memory patterns. Full640KiB memory at heap callbacks and completion. Only heap allocation/free are interfaces. Arrow-image shapes, surrounding startup composition and live ownership remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} native collision shape construction sequences')
