"""Execute original sudden-death environmental activation."""
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

context=owner+0x20000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
calls=[]
def ret(cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4b26a0:
  event=read(sp+16);payload=read(sp+24);count=2 if event==0x441 else 1
  calls.append({'operation':'event','event':event,'record':[signed(read(payload+i*4)) for i in range(count)]});ret(24)
 elif address==0x4eeb70:
  calls.append({'operation':'camera','point':[signed(read(sp+4)),signed(read(sp+8))]});ret(8)
 elif address==0x4edc90:
  calls.append({'operation':'sound','request':[signed(read(sp+i*4)) for i in range(1,6)]});ret(20)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for waterY in [0,300,696,32768,-1]:
 for rise in [0,1,20,255]:
  for dose in [-32768,-1,0,1,5,32767,65535]:
   write(context+0x804,waterY);cpu.mem_write(context+0x11d58,bytes([rise]));cpu.mem_write(context+0x11d5a,struct.pack('<H',dose&65535))
   sp=stack+0xf000;write(sp,stop);calls.clear()
   cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
   cpu.emu_start(0x4b61e0,stop,count=1000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Activation did not return')
   cases.append({'input':{'waterY':waterY,'rise':rise,'dose':dose},'calls':list(calls)})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004B61E0','method':'Full activation routine executes unchanged. Event dispatcher, camera request and queued sound interfaces captured. Only initialized receiver-consumed payload words are compared.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} activation cases')
