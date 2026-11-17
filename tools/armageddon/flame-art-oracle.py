"""Execute original flame render event3EB."""
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

fields={'initial':0x70,'vx':0x54,'vy':0x58,'direction':0xb4,'identity':0xb0,'x':0x4c,'y':0x50,'jitterX':0x60,'jitterY':0x64,'strength':0x40,'progress':0x44}
def hook(cpu,address,size,user):
 if address!=0x4eedf0:return
 sp=cpu.reg_read(UC_X86_REG_ESP);events.append([signed(read(sp+4+i*4)) for i in range(6)])
 target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+28);cpu.reg_write(UC_X86_REG_EIP,target)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for initial in [0,1]:
 for vx,vy in [(0,0),(1,-1),(65536,-131072),(-524288,524288),(-2147483648,1)]:
  for strength in [0,0x3fff,0x4000,0x8000,0xc000,65535]:
   for identity in [0,255]:
    body={'initial':initial,'vx':vx,'vy':vy,'direction':12345,'identity':identity,'x':2147483647,'y':-345678,'jitterX':12345,'jitterY':-54321,'strength':strength,'progress':65432}
    for key,off in fields.items():write(owner+off,body[key])
    sp=stack+0xf000;write(sp,stop)
    for i,v in enumerate([0,0x3eb,0,0]):write(sp+4+i*4,v)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);events=[];cpu.emu_start(0x4d4590,stop,count=20000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Flame render did not return')
    cases.append({'input':body,'output':{key:signed(read(owner+off)) for key,off in fields.items()},'events':events})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D4590 event3EB','method':'Original flame render dispatch, original0049C030 direction and signed clamp execute unchanged; sprite queue captured.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} flame render cases')
