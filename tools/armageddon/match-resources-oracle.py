"""Execute original match controller resource initialization."""
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


context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x2a0,context)
heap=0x2400000;cpu.mem_map(heap,0x10000)
# Observe allocation and font metrics; all grouping/list routines execute.
for address,code in [(0x492550,b"\xc3"),(0x4924d0,b"\xc3")]:cpu.mem_write(address,code)
resource=owner+0x800;table=owner+0x1000;metric=owner+0x1800
write(resource,table);write(table+0x28,metric);cpu.mem_write(metric,b'\xc2\x08\x00')
calls=[];cursor=heap+0x1000;allocation=0;failure=-1
def hook(cpu,address,size,user):
 global cursor,allocation
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x492550,0x4924d0]:
  kind='array' if address==0x4924d0 else 'allocate';size=read(sp+(8 if kind=='array' else 4))
  value=0 if kind=='allocate' and allocation==failure else cursor
  if value:cursor+=(size+15)&~15
  if kind=='allocate':allocation+=1
  calls.append([kind,size,value]+([read(sp+4)] if kind=='array' else []));cpu.reg_write(UC_X86_REG_EAX,value)
 elif address==metric:
  calls.append(['height',cpu.reg_read(UC_X86_REG_ECX),read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,8+count)
for address in [0x492550,0x4924d0,metric]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for count in [0,1,8,16]:
 for length in [0,1,5,15]:
  for failure in [-1,0,1,2,3,4,5,6]:
   cpu.mem_write(context,bytes((i*17+5)&255 for i in range(0x20000)));write(context+8,resource)
   cpu.mem_write(heap,bytes((i*7+3)&255 for i in range(0x10000)));write(heap+0x38,context)
   shorts=[[0x1b868,count],[0x1b8aa,length]]
   for i in range(16):shorts.extend([[0x1b848+i*2,[-1,32767,-32768,0,17,23,35,44][i%8]],[0x1b86a+i*2,4-i],[0x1b88a+i*2,100+i]])
   for offset,value in shorts:cpu.mem_write(context+offset,struct.pack('<h',value))
   cursor=heap+0x1000;allocation=0;calls.clear();sp=stack+0xf000;write(sp,stop)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,heap)
   cpu.emu_start(0x4b2ea0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   cases.append(dict(count=count,failure=failure,shorts=shorts,calls=list(calls),sha256=hashlib.sha256(cpu.mem_read(heap,0x10000)).hexdigest(),scene_sha256=hashlib.sha256(cpu.mem_read(context,0x20000)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004B2EA0',method='Original match resource setup with text and image constructors executed; only allocation and font metrics supplied. Full patterned heap/scene and call order compared across free-list, priority, signed ID and allocation boundaries.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'match resource setups')
