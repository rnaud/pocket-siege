"""Execute original barrel tick lifecycle."""
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

context=owner+0x20000;cpu.mem_map(context,0x20000);write(owner,0x526988);write(owner+0x38,context)
fields={'state':0x50,'disabled':0xfc,'bubbleProgress':0x10c,'submerged':0xbc,'moving':0xc4,'x':0x90,'y':0x94,'flags':0x40}
def ret(value,cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4f4410:events.append(['motion']);ret(0,16)
 elif address==0x4d11e0:ret(read(owner+0xc4),0)
 elif address==0x4d1660:events.append(['detonate']);ret(0,0)
 elif address==0x4d1380:events.append(['delete',read(sp+4)]);ret(0,4)
 elif address==0x4ee990:events.append(['camera']+[signed(read(sp+4+i*4)) for i in range(3)]);ret(0,12)
 elif address==0x4eebe0:events.append(['busy'])
 elif address==0x4ee930:events.append(['random']);ret(6,0)
 elif address==0x4edfa0:events.append(['bubble']+[signed(read(sp+4+i*4)) for i in range(5)]);ret(0,20)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for state in [0,1,-1]:
 for disabled in [0,1]:
  for flags in range(4):
   for progress in [0,0xc000,65535,131072,2147483647]:
    for y in [0,10*65536]:
     body={'state':state,'disabled':disabled,'bubbleProgress':progress,'submerged':flags&1,'moving':flags>>1,'x':123456,'y':y,'flags':0x40180e}
     for key,off in fields.items():write(owner+off,body[key])
     write(owner+0x100,0);write(context+0x1030,0);write(context+0x800,0);write(context+0x808,10)
     sp=stack+0xf000;write(sp,stop)
     for i,v in enumerate([0,0x3ea,0,0]):write(sp+4+i*4,v)
     events=[];cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4d1860,stop,count=20000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Barrel tick did not return')
     cases.append({'input':body,'bottom':10,'output':{key:signed(read(owner+off)) for key,off in fields.items()},'events':events})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D1860 event3EA','method':'Original lifecycle with position/velocity/submersion getters and busy setter unchanged; base audio cleanup, moving predicate, camera, detonation, deletion and visual RNG/bubbles captured. Render rank already0.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} barrel tick cases')
