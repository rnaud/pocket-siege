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
