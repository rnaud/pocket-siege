"""Execute original match startup finalization with composed panel resources."""
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
rootTable=owner+0x3000;resetObject=owner+0x3100;resetTable=owner+0x3200
resetCall=owner+0x3300;sendCall=owner+0x3400
write(rootTable+8,sendCall);write(resetObject,resetTable);write(resetTable+4,resetCall)
for address,code in [(0x4b2ad0,b'\xc2\x08\x00'),(resetCall,b'\xc3'),(sendCall,b'\xc2\x10\x00')]:cpu.mem_write(address,code)
def finalHook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);at=cpu.reg_read(UC_X86_REG_ECX)
 if address==0x4b2ad0:
  calls.append(['root',at,read(sp+4),read(sp+8)]);write(at,rootTable);cpu.reg_write(UC_X86_REG_EAX,at)
 elif address==resetCall:calls.append(['reset',at])
 else:calls.append(['send',read(sp+4),read(sp+8),read(sp+12),read(read(sp+16))])
for address in [0x4b2ad0,resetCall,sendCall]:cpu.hook_add(UC_HOOK_CODE,finalHook,begin=address,end=address)
cases=[]
for count in range(7):
 for variant in range(17):
  groups=[[0,1,2,3,4,5],[0,0,0,0,0,0],[2,1,2,0,1,0],[-128,127,-1,-128,127,-1]][variant%4]
  cpu.mem_write(context,bytes((i*17+5)&255 for i in range(0x20000)))
  cpu.mem_write(context+0x4886,bytes([count]));write(context+8,resource);write(context+12,resetObject if variant%2 else 0)
  for team,group in enumerate(groups):cpu.mem_write(context+0x488b+team*3000,bytes([group&255]))
  for setting in range(1,5):cpu.mem_write(context+0x11d70+setting,bytes([255 if variant&(1<<(setting-1)) else 0]))
  cpu.mem_write(heap,bytes((i*7+3)&255 for i in range(0x10000)))
  cursor=heap+0x1000;allocation=0;failure=0 if variant==0 else (1+len(set(groups[:count]))*2+count*4 if variant==16 else -1);calls.clear()
  write(owner+4,0xdeadbeef);write(owner+0x4c,0xdeadbeef);write(owner+0x294,0xdeadbeef)
  cpu.reg_write(UC_X86_REG_ESP,stack+0xf000);cpu.reg_write(UC_X86_REG_ESI,owner)
  cpu.emu_start(0x49db9a,0x49dd00,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==0x49dd00
  cases.append(dict(count=count,variant=variant,groups=groups,failure=failure,calls=list(calls),owner=[read(owner+o) for o in [4,0x4c,0x294]],sha256=hashlib.sha256(cpu.mem_read(heap,0x10000)).hexdigest(),scene_sha256=hashlib.sha256(cpu.mem_read(context,0x20000)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='0049DB9A..0049DD00',method='Original startup finalization with full alliance/team/text/image constructors. Heap allocation, font metrics, optional scene interface and match-root construction/dispatch observed. Full heap and scene hashes and owner state compared.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'startup finalizations')
