"""Execute the original complete HUD image table loader and work bitmap allocation."""
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
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return result.decode('latin1')
def hook(cpu,address,size,user):
 global images,table
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x492550:calls.append(['allocate',read(sp+4),snapshot()]);ret(0 if mode&2 else owner+0x8000)
 elif address==0x4924d0:calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(owner+0x9000)
 elif address==stop+0x100:calls.append(['palette',cpu.reg_read(UC_X86_REG_ECX),read(sp+4),snapshot()]);ret(0x12345678,4)
 elif address==stop+0x200:
  fmt=cstring(read(sp+8));arg=read(sp+12);value=fmt%(cstring(arg) if '%s' in fmt else arg);cpu.mem_write(read(sp+4),value.encode()+b'\0');ret(len(value))
 elif address==0x492710:
  images+=1;name=cstring(read(sp+12));calls.append(['image',read(sp+4),read(sp+8),name,snapshot()]);ret(0 if mode&1 and images%7==0 else owner+0x2000+images*0x40)
 elif address==0x4cb94c:
  table=[];at=sp+0x10
  while read(at):table.append([read(at),cstring(read(at+4))]);at+=8
write(0x5178f4,stop+0x200)
for a in [0x492550,0x4924d0,0x492710,stop+0x100,stop+0x200,0x4cb94c]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,0xa5]:
 for mode in range(4):
  calls=[];images=0;cpu.mem_write(owner,bytes([pattern])*0x10000)
  write(owner+8,owner+0x6000);write(owner+0x6000,owner+0x6100);write(owner+0x6114,stop+0x100)
  sp=stack+0xf000;write(sp,stop);write(sp+4,owner);write(sp+8,0x11223344)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4cb380,stop,count=1000000)
  assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(pattern=pattern,mode=mode,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,icons=table,entry='004CB380',method='Eight full original HUD loader sequences capture weapon icon ID/name order,71-slot clearing, status/wind/girder/number image slots and native181x17 work bitmap creation. Full64KiB memory matches at callbacks and completion, including failed image loads and final bitmap allocation failure. Renderer palette, named archive loading, sprintf and heap remain interfaces. Full archive composition and live scene ownership remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} HUD sequences with {len(table)} icon pairs and {images} image requests each')
