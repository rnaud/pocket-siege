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

context=owner+0x20000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
inventory=context+0x1b94
formatfn=stop+0x100;write(0x5178f4,formatfn)
def ret(cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_EAX,0);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def hook(cpu,address,size,user):
 if address==formatfn:ret(0)
 elif address==0x4ef000:ret(12)
 elif address==0x4eefb0:ret(8)
cpu.hook_add(UC_HOOK_CODE,hook)
for team in [1,2]:write(inventory+team*0x51c+8,team)
def ammo(team,slot):return inventory+0x1eb8+(slot+team*0x8e)*4
hpaddr=inventory+0x51c+0x9c-0x538
cases=[]
for kind in [0,1,2,3,4,5]:
 for donorTeam in [1,2]:
  for count in [-1,0,2147483647]:
   for amount in [-1,0,25]:
    for hp in [50,100,2147483647]:
     recipient=[count]*71;donor=[7]*71
     for slot in range(71):write(ammo(1,slot),count);write(ammo(2,slot),7)
     write(hpaddr,hp)
     record={'kind':kind,'donorTeam':donorTeam,'weapon':6,'quantity':amount,'health':amount,'inventory':[amount if i in [0,6,70] else 0 for i in range(71)]}
     sp=stack+0xf000;cpu.mem_write(sp,bytes(0x500));write(sp+0x14c,donorTeam);write(sp+0x160,kind);write(sp+0x164,amount);write(sp+0x168,6);write(sp+0x288,amount);write(sp+0x3a8,1)
     for i,v in enumerate(record['inventory']):write(sp+0x16c+i*4,v)
     cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESI,1)
     cpu.emu_start(0x4f596c,0x4f5b49,count=20000)
     if cpu.reg_read(UC_X86_REG_EIP)!=0x4f5b49:raise RuntimeError('Transfer did not finish')
     cases.append({'record':record,'hp':hp,'recipient':recipient,'donor':donor,'output':{'hp':signed(read(hpaddr)),'recipient':[signed(read(ammo(1,i))) for i in range(71)],'donor':[signed(read(ammo(2,i))) for i in range(71)]}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004F596C..004F5B49','method':'Original pickup transfer branches, ammo add/set, health get/set and weapon lookup execute unchanged. Text formatting and notification interfaces omitted. Recipient team1/worm1; donor may alias recipient.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} pickup transfers')
