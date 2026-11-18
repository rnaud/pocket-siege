"""Execute original bitmap circle rasterizer with native clipped pixel writes."""
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


# Imported CRT _ftol transport: truncate ST0 to signed64-bit, then pop it.
cpu.mem_write(stop+0x100,struct.pack('<H',0x0f7f))
cpu.mem_write(0x504110,b'\xd9\x2d'+struct.pack('<I',stop+0x100)+b'\x83\xec\x08\xdf\x3c\x24\x58\x5a\xc3')
cases=[]
for bits in [1,8]:
 for pattern in [0,0xa5]:
  for clip in [[0,0,32,32],[3,2,29,27]]:
   for radius in [-1,0,1,2,6,11,17,100]:
    for center in [[16,16],[0,0],[31,31],[-10,4]]:
     for value in [0,1,256]:
      cpu.mem_write(owner,bytes([pattern])*0x10000)
      for offset,v in [(0,0x526328 if bits==1 else 0x5249b0),(8,owner+0x1000),(12,bits),(16,8 if bits==1 else 36),(20,32),(24,32),*[(28+i*4,v) for i,v in enumerate(clip)]]:write(owner+offset,v)
      sp=stack+0xf000;write(sp,stop)
      for i,v in enumerate([*center,radius,value]):write(sp+4+i*4,v)
      cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x492f10,stop,count=3000000)
      assert cpu.reg_read(UC_X86_REG_EIP)==stop
      cases.append(dict(bits=bits,pattern=pattern,clip=clip,radius=radius,center=center,value=value,result=cpu.reg_read(UC_X86_REG_EAX),sha256=hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='00492F10 +00492B10 /0048B780',method='768 original circle rasterizations with full64KiB memory. Original x87 square root and native clipped pixel writes execute; imported CRT ftol uses a truncating adapter. Covers1/8-bit images, negative/zero/positive radii, clipped and off-image centers, padded rows and nonboolean values.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} bitmap circle sequences')
