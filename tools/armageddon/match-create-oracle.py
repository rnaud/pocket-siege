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
heap=0x2400000;cpu.mem_map(heap,0x40000)
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

music=owner+0x3000;musicTable=owner+0x3100;musicCall=owner+0x3200
write(music,musicTable);write(musicTable+16,musicCall);cpu.mem_write(musicCall,b'\xc2\x08\x00')
def rootHook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);at=cpu.reg_read(UC_X86_REG_ECX)
 calls.append(['music',at,read(sp+4),read(sp+8)])
cpu.hook_add(UC_HOOK_CODE,rootHook,begin=musicCall,end=musicCall)
camera=owner+0x4000;table=owner+0x4100;groupTable=owner+0x4200
write(camera,table)
virtuals={owner+0x4300:0x20,owner+0x4400:0x2c}
write(table+0x20,owner+0x4300);write(table+0x2c,owner+0x4400);write(groupTable+0x20,owner+0x4300)
entries={0x4d1f80:1,0x4eba80:1,0x4d5a40:4,0x500170:2,0x4ffed0:8,0x4ebe10:1,0x4eaf40:0}
for entry,n in entries.items():cpu.mem_write(entry,b'\xc2'+struct.pack('<H',n*4))
for entry in virtuals:cpu.mem_write(entry,b'\xc2\x04\x00')
cpu.mem_write(0x492550,b'\xc3')
def worldHook(cpu,entry,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);at=cpu.reg_read(UC_X86_REG_ECX)
 if entry in virtuals:calls.append(['virtual',at,virtuals[entry],[read(sp+4)]])
 else:
  args=[read(sp+4+i*4) for i in range(entries[entry])];calls.append(['call',entry,at,args])
  if entry==0x4ed910:write(at+0x38,args[0])
  elif entry==0x4b1ae0:write(at+4,args[0])
  elif entry==0x4b2670:write(at+0x28,args[0]);write(at+0x24,args[1])
  cpu.reg_write(UC_X86_REG_EAX,at)
for entry in list(entries)+list(virtuals):cpu.hook_add(UC_HOOK_CODE,worldHook,begin=entry,end=entry)
cases=[]
for count in range(7):
 for variant in range(16):
  cpu.mem_write(context,bytes((i*17+5)&255 for i in range(0x20000)));write(context+8,resource);write(context+20,music if variant&1 else 0)
  words=[[0x7d4,camera],[0x804,[-1,0,200,700][variant%4]],[0x1b8d4,0],[0x81c,0],[0x1acc,variant*12345],[0x1b94+0x1eb4,count]]
  bytewrites=[[0x4886,count],[0x114e0,count],[0x11b96,[0,1,127,255][variant%4]],[0x11d5d,(variant>>1)&1],[0x11e44,[0,1,127,255][variant%4]]]
  shorts=[[0x11d4a,[0,1,65535,60][variant%4]],[0x1b868,3],[0x1b8aa,3]]
  for i in range(16):shorts.extend([[0x1b848+i*2,i-8],[0x1b86a+i*2,5-i],[0x1b88a+i*2,100+i]])
  for team in range(6):
   base=0x1b94+team*0x51c
   words.extend([[base+0x510,1 if variant%3==0 else 0],[base+0x51c,8]])
   for worm in range(8):words.extend([[base+0x24+worm*0x9c,100 if worm==(variant%8) and team==variant%6 else 1],[base+0x80+worm*0x9c,(variant+1)*10]])
   bytewrites.append([0x543c+team*3000,variant%3]);bytewrites.append([0x114e2+team*0x11e,[-128,-1,0,1,5,127][team]&255])
  for offset,value in words:write(context+offset,value)
  for offset,value in shorts:cpu.mem_write(context+offset,struct.pack('<H',value&65535))
  for offset,value in bytewrites:cpu.mem_write(context+offset,bytes([value]))
  cpu.mem_write(heap,bytes((i*7+3)&255 for i in range(0x40000)))
  cursor=heap+0x1000;allocation=0;failure=1 if variant==0 else -1;calls.clear();sp=stack+0xf000
  for i,value in enumerate([stop,context,context+0x47a8]):write(sp+i*4,value)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,heap)
  cpu.emu_start(0x4b2ad0,stop,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(count=count,variant=variant,words=words,bytes=bytewrites,shorts=shorts,failure=failure,calls=list(calls),sha256=hashlib.sha256(cpu.mem_read(heap,0x40000)).hexdigest(),scene_sha256=hashlib.sha256(cpu.mem_read(context,0x20000)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004B2AD0',method='Original fresh match-root constructor with rotation, deployment inventory query/write and complete resource constructors. World initialization, event-group construction and global event subscription execute; base task attachment and registry execute; other child constructors, object population, presentation and external services remain observed interfaces.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'match root initializations')
