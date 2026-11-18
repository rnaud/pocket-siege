"""Execute original custom grave construction with dry and submerged palette conversion."""
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
  allocated+=1;calls.append(['allocate',read(sp+4),snapshot()]);ret(0 if mode==2 and allocated<=2 else owner+0x1000+allocated*0x40)
 elif address==0x4924d0:calls.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(owner+0x30000+allocated*0x400)
 elif address==stop+0x100:calls.append(['palette',cpu.reg_read(UC_X86_REG_ECX),read(sp+4),snapshot()]);ret(owner+0x7000+read(sp+4)*0x1000,4)
for a in [0x492550,0x4924d0,stop+0x100]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,0xa5]:
 for count in [0,1,3,6]:
  for mode in range(4):
   calls=[];allocated=0;cpu.mem_write(owner,bytes([pattern])*0x40000);cpu.mem_write(stack,bytes([pattern])*0x10000)
   write(owner+0x5cd0,owner+0x10000);write(owner+0x10008,owner+0x6000);write(owner+0x6000,owner+0x6100);write(owner+0x6114,stop+0x100)
   cpu.mem_write(owner+0x14886,bytes([count]));write(owner+0x2245c,20 if mode==3 else 3)
   for bank in [1,2]:
    palette=owner+0x7000+bank*0x1000;write(palette+4,1);write(palette+8,7);word(palette+0x90e,8)
    for i in range(8):
     word(palette+0x910+i*2,i);cpu.mem_write(palette+0x60c+i,b'\1')
     for c,m in enumerate([43,71,97] if bank==1 else [17,53,91]):word(palette+12+i*6+c*2,(i*m+bank*20)&255)
   for team in range(6):
    write(owner+0x148a0+team*3000,2 if mode==1 and team%2 else 0)
    colors=bytes(((i//3)*[43,71,97][i%3]+team)&255 for i in range(768))
    pixels=bytes(0 if mode==2 else (i//24+i%24+team*7)%12 for i in range(768))
    cpu.mem_write(owner+0x148a4+team*3000,colors);cpu.mem_write(owner+0x14ba4+team*3000,pixels)
   sp=stack+0xf000;write(sp,stop);write(sp+4,0x11223344)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4a6210,stop,count=10000000)
   assert cpu.reg_read(UC_X86_REG_EIP)==stop
   color=list(struct.unpack('<hhh',cpu.mem_read(sp-0x614,6)))
   cases.append(dict(pattern=pattern,count=count,mode=mode,waterColor=color,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A6210 +004ADC60 +004ADD80',method='32 complete original custom grave startup sequences execute palette reads, two native24x32 bitmap allocations per custom team, transparent index0 handling, dry nearest-color matching and signed half-water mixing. Full256KiB memory at heap/palette callbacks and completion. Covers0/1/3/6 teams, built-in-style skips, transparent images with valid null bitmap branches and failed water-palette reads retaining stack scratch. Only renderer palette and heap are interfaces. Full startup and live custom-grave ownership remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} original custom grave sequences')
