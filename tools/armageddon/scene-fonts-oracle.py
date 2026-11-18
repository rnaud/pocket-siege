"""Execute original font startup with palette save and restore."""
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
cpu.mem_map(owner,0x10000)
for address in [stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(stack+0xe4e8,0xb18))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return result.decode('latin1')
def hook(cpu,address,size,user):
 global groups
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==stop+0x100:calls.append(['palette',receiver,read(sp+4),snapshot()]);ret(owner+(0x9000 if alternate and groups else 0x8000),4)
 elif address==stop+0x200:
  descriptor=read(sp+20);values=[read(descriptor+i*4) for i in range(6)];values[1]=cstring(values[1]);calls.append(['group',receiver,*[read(sp+i*4) for i in range(1,5)],values,snapshot()]);groups+=1
  if mutation:
   write(owner+0x800c,0x12345678);write(owner+0x2ac,0x87654321);write(owner+0x2b4,owner+0x6200);write(owner+0x4008,owner+0x6200)
  ret(0,20)
 elif address==stop+0x300:calls.append(['commit',receiver,read(sp+4),snapshot()]);ret(0,4)
 elif address==stop+0x400:
  calls.append(['font',receiver,*[read(sp+i*4) for i in range(1,5)],cstring(read(sp+20)),snapshot()])
  if mutation:
   write(owner+0x2ac,read(owner+0x2ac)+1);write(owner+0x2b4,owner+(0x6000 if receiver==owner+0x6200 else 0x6200))
  ret(0,20)
for a in [stop+0x100,stop+0x200,stop+0x300,stop+0x400]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,0xa5]:
 for mutation in [False,True]:
  for alternate in [False,True]:
   calls=[];groups=0;cpu.mem_write(owner,bytes([pattern])*0x10000);cpu.mem_write(stack,bytes([pattern])*0x10000)
   for offset,value in [(0,owner+0x6400),(0x6404,stop+0x200),(0x5cd0,owner+0x4000),(0x4008,owner+0x6000),(0x2ac,0x11223344),(0x2b4,owner+0x6000),(0x6000,owner+0x6100),(0x6200,owner+0x6100),(0x6114,stop+0x100),(0x6154,stop+0x300),(0x6178,stop+0x400)]:write(owner+offset,value)
   cpu.mem_write(owner+0x8000,bytes((i*13+7)&255 for i in range(0xb18)));cpu.mem_write(owner+0x9000,bytes((i*17+3)&255 for i in range(0xb18)))
   sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4a6b10,stop,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   cases.append(dict(pattern=pattern,mutation=mutation,alternate=alternate,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A6B10 +004A6ED0 +004A6AE0',method='Eight complete original font startup captures execute native temporary palette creation,copy/restore and destruction,CD-ROM/phone resource groups and all28 ordered font loads. Full64KiB owner memory and temporary palette match at callbacks and completion,including mutated renderer/archive and alternate destination palette. Renderer/font/resource group backends remain interfaces. Full startup composition with this font stage and live ownership remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} original font startup sequences')
