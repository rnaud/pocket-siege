"""Execute original terrain-file reader with explicit CRT and image interfaces."""
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


def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(0x560230,4))).hexdigest()
def ret(v=0,n=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+n);cpu.reg_write(UC_X86_REG_EAX,v)
def hook(cpu,address,size,user):
 global cursor,reads
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==stop+0x100:
  dest,n=read(sp+4),read(sp+8);calls.append(['read',receiver,'scratch' if stack<=dest<stack+0x10000 else dest,n,snapshot()]);reads+=1
  data=stream[cursor:cursor+n];cursor+=len(data)
  if variant==reads:data=data[:-1]
  if data:cpu.mem_write(dest,data)
  ret(len(data),8)
 elif address==stop+0x200:cursor=read(sp+4);calls.append(['seek',receiver,cursor,snapshot()]);ret(0,4)
 elif address==stop+0x300:calls.append(['view',receiver,read(sp+4),snapshot()]);ret(owner+0x2000 if mapped else 0,4)
 elif address==stop+0x400:ret(0 if bytes(cpu.mem_read(read(sp+4),4))==b'DIR\x1a' else 1)
 elif address==0x4924d0:calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(0 if variant==5 else owner+0x2000)
 elif address==0x492510:calls.append(['free',read(sp+4),snapshot()]);ret()
write(0x51796c,stop+0x400)
for a in [stop+0x100,stop+0x200,stop+0x300,stop+0x400,0x4924d0,0x492510]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,0xa5]:
 for mapped in [False,True]:
  for chain in [False,True]:
   for variant in range(7):
    calls=[];cursor=0;reads=0
    cpu.mem_write(owner,bytes([pattern])*0x10000);cpu.mem_write(0x560230,bytes([pattern])*4)
    write(owner,owner+0x1000)
    for offset,addr in [(8,stop+0x100),(12,stop+0x200),(16,stop+0x300)]:write(owner+0x1000+offset,addr)
    directory=bytearray(0x1040)
    if chain:
     struct.pack_into('<I',directory,12,0x1004);struct.pack_into('<I',directory,0x1000,0x1024)
    stream=(b'BAD!' if variant==6 else b'DIR\x1a')+struct.pack('<II',0x104c,8)+directory
    if mapped:cpu.mem_write(owner+0x2000,bytes(directory))
    sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4ad270,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(pattern=pattern,mapped=mapped,chain=chain,variant=variant,calls=calls,result=cpu.reg_read(UC_X86_REG_EAX),sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004AD270',method='56 original directory parser executions;64KiB memory plus shared4-byte signature checked at virtual transport/heap callbacks and completion. Covers mapped/allocated directories, chained relative pointers, all read failures, allocation failure and invalid signature. Transport and allocation remain interfaces.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} archive directory sequences')
