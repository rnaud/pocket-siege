"""Execute original team flag construction with native nearest-palette conversion."""
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
cpu.mem_map(owner,0x40000)
for address in [stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


def word(address,value):cpu.mem_write(address,struct.pack('<H',value&65535))
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x40000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global allocated
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x492550:
  allocated+=1;calls.append(['allocate',read(sp+4),snapshot()]);ret(owner+0x1000+allocated*0x40)
 elif address==0x4924d0:calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(owner+0x4000+allocated*0x200)
 elif address==stop+0x100:calls.append(['palette',cpu.reg_read(UC_X86_REG_ECX),read(sp+4),snapshot()]);ret(owner+0x8000,4)
for a in [0x492550,0x4924d0,stop+0x100]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,0xa5]:
 for count in [0,1,3,6]:
  for used in [0,8]:
   calls=[];allocated=0;cpu.mem_write(owner,bytes([pattern])*0x40000)
   write(owner+0x5cd0,owner+0x10000);write(owner+0x10008,owner+0x6000);write(owner+0x6000,owner+0x6100);write(owner+0x6114,stop+0x100)
   cpu.mem_write(owner+0x14886,bytes([count]));write(owner+0x22454,0x123)
   word(owner+0x890e,used)
   for i in range(8):
    word(owner+0x8910+i*2,i)
    for c,m in enumerate([43,71,97]):word(owner+0x800c+i*6+c*2,(i*m)&255)
   for team in range(6):
    colors=bytes(((i//3)*[43,71,97][i%3]+(team if i//3>=8 else 0))&255 for i in range(768))
    pixels=bytes((i//20+i%20+team*7)%12 for i in range(340))
    cpu.mem_write(owner+0x14ea4+team*3000,colors);cpu.mem_write(owner+0x151a4+team*3000,pixels)
   sp=stack+0xf000;write(sp,stop);write(sp+4,0x11223344)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4a64f0,stop,count=10000000)
   assert cpu.reg_read(UC_X86_REG_EIP)==stop
   case=dict(pattern=pattern,count=count,used=used,calls=calls,sha256=snapshot(),lookups=[])
   for color in [[0,0,0],[43,71,97],[128,128,128],[32767,-32768,255]]:
    for c,value in enumerate(color):word(owner+0xa000+c*2,value)
    write(owner+0xa010,0x12345678)
    sp=stack+0xf000;write(sp,stop);write(sp+4,owner+0xa000);write(sp+8,owner+0xa010)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner+0x8000);cpu.emu_start(0x4add80,stop,count=100000)
    assert cpu.reg_read(UC_X86_REG_EIP)==stop
    case['lookups'].append(dict(color=color,index=cpu.reg_read(UC_X86_REG_EAX),error=read(owner+0xa010),sha256=snapshot()))
   cases.append(case)
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A64F0 +004ADD80',method='16 complete original team-flag constructors run native bitmap construction, border fill, indexed RGB lookup, weighted nearest-color selection and pixel writes. Full256KiB memory matches at heap/palette callbacks and completion. Covers0/1/3/6 teams, empty/populated palettes, exact/approximate matches and skipped palette index0. Only renderer palette and heap are interfaces. Full startup and live flag ownership remain unfinished; 64 additional direct nearest-color calls verify signed input colors and written/retained error outputs.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} original team flag setup sequences')
