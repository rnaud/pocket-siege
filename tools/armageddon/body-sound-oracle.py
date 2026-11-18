"""Execute body sound wrappers 004EDB90/004EDC10/004EDC30; only the backend virtual interface is substituted."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('executable', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--contacts', action='store_true')
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]

if args.contacts:
 context=0x2300000;cpu.mem_map(context,0x40000)
 body_table=owner+0x2000;backend=owner+0x1000;device_table=owner+0x3000
 other=owner+0x4000;other_table=owner+0x5000
 calls=[]
 def state(): return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x40000))).hexdigest()
 def callback(cpu,address,size,user):
  name,argc={stop+0x100:('start',5),stop+0x200:('stop',1),stop+0x300:('accept',2),stop+0x400:('respond',2)}[address]
  sp=cpu.reg_read(UC_X86_REG_ESP)
  values=list(struct.unpack('<'+'i'*argc,cpu.mem_read(sp+4,argc*4)))
  calls.append([name,cpu.reg_read(UC_X86_REG_ECX),values,state()])
  if name=='stop' and mutation:
   write(owner+0x38,context+0x20000);write(owner+0xf4,77)
  if name=='start':
   write(owner+0xf4,88);write(owner+0x9c,54321)
  if name=='respond':write(owner+0xa0,98765)
  result=accepted if name=='accept' else -9 if name=='start' else 1
  cpu.reg_write(UC_X86_REG_EAX,result & 0xffffffff)
 for address,argc in [(stop+0x100,5),(stop+0x200,1),(stop+0x300,2),(stop+0x400,2)]:
  cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4));cpu.hook_add(UC_HOOK_CODE,callback,begin=address,end=address)
 cases=[]
 for entry in [0x4e8ba0,0x4d5570,0x4d15f0]:
  for suppressed in [-1,0,1]:
   for present in [0,1]:
    for previous in [0,-1,123]:
     for quake in [0,65536]:
      for vx,vy in [(0,0),(65536,-32768),(-2147483648,0),(2147483647,2147483647),(-1,1)]:
       for mutation in [0,1]:
        accepted=mutation;side=3 if quake else 2
        words=[(owner,body_table),(owner+0x38,context),(owner+0xf4,previous),(owner+0x9c,vx),(owner+0xa0,vy),
          (body_table+0x2c,entry),(body_table+0x60,0x4d0f70),(body_table+0x48,0x4f4260),(body_table+0x24,stop+0x400),
          (other,other_table),(other_table+0x28,stop+0x300),(backend,device_table),
          (device_table+0x10,stop+0x100),(device_table+0x28,stop+0x200),
          (context+0xc,backend if present else 0),(context+0x1d448,suppressed),(context+0x1ac4,quake),
          (context+0x20000+0xc,backend),(context+0x20000+0x1d448,0 if suppressed else 1)]
        cpu.mem_write(owner,bytes(0x10000));cpu.mem_write(context,bytes(0x40000))
        for address,value in words:write(address,value & 0xffffffff)
        calls=[];sp=stack+0xf000
        for i,value in enumerate([stop,other,side]):write(sp+i*4,value)
        cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
        cpu.emu_start(entry,stop,count=1000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
        cases.append(dict(words=words,side=side,mutation=mutation,accepted=accepted,calls=calls,sha256=state()))
 args.output.write_text(json.dumps(dict(executableSha256=digest,cases=cases),separators=(',',':'))+'\n')
 print(f'Wrote {len(cases)} composed impact sound/contact cases')
 raise SystemExit

context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
backend,vtable=owner+0x1000,owner+0x2000;write(backend,vtable)
operations=[('start',0x4edb90,0x10,5),('finished',0x4edc10,0x24,1),('stop',0x4edc30,0x28,1)]
calls=[];backend_result=0
for index,(name,entry,offset,argc) in enumerate(operations):
 address=stop+0x100+index*0x10;write(vtable+offset,address);cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
 def hook(cpu,address,size,user,argc=argc,name=name):
  sp=cpu.reg_read(UC_X86_REG_ESP);calls.append([name,list(struct.unpack('<'+str(argc)+'i',cpu.mem_read(sp+4,argc*4)))]);cpu.reg_write(UC_X86_REG_EAX,backend_result & 0xffffffff)
 cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for name,entry,offset,argc in operations:
 for suppressed in [-1,0,1]:
  for present in [False,True]:
   for backend_result in [-1,0,1,32]:
    for value in [-2147483648,-1,0,1,32,2147483647]:
     request=[value,-3,32768,65536,-12345][:argc]
     write(context+0xc,backend if present else 0);write(context+0x1d448,suppressed & 0xffffffff)
     calls=[];sp=stack+0xf000
     for i,word in enumerate([stop,*request]):write(sp+i*4,word & 0xffffffff)
     cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
     cpu.emu_start(entry,stop,count=100);assert cpu.reg_read(UC_X86_REG_EIP)==stop
     result=struct.unpack('<i',struct.pack('<I',cpu.reg_read(UC_X86_REG_EAX)))[0]
     cases.append(dict(operation=name,suppressed=suppressed,present=present,backendResult=backend_result,request=request,result=result,calls=calls))
args.output.write_text(json.dumps(dict(executableSha256=digest,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} body sound wrapper cases')
