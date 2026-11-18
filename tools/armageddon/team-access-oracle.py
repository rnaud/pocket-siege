"""Execute original initial match setup through loadout construction and inventory import."""
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


context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x2a0,context)
pattern=bytes((i*17+5)&255 for i in range(0x20000));cases=[]
controllers=[[-1,0,1,12,0,-2],[0,0,1,1,12,-1],[-128,-1,-2,-3,-4,-5],[12,11,10,9,8,7]]
for grouped in [0,1]:
 for default in [0,1,255]:
  for count in range(7):
   for kinds in range(4):
    for local in [0,1,12]:
     cpu.mem_write(context,pattern);writes=[[0x4886,count],[0x47a8,grouped],[0x11d56,default],[0x11d7c,local]]
     for team,controller in enumerate(controllers[kinds]):
      writes.extend([[0x4888+team*3000,controller],[0x488b+team*3000,[-1,-128,127,0,1,1][team] if kinds==3 else team//2]])
     for offset,value in writes:cpu.mem_write(context+offset,bytes([value&255]))
     write(0x561ec8,0xdeadbeef);sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
     cpu.emu_start(0x49c940,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
     cases.append(dict(writes=writes,counter=read(0x561ec8),sha256=hashlib.sha256(cpu.mem_read(context,0x20000)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='0049C940',method='Original routine with no intercepted calls; complete patterned scene and global counter compared for local/grouped modes, default flags,0..6 teams, signed controllers/groups and local player indices.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'team access setups')
