"""Execute the composed final original scene resource phase."""
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
cpu.mem_map(owner,0x100000)
for address in [stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x100000))+bytes(cpu.mem_read(stack+0x8218,4))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return result.decode('latin1')
def hook(cpu,address,size,user):
 global images,allocated
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==0x492550:
  calls.append(['allocate',read(sp+4),snapshot()]);allocated+=1;ret(owner+0x1000+allocated*0x40)
 elif address==0x4924d0:calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(owner+0x40000+allocated*0x4000 if read(sp+8) else 0)
 elif address==0x492590:calls.append(['free',read(sp+4),read(sp+8),snapshot()]);ret()
 elif address==0x492510:calls.append(['arrayFree',read(sp+4),snapshot()]);ret()
 elif address==stop+0x100:calls.append(['palette',receiver,read(sp+4),snapshot()]);ret(owner+(0x9000 if read(sp+4)==2 else 0x8000),4)
 elif address==stop+0x200:
  fmt=cstring(read(sp+8));arg=read(sp+12);value=fmt%(cstring(arg) if '%s' in fmt else arg);cpu.mem_write(read(sp+4),value.encode()+b'\0');ret(len(value))
 elif address==0x492710:
  images+=1;name=cstring(read(sp+12));calls.append(['image',read(sp+4),read(sp+8),name,snapshot()]);ret(owner+0x3000 if name=='fill.img' else owner+0xa000+images*0x40)
 elif address==stop+0x300:calls.append(['group',receiver,*[read(sp+i*4) for i in range(1,6)],snapshot()]);ret(0,20)
 elif address==stop+0x400:calls.append(['sprite',receiver,*[read(sp+i*4) for i in range(1,5)],cstring(read(sp+20)),read(sp+24),snapshot()]);ret(0,24)
 elif address==stop+0x500:calls.append(['draw',receiver,*[signed(read(sp+i*4)) for i in range(1,5)],snapshot()]);ret(0,16)
 elif address==stop+0x600:calls.append(['dimensions',receiver,snapshot()]);write(read(sp+4),641);write(read(sp+8),479);ret(0,8)
 elif address==stop+0x700:calls.append(['clear',receiver,*[signed(read(sp+i*4)) for i in range(1,6)],snapshot()]);ret(0,20)
 elif address==stop+0x800:calls.append(['present',receiver,snapshot()]);ret()
 elif address==stop+0x900:calls.append(['commit',receiver,read(sp+4),snapshot()]);ret(0,4)
write(0x5178f4,stop+0x200)
for a in [0x492550,0x4924d0,0x492590,0x492510,0x492710,*[stop+i*0x100 for i in range(1,10)]]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,0xa5]:
 for count in [0,1,3,6]:
  calls=[];images=0;allocated=0;initial=[];cpu.mem_write(owner,bytes([pattern])*0x100000);cpu.mem_write(stack,bytes([pattern])*0x10000)
  def init(offset,raw):initial.append([offset,raw.hex()]);cpu.mem_write(owner+offset,raw)
  def iw(offset,value):init(offset,struct.pack('<I',value&0xffffffff))
  def word(offset,value):init(offset,struct.pack('<H',value&65535))
  for offset,value in [(0,owner+0x6400),(0x6404,stop+0x300),(0x2b0,owner+0x5000),(0x5b20,0x11111111),(0x5b24,0x22222222),(0x2ac,0x33333333),(0x2b4,owner+0x6000),(0x5cd0,owner+0x10000),(0x10008,owner+0x6000),(0x6000,owner+0x6100),(0x6114,stop+0x100),(0x6170,stop+0x400),(0x6148,stop+0x500),(0x6104,stop+0x600),(0x6144,stop+0x700),(0x6160,stop+0x800),(0x6154,stop+0x900),(0x22454,0x123)]:iw(offset,value)
  for offset,value in [(0,0x5249b0),(4,0),(8,owner+0x3400),(12,8),(16,4),(20,1),(24,1),(28,0),(32,0),(36,1),(40,1)]:iw(0x3000+offset,value)
  init(0x3400,b'\x03');init(0x14886,bytes([count]))
  for bank in [1,2]:
   at=0x8000 if bank==1 else 0x9000
   iw(at+4,1);iw(at+8,7);word(at+0x90e,8)
   for i in range(8):
    word(at+0x910+i*2,i);init(at+0x60c+i,b'\x01')
    for c,m in enumerate([43,71,97] if bank==1 else [17,53,91]):word(at+12+i*6+c*2,(i*m+bank*20)&255)
  for team in range(6):
   colors=bytes(((i//3)*[43,71,97][i%3]+team)&255 for i in range(768))
   iw(0x148a0+team*3000,2 if team%2 else 0)
   init(0x148a4+team*3000,colors);init(0x14ba4+team*3000,bytes((i//24+i%24+team*7)%12 for i in range(768)))
   init(0x14ea4+team*3000,colors);init(0x151a4+team*3000,bytes((i//20+i%20+team*7)%12 for i in range(340)))
  cpu.reg_write(UC_X86_REG_ESP,stack+0x8000);cpu.reg_write(UC_X86_REG_EBX,owner)
  cpu.emu_start(0x4a5b30,0x4a5cb7,count=20000000)
  assert cpu.reg_read(UC_X86_REG_EIP)==0x4a5cb7
  cases.append(dict(pattern=pattern,count=count,initial=initial,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A5B30..004A5CB7',method='Eight composed original final resource sequences execute theme dispatch,HUD loader,custom flags,custom graves,native palette conversion,bitmap creation/destruction and final renderer cleanup together. Full1MiB memory and temporary palette compared at every external callback and completion.0/1/3/6 teams include skipped built-in graves. External named images,resource groups,renderer,heap and sprintf remain interfaces. Complete scene startup and live ownership remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} composed scene resource sequences')
