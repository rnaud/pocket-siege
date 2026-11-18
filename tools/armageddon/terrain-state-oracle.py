"""Execute the original terrain constructor tail and bitmap-backed collision shape."""
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
cpu.mem_map(owner,0x10000)
for address in [stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def ret(value):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x492550:
  calls.append(['allocate',read(sp+4),snapshot()]);ret(0 if failure&2 else owner+0x3000)
 elif address==0x4924d0:
  calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(0 if failure&1 else owner+0x4000)
for a in [0x492550,0x4924d0]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,0xa5]:
 for dimensions in [[1920,696,1920,696],[1,0,9,3],[0xffffffff,0x80000000,32,64]]:
  for failure in range(4):
   calls=[];cpu.mem_write(owner,bytes([pattern])*0x10000)
   for offset,bitmap,width,height in [(0x904,owner+0x1000,*dimensions[:2]),(0x908,owner+0x2000,*dimensions[2:])]:
    write(owner+offset,bitmap);write(bitmap,0x526328);write(bitmap+20,width);write(bitmap+24,height)
   sp=stack+0xf000;cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ESI,owner)
   cpu.emu_start(0x4a7b3a,0x4a7bec,count=10000)
   assert cpu.reg_read(UC_X86_REG_EIP)==0x4a7bec
   cases.append(dict(pattern=pattern,dimensions=dimensions,failure=failure,calls=calls,result=cpu.reg_read(UC_X86_REG_EAX),sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A7B3A..004A7BEC',method='24 original terrain constructor tails execute native bitmap dimension access and004CBFC0 collision-shape construction. Only heap allocation is an interface. Compare full64KiB retained memory at callbacks and completion, distinct layer dimensions and independent allocation failures. Does not establish full live terrain ownership.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} terrain constructor tails')
