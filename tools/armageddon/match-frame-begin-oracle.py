"""Execute runtime actor teardown with original base/physics/text destruction and scene bookkeeping."""
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


import base64,zlib,itertools
context=0x2300000;cpu.mem_map(context,0x20000);environment=owner+0x2000;alternate=owner+0x3000
calls=[];childMode=0;bodyMode=0
def callback(cpu,entry,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if entry==stop+0x100:
  calls.append(['child',receiver,read(sp+4),read(sp+8),read(sp+12),read(read(sp+16))])
  if receiver==owner+0x1000:
   if childMode==1:write(owner+20,0)
   elif childMode==2:write(context+0x7d4,alternate)
   elif childMode==3:write(owner+24,owner+0x1400)
 else:
  body=read(sp+4);index=read(sp+8);calls.append(['body',receiver,body,index])
  if len([c for c in calls if c[0]=='body'])==1:
   if bodyMode==1:write(receiver+0x24,0)
   elif bodyMode==2:write(receiver+0x28,receiver+0x300)
   elif bodyMode==3:write(read(receiver+0x28)+read(receiver+0x24)*4,owner+0x9000);write(receiver+0x24,read(receiver+0x24)+1)
for address,argc in [(stop+0x100,4),(0x4ca320,2)]:
 cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4));cpu.hook_add(UC_HOOK_CODE,callback,begin=address,end=address)
cases=[]
for count,holes,childMode,bodyMode in itertools.product([0,1,3,8],range(4),range(4),range(4)):
 cpu.mem_write(owner,bytes(0x10000));cpu.mem_write(context,bytes(0x20000));calls.clear();write(owner+0x38,context);write(owner+0x3c,0xdeadbeef);write(owner+20,3);write(owner+24,owner+0x1300)
 for i in range(3):write(owner+0x1000+i*0x100,owner+0x1500);write(owner+0x1300+i*4,0 if i==1 else owner+0x1000+i*0x100);write(owner+0x1400+i*4,owner+0x1200 if i<2 else 0)
 write(owner+0x1508,stop+0x100);write(context+0x7d4,environment)
 for at in [environment,alternate]:
  write(at,0x5268b8);write(at+0x24,count);write(at+0x28,at+0x200)
  for i in range(count):
   body=owner+0x6000+i*0x100
   write(at+0x200+i*4,0 if holes==1 or holes==2 and i%2==0 or holes==3 and i%2 else body);write(at+0x300+i*4,owner+0x8000+i*0x100)
 payload=owner+0x5000;write(payload,0x12345678);initial=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000));sp=stack+0xf000
 for i,v in enumerate([stop,0x1234,0x3e9,0x124,payload]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4b4ce0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 final=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))
 cases.append(dict(childMode=childMode,bodyMode=bodyMode,inputMemory=base64.b64encode(zlib.compress(initial)).decode(),sha256=hashlib.sha256(final).hexdigest(),calls=list(calls)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='256 original004B4CE0 event3E9 captures compose004ECFB0 child forwarding and004CA750 sparse physics traversal. Child and body-step callbacks mutate counts, backing arrays, scene environment ownership or append bodies. Full192KiB root/scene/list memory and ordered calls compared. Actual body-step physics and child gameplay remain interfaces.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'native frame beginnings')
