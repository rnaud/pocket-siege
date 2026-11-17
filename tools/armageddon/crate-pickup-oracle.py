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

context=owner+0x20000;cpu.mem_map(context,0x20000)
manager=owner+0x1000;vt=owner+0x2000;first=stop+0x100;nextbody=stop+0x200
write(owner,0x526f48);write(owner+0x38,context);write(context+0x7d4,manager);write(manager,vt);write(vt+0x48,first);write(vt+0x4c,nextbody)
selected=-1
queries=[]
def ret(value,cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def hook(cpu,address,size,user):
 global cursor,selected
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [first,nextbody]:
  cursor=0 if address==first else cursor+1
  if cursor<len(candidates):write(read(sp+4),pointers[cursor]);ret(1,8)
  else:ret(0,8)
 elif address==0x4e14a0:
  queries.append(cursor)
  if not candidates[cursor]['query']:ret(0,12)
 elif address==0x4f596c:
  selected=cursor;cpu.emu_stop()
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
def capture(actor,candidates,radius):
 global cursor,selected,queries,pointers
 selected=-1;cursor=0;queries=[];pointers=[]
 write(owner+0x90,actor['x']);write(owner+0x94,actor['y']);write(owner+0x3c,11)
 for i,c in enumerate(candidates):
  address=owner if c.get('self') else owner+0x4000+i*0x400;pointers.append(address)
  if address!=owner:
   write(address,0x526f48);write(address+0x90,c['x']);write(address+0x94,c['y']);write(address+0x3c,c['type']);write(address+0x124,c['kind'])
 sp=stack+0xf000;write(sp,stop)
 for i,v in enumerate([1,1,radius]):write(sp+4+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4f5850,stop,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP) not in [stop,0x4f596c]:raise RuntimeError('Pickup search did not finish')
 cases.append({'actor':actor,'candidates':candidates,'radius':radius,'selected':selected,'queries':queries[:]})
actor={'x':123456,'y':-65537}
for radius in [0,1,32*65536]:
 for dx in [-radius-1,-radius,-radius+1,0,radius-1,radius,radius+1,-2147483648]:
  for dy in [0,radius-1,radius]:
   for type in [2,11,12,43]:
    candidates=[{'x':signed((actor['x']+dx)&0xffffffff),'y':signed((actor['y']+dy)&0xffffffff),'type':type,'kind':1,'query':True}]
    capture(actor,candidates,radius)
for variant in range(5):
 candidates=[{'x':actor['x'],'y':actor['y'],'type':11,'kind':1,'query':True} for i in range(4)]
 candidates[0]['self']=True;candidates[1]['kind']=3;candidates[2]['query']=False
 if variant==1:candidates[0]['self']=False
 if variant==2:candidates[1]['kind']=4
 if variant==3:candidates[2]['query']=True
 if variant==4:candidates[3]['kind']=3
 capture(actor,candidates,32*65536)
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004F5850..004F596C','method':'Original search, type/position getters and record query7D7 execute. Ordered registry enumeration and failed query results supplied; stops before pickup transfer.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} pickup searches')
