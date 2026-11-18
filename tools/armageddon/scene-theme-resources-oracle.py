"""Execute original terrain-theme resource ordering and water-color sampling."""
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
cpu.mem_map(owner,0x20000)
for address in [stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x20000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return result.decode('latin1')
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==0x4924d0:calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret()
 elif address==stop+0x100:calls.append(['palette',receiver,read(sp+4),snapshot()]);ret(owner+0x5000+read(sp+4)*0x100,4)
 elif address==stop+0x200:
  calls.append(['sprite',receiver,*[read(sp+i*4) for i in range(1,5)],cstring(read(sp+20)),read(sp+24),snapshot()])
  if mode&2:write(owner+0x2b4,owner+(0x6200 if receiver==owner+0x6000 else 0x6000))
  ret(0,24)
 elif address==stop+0x300:calls.append(['group',receiver,*[read(sp+i*4) for i in range(1,6)],snapshot()]);ret(0,20)
 elif address==0x492710:
  name=cstring(read(sp+12));calls.append(['image',read(sp+4),read(sp+8),name,snapshot()])
  if name=='gradient.img' and mode&1:write(owner+0x5cd0,owner+0xa000)
  ret(owner+(0x3200 if name=='gradient.img' else 0x3000))
 elif address==0x492510:calls.append(['arrayFree',read(sp+4),snapshot()]);ret()
 elif address==0x492590:calls.append(['free',read(sp+4),read(sp+8),snapshot()]);ret()
for a in [0x4924d0,0x492710,0x492510,0x492590,stop+0x100,stop+0x200,stop+0x300]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,0xa5]:
 for mode in range(4):
  calls=[];cpu.mem_write(owner,bytes([pattern])*0x20000)
  for offset,value in [(0,owner+0x6400),(0x6404,stop+0x300),(0x2b0,owner+0x1000),(0x1b20,0x11111111),(0x1b24,0x22222222),(0x2ac,0x33333333),(0x2b4,owner+0x6000),(0x5cd0,owner+0x8000),(0x8008,owner+0x6000),(0xa008,owner+0x6200),(0x6000,owner+0x6100),(0x6200,owner+0x6300),(0x6114,stop+0x100),(0x6314,stop+0x100),(0x6170,stop+0x200),(0x6370,stop+0x200)]:write(owner+offset,value)
  for offset,value in [(0,0x5249b0),(4,(mode>>1)&1),(8,owner+0x4000),(12,8),(16,4),(20,1),(24,1),(28,0),(32,0),(36,0 if mode&1 else 1),(40,1)]:write(owner+0x3000+offset,value)
  cpu.mem_write(owner+0x4000,bytes([17+mode]))
  cpu.reg_write(UC_X86_REG_ESP,stack+0xf000);cpu.reg_write(UC_X86_REG_EBX,owner)
  cpu.emu_start(0x4a5b30,0x4a5c30,count=100000)
  assert cpu.reg_read(UC_X86_REG_EIP)==0x4a5c30
  cases.append(dict(pattern=pattern,mode=mode,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A5B30..004A5C30',method='Eight original scene-theme resource sequences verify resource group dispatch, gradient and sprite ordering, palette banks, native water-color sample and bitmap destruction. Full128KiB memory at callbacks and completion, including callback-mutated scene/renderer pointers, clipping and owned/borrowed fill pixels. Heap,renderer and archive loading remain interfaces; full startup and live integration remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} theme resource setup sequences')
