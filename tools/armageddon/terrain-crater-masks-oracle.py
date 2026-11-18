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
cpu.mem_map(owner,0x50000)
for address in [stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


# Imported CRT _ftol transport: truncate ST0 to signed64-bit, then pop it.
cpu.mem_write(stop+0x100,struct.pack('<H',0x0f7f))
cpu.mem_write(0x504110,b'\xd9\x2d'+struct.pack('<I',stop+0x100)+b'\x83\xec\x08\xdf\x3c\x24\x58\x5a\xc3')
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x50000))).hexdigest()
def ret(value):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global allocated
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x492550:
  allocated+=1;calls.append(['allocate',read(sp+4),snapshot()]);ret(0 if failure and allocated==33 else owner+0x1000+allocated*0x40)
 elif address==0x4924d0:
  calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(0 if read(sp+4)==0x54a150 else owner+0x4000+(allocated-1)*0x2000)
for a in [0x492550,0x4924d0]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,0xa5]:
 for failure in [0,1]:
  allocated=0;calls=[];cpu.mem_write(owner,bytes([pattern])*0x50000)
  sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x4a8e50,stop,count=100000000)
  assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(pattern=pattern,failure=failure,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A8E50',method='Four complete original mask-construction sequences execute all33 bitmap constructors and48 circle fills, native clipped pixel writes and x87 square roots. Heap and imported CRT ftol are interfaces. Full320KiB memory matches at allocation callbacks and completion; includes retained memory patterns and final work-bitmap allocation failure. Live ownership and complete terrain construction remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} terrain mask construction sequences')
