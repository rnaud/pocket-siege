"""Execute original final scene renderer and temporary palette cleanup."""
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


def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x18000-0x100))+bytes(cpu.mem_read(owner+0x18218,4))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==stop+0x100:
  calls.append(['dimensions',receiver,snapshot()]);write(read(sp+4),width);write(read(sp+8),height)
  if mutation:write(owner+0x8008,owner+0x6200)
  ret(0,8)
 elif address==stop+0x200:calls.append(['clear',receiver,*[signed(read(sp+i*4)) for i in range(1,6)],snapshot()]);ret(0,20)
 elif address==stop+0x300:calls.append(['present',receiver,snapshot()]);ret()
 elif address==stop+0x400:
  calls.append(['draw',receiver,*[signed(read(sp+i*4)) for i in range(1,5)],snapshot()])
  if mutation:write(owner+0x2b4,owner+0x6200)
  ret(0,16)
 elif address==stop+0x500:
  calls.append(['commit',receiver,read(sp+4),snapshot()])
  if mutation:write(owner+0x2b4,owner+(0x6000 if receiver==owner+0x6200 else 0x6200))
  ret(0,4)
for a in [stop+0x100,stop+0x200,stop+0x300,stop+0x400,stop+0x500]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,0xa5]:
 for mutation in [False,True]:
  for width,height in [(640,480),(641,479),(-641,-479),(-2147483648,2147483647)]:
   calls=[];cpu.mem_write(owner,bytes([pattern])*0x20000)
   for offset,value in [(0x2b4,owner+0x6000),(0x5cd0,owner+0x8000),(0x8008,owner+0x6000),(0x6000,owner+0x6100),(0x6200,owner+0x6100),(0x6104,stop+0x100),(0x6144,stop+0x200),(0x6160,stop+0x300),(0x6148,stop+0x400),(0x6154,stop+0x500)]:write(owner+offset,value)
   # Place the original caller's stack inside captured memory so its temporary
   # palette destruction is checked alongside every renderer callback.
   cpu.reg_write(UC_X86_REG_ESP,owner+0x18000);cpu.reg_write(UC_X86_REG_EBX,owner)
   cpu.emu_start(0x4a5c61,0x4a5cb7,count=100000)
   assert cpu.reg_read(UC_X86_REG_EIP)==0x4a5cb7
   cases.append(dict(pattern=pattern,mutation=mutation,width=width,height=height,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A5C61..004A5CB7',method='Original renderer finishing sequence including native004A6820 clear/present and004ADB60 temporary palette destruction.16 cases cover signed/odd dimensions and callback-mutated renderer pointers. Renderer calls remain interfaces. Stack scratch excluded from hashes except temporary palette.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} scene finishing sequences')
