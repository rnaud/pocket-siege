"""Execute original initial match setup through loadout construction and inventory import."""
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
camera=owner+0x800;table=owner+0x1000;groupTable=owner+0x1100
write(camera,table)
virtuals={owner+0x1800:0x20,owner+0x1900:0x2c}
write(table+0x20,owner+0x1800);write(table+0x2c,owner+0x1900);write(groupTable+0x20,owner+0x1800)
entries={0x4d1f80:1,0x4eba80:1,0x4e4ed0:3,0x4ebe10:1,0x4eaf40:0}
for entry,n in entries.items():cpu.mem_write(entry,b'\xc2'+struct.pack('<H',n*4))
for entry in virtuals:cpu.mem_write(entry,b'\xc2\x04\x00')
cpu.mem_write(0x492550,b'\xc3');cpu.mem_write(0x4924d0,b'\xc3');cpu.mem_write(0x492510,b'\xc3')
calls=[];cursor=heap+0x1000;allocation=0;failure=-1
def hook(cpu,entry,size,user):
 global cursor,allocation
 sp=cpu.reg_read(UC_X86_REG_ESP);at=cpu.reg_read(UC_X86_REG_ECX)
 if entry in [0x492550,0x4924d0]:
  kind='array' if entry==0x4924d0 else 'allocate';size=read(sp+(8 if kind=='array' else 4))
  value=0 if kind=='allocate' and allocation==failure else cursor
  if kind=='allocate':allocation+=1
  if value:cursor+=(size+15)&~15
  calls.append([kind,size,value]+([read(sp+4)] if kind=='array' else []));cpu.reg_write(UC_X86_REG_EAX,value)
 elif entry==0x492510:calls.append(['free',read(sp+4)])
 elif entry in virtuals:calls.append(['virtual',at,virtuals[entry],[read(sp+4)]])
 else:
  args=[read(sp+4+i*4) for i in range(entries[entry])];calls.append(['call',entry,at,args])
  if entry==0x4ed910:write(at+0x38,args[0])
  elif entry==0x4b1ae0:write(at+4,args[0])
  elif entry==0x4b2670:write(at+0x28,args[0]);write(at+0x24,args[1])
  cpu.reg_write(UC_X86_REG_EAX,at)
for entry in list(entries)+list(virtuals)+[0x492550,0x4924d0,0x492510]:cpu.hook_add(UC_HOOK_CODE,hook,begin=entry,end=entry)
cases=[]
for count in range(7):
 for variant in range(8):
  for failed in [-1,1,4] if count else [-1,1]:
   cpu.mem_write(context,bytes((i*17+5)&255 for i in range(0x20000)));cpu.mem_write(context+0x4886,bytes([count]))
   words=[[0x7d4,camera],[0x804,[-1,0,200,700][variant%4]],[0x1b8d4,[0,100<<16,-65536,0x7fffffff][variant%4]],[0x81c,[-1,0,100,1000][variant%4]]]
   for team in range(6):
    base=0x1b94+(team+1)*0x51c;words.extend([[base-12,1 if variant%3==0 else 0],[base,8]])
    for worm in range(8):words.append([base-0x49c+worm*0x9c,[0,100,200,-5,0x7fffffff][(variant+worm)%5]])
   for offset,value in words:write(context+offset,value)
   cpu.mem_write(heap,bytes((i*7+3)&255 for i in range(0x10000)))
   cursor=heap+0x1000;allocation=0;failure=failed;calls.clear();sp=stack+0xf000
   for i,value in enumerate([stop,context,context+0x47a8]):write(sp+i*4,value)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,heap)
   cpu.emu_start(0x4eaad0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   cases.append(dict(count=count,words=words,failure=failure,calls=list(calls),sha256=hashlib.sha256(cpu.mem_read(heap,0x10000)).hexdigest(),scene_sha256=hashlib.sha256(cpu.mem_read(context,0x20000)).hexdigest()))
taskCases=[]
for children in [0,1,15,16,17,31,32,33]:
 cpu.mem_write(heap,bytes((i*7+3)&255 for i in range(0x10000)))
 cursor=heap+0x4000;allocation=0;failure=-1;calls.clear()
 def invoke(entry,at,arguments):
  sp=stack+0xf000
  for i,value in enumerate([stop]+arguments):write(sp+i*4,value)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,at)
  cpu.emu_start(entry,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 invoke(0x4b1ae0,heap,[0]);invoke(0x4b2670,heap,[20,0])
 for i in range(children):
  at=heap+0x400+i*0x40;invoke(0x4b1ae0,at,[heap]);invoke(0x4b2670,at,[20 if i%2 else 3,0 if i%2 else 1])
 taskCases.append(dict(children=children,calls=list(calls),sha256=hashlib.sha256(cpu.mem_read(heap,0x10000)).hexdigest()))
eventCases=[]
cpu.mem_write(0x4b26f0,b'\xc2\x10\x00')
def forwardHook(cpu,entry,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);calls.append([read(sp+4+i*4) for i in range(4)])
cpu.hook_add(UC_HOOK_CODE,forwardHook,begin=0x4b26f0,end=0x4b26f0)
for event in range(0x3e8,0x44c):
 for initial in [0,1,255]:
  for action in [-1,0,1]:
   cpu.mem_write(heap,bytes((i*7+3)&255 for i in range(0xa0)))
   cpu.mem_write(heap-0x3ac+event,bytes([initial]));calls.clear();sp=stack+0xf000
   if action>=0:
    write(sp,stop);write(sp+4,event);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,heap)
    cpu.emu_start(0x4ea940 if action else 0x4ea950,stop,count=100)
   eventArgs=[0x12345678,event,4,0xdeadbeef]
   for i,value in enumerate([stop]+eventArgs):write(sp+i*4,value)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,heap)
   cpu.emu_start(0x4eaaa0,stop,count=1000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   eventCases.append(dict(event=event,initial=initial,action=action,calls=list(calls),sha256=hashlib.sha256(cpu.mem_read(heap,0xa0)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004EAAD0',method='Original world constructor orchestration and global event group plus inventory health execute. Event-group construction, context inheritance and subscriptions also execute; Base task construction, child attachment and registry insertion also execute; other child constructors, object population, presentation and allocation/services remain interfaces.',cases=cases,event_cases=eventCases,task_cases=taskCases),separators=(',',':'))+'\n')
print('Captured',len(cases),'world initializations')
