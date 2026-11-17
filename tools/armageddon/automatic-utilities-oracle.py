"""Execute original team environment modifiers."""
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

context=owner+0x20000
cpu.mem_map(context,0x20000)
write(owner+0x38,context)
inventory=context+0x1b94
fields={'team':0x128,'time':0x188,'doubleTime':0x1e0,'crateShower':0x1e4,'crateTimer':0x1d8,'crateCount':0x1dc}
cases=[]
for team in [0,1]:
 for mask in range(16):
  for mode in range(4):
   for bits in [[4,5],[31,32],[255,0]]:
    state={'team':team,'time':2147483647 if mode==3 else 45000,'doubleTime':mode&1,'crateShower':mode&1,'crateTimer':123,'crateCount':2,'flags':8}
    for key,offset in fields.items():write(owner+offset,state[key])
    write(inventory+0x51c+4,state['flags']);write(inventory+0x51c+8,1)
    available=[]
    counts=[]
    for i in range(4):
     slot=67+i;count=(-1 if mode==3 else 3) if mask&(1<<i) else 0
     delay=2 if mode==2 else 0
     write(inventory+0x1eb8+(slot+0x8e)*4,count)
     write(inventory+0x1fd4+(slot+0x8e)*4,delay)
     counts.append(count);available.append(0 if delay else count)
    write(inventory+0x2c10,0)
    for slot,bit in zip([67,68],bits):write(context+0x125bc+slot*0x208+0x74,bit)
    sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4b62d0,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Automatic utility routine did not return')
    output={key:signed(read(owner+offset)) for key,offset in fields.items()}
    output['flags']=signed(read(inventory+0x51c+4))
    after=[signed(read(inventory+0x1eb8+(slot+0x8e)*4)) for slot in range(67,71)]
    cases.append({'input':state,'available':available,'bits':bits,'counts':counts,'output':output,'after':after})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004B62D0','method':'Original complete routine, inventory availability/setters, flag getters/setters and weapon lookup execute unchanged. Counts/delays and record bit indices supplied in memory.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} automatic utility cases')
