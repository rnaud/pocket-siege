"""Execute original streamed sprite construction and deleting destructor."""
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
owner, stack, stop, source = 0x2000000, 0x2100000, 0x2200000, 0x2400000
for address,length in [(owner,0x10000),(stack,0x10000),(stop,0x1000),(source,0x400000)]:cpu.mem_map(address,length)
def write(address,value):cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address):return struct.unpack('<I',cpu.mem_read(address,4))[0]
def call(entry,values,receiver):
 sp=stack+0xf000
 for i,v in enumerate([stop]+values):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ECX,receiver);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(entry,stop,count=10000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Parser did not return')
 return cpu.reg_read(UC_X86_REG_EAX)
sprite=owner+0x1000;renderer=owner+0x2000;table=owner+0x3000;alternate=owner+0x4000
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x49a4b0:
  slot=read(sp+4);events.append(['surface',cpu.reg_read(UC_X86_REG_ECX),slot,snapshot()]);write(slot,0)
  if mutate:write(sprite+112,alternate)
  ret(0,4)
 elif address==0x492510:events.append(['array',read(sp+4),snapshot()]);ret()
 elif address==0x492590:events.append(['free',read(sp+4),read(sp+8),snapshot()]);ret()
for address in [0x49a4b0,0x492510,0x492590]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for pattern in [0,165]:
 for count in [-1,0,1,3]:
  for flags in [0,1]:
   for mutate in [False,True]:
    cpu.mem_write(owner,bytes([pattern])*0x10000);call(0x4afc60,[renderer],sprite);initial=snapshot()
    write(sprite+112,table);cpu.mem_write(sprite+106,struct.pack('<h',count))
    for at in [table,alternate]:
     for i in range(3):write(at+i*12+8,owner+0x5000+i*32 if i!=1 else 0)
    events=[];result=call(0x4afc80,[flags],sprite)
    cases.append(dict(pattern=pattern,count=count,flags=flags,mutate=mutate,initial=initial,events=events,result=result,state=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004AFC60/004AFC80',method='Original streamed constructor and deleting destructor execute unchanged. Surface release and heap services capture full64KiB memory; surface callbacks clear slots and optionally replace the frame table.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} streamed sprite lifecycle cases')
