"""Execute original mission/training file selection and state transitions."""
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


cpu.mem_map(0,0x1000)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return result.decode('latin1')
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(0x6e1178,1))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x503ee0:
  calls.append(['create',snapshot()])
  if mutation:cpu.mem_write(0x6e1178,b'Z')
  ret(cpu.reg_read(UC_X86_REG_ECX))
 elif address==0x503dc0:
  dest=read(sp+4);fmt=cstring(read(sp+8));path=fmt%(chr(read(sp+12)&255),signed(read(sp+16)))
  calls.append(['assign',dest,path,snapshot()]);write(dest,owner+0x1000);cpu.mem_write(owner+0x1000,path.encode('latin1')+b'\0');ret()
 elif address==0x503eda:
  calls.append(['open',read(sp+4),read(sp+8),read(sp+12),snapshot()])
  if mutation:write(owner+0x884,81);write(owner+0x54,82);write(owner+0x87c,83)
  ret(success,12)
 elif address==0x503ec8:
  calls.append(['close',snapshot()])
  if mutation:write(owner+0x884,91);write(owner+0x54,92);write(owner+0x87c,93)
  ret()
 elif address==0x503ed4:calls.append(['destroy',snapshot()]);ret()
 elif address==0x503ec2:calls.append(['message',cstring(read(sp+4)),read(sp+8),read(sp+12),snapshot()]);ret(0,12)
for address in [0x503ee0,0x503dc0,0x503eda,0x503ec8,0x503ed4,0x503ec2]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for entry in [0x43e710,0x440590]:
 for selection in [-2147483648,-1,0,1,15,32,2147483647]:
  for success in [0,1]:
   for mutation in [False,True]:
    for score in [0,0xa5a5a5a5]:
     calls=[];cpu.mem_write(owner,bytes([0xa5])*0x10000);cpu.mem_write(0x6e1178,b'D')
     sp=stack+0xf000;write(sp,stop);write(sp+4,selection);write(sp+8,score)
     cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(entry,stop,count=10000)
     assert cpu.reg_read(UC_X86_REG_EIP)==stop
     cases.append(dict(entry=f'{entry:08X}',selection=selection,score=score,success=success,mutation=mutation,calls=calls,result=signed(cpu.reg_read(UC_X86_REG_EAX)),sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original0043E710/00440590 run with CString/CFile/message interfaces. Whole64KiB owner plus drive byte hashed at every interface and return. Constructor/open/close callbacks mutate state to verify ordering. Mission selection -1 preserves training/path/score. Failed opens retain formatted path and prior selection fields. File transport and live UI remain interfaces.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mission/training selection executions')
