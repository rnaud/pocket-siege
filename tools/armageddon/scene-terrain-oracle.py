"""Execute original scene working bitmap and terrain constructor dispatch."""
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


def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x100000))+bytes(cpu.mem_read(stack+0x8010,0xd10))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global allocations
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==0x492550:
  allocations+=1;calls.append(['allocate',read(sp+4),snapshot()])
  if mutation:write(owner+0x5cd0,owner+(0x10000 if allocations==1 else 0x30000))
  ret(0 if failure==allocations else owner+(0x1000 if allocations==1 else 0x2000))
 elif address==0x4924d0:
  calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(owner+0x70000)
 elif address==0x492710:
  assert bytes(cpu.mem_read(read(sp+12),10))==b'masks.img\0'
  calls.append(['image',read(sp+4),read(sp+8),'masks.img',snapshot()])
  if mutation:write(owner+0x5cd0,owner+0x50000)
  ret(owner+0x4000)
 elif address==0x4a78a0:
  values=[read(sp+i*4) for i in range(1,9)]
  calls.append(['terrain',receiver,*values,snapshot()])
  write(values[4],3);write(values[5],123);write(values[6],456);write(values[7],78)
  if mutation:write(owner+0x5cd0,owner+0x10000)
  ret(receiver,32)
for a in [0x492550,0x4924d0,0x492710,0x4a78a0]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,0xa5]:
 for mutation in [False,True]:
  for failure in [0,1,2]:
   calls=[];allocations=0;cpu.mem_write(owner,bytes([pattern])*0x100000);cpu.mem_write(stack,bytes([pattern])*0x10000)
   write(owner+0x5cd0,owner+0x10000);write(owner+0x2ac,owner+0x6000)
   cpu.reg_write(UC_X86_REG_ESP,stack+0x8000);cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_EBP,owner+0x6100)
   cpu.emu_start(0x4a56ba,0x4a5781,count=1000000)
   assert cpu.reg_read(UC_X86_REG_EIP)==0x4a5781
   cases.append(dict(pattern=pattern,mutation=mutation,failure=failure,calls=calls,sha256=snapshot(),masks=cpu.reg_read(UC_X86_REG_ESI)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A56BA..004A5781',method='12 original caller sequences compose native1920x696 one-bit working bitmap construction, masks image lookup and terrain constructor dispatch. Full1MiB owner memory and caller-owned scratch match at callbacks and completion. Includes each header allocation failure and callback-mutated scene pointers. Named image and terrain constructor are interfaces in this caller capture; complete terrain constructor is verified separately and is the port default.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} scene terrain caller sequences')
