"""Execute original mission terrain/thumbnail and selection getters."""
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
scratch=0x2300000;cpu.mem_map(scratch,0x10000)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return result.decode('latin1')
def setstring(obj,text):
 global cursor
 dest=scratch+cursor;cursor+=512
 cpu.mem_write(dest,text.encode('latin1')+b'\0');write(obj,dest)
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
write(0x5174a4,stop+0x100)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);obj=cpu.reg_read(UC_X86_REG_ECX)
 if address==stop+0x100:
  calls.append([cstring(read(sp+4)),cstring(read(sp+8)),signed(read(sp+12)),read(sp+16)])
  if mutation:
   write(owner+0x884,0 if mission==-1 else -1);cpu.mem_write(0x6e1178,b'Z');write(owner+0x880,owner+0x1100)
  ret(value,16)
 elif address==0x503d48:setstring(obj,'');ret(obj)
 elif address==0x503d54:setstring(obj,cstring(read(sp+4)));ret(obj,4)
 elif address==0x503d1e:setstring(obj,cstring(read(read(sp+4))));ret(obj,4)
 elif address==0x503d24:ret()
 elif address==0x503dc0:
  dest=read(sp+4);fmt=cstring(read(sp+8))
  values=(chr(read(sp+12)&255),signed(read(sp+16))) if '%c' in fmt else (signed(read(sp+12)),)
  setstring(dest,fmt%values);ret()
for address in [stop+0x100,0x503d48,0x503d54,0x503d1e,0x503d24,0x503dc0]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for entry in [0x441e50,0x441f10,0x442000,0x442020]:
 for mission,training in [(-1,-1),(-1,0),(0,-1),(7,3)]:
  for value in [0,3,33,-1,-2147483648,2147483647]:
   for mutation in [False,True]:
    cursor=0;calls=[];cpu.mem_write(owner,bytes(0x10000));write(owner+0x884,mission);write(owner+0x54,training);write(owner+0x880,owner+0x1000);cpu.mem_write(0x6e1178,b'D')
    sp=stack+0xf000;write(sp,stop);write(sp+4,owner+0x2000)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(entry,stop,count=10000)
    assert cpu.reg_read(UC_X86_REG_EIP)==stop
    result=cstring(read(owner+0x2000)) if entry<0x442000 else signed(cpu.reg_read(UC_X86_REG_EAX))
    cases.append(dict(entry=f'{entry:08X}',mission=mission,training=training,value=value,mutation=mutation,calls=calls,result=result))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original441E50/441F10/442000/442020 execute with CString and profile interfaces. Includes profile callbacks mutating selection, filename and drive before the original post-read branch. String transport is Latin1; drive cases use ASCII D/Z. Tests resource selection, not live mission startup.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} original mission resource getter executions')
