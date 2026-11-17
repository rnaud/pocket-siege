"""Execute original flame spreading004D3F30 and pool004D3E90."""
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

context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
terrain=owner+0x1000;tv=owner+0x1200;write(context+0x24,terrain);write(terrain,tv);write(tv+0x28,stop+0x100)
def ret(value,cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def words(address,count):return [signed(read(address+4*i)) for i in range(count)]
def hook(cpu,address,size,user):
 global probes
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4ccf50:events.append(['parent']+words(sp+4,2));ret(23,8)
 elif address==0x4ee960:events.append(['random']);ret(random,0)
 elif address==stop+0x100:
  events.append(['probe']+words(sp+4,2));ret(int(probes<clearance),8);probes+=1
 elif address==0x492550:events.append(['allocate',read(sp+4),allocated]);ret(owner+0x5000 if allocated else 0,0)
 elif address==0x4d3c50:events.append(['flame',read(sp+4),words(read(sp+8),11)]);ret(owner+0x5000,8)
 elif address==stop+0x200:
  events.append(['delete',(cpu.reg_read(UC_X86_REG_ECX)-actors)//0x100,read(sp+4)]);ret(0,4)
cpu.hook_add(UC_HOOK_CODE,hook)
spread=[]
for direction in [-1,0,1]:
 for random in [0,1,2,3]:
  for clearance in range(8):
   for allocated in [0,1]:
    for x,y in [(123456,-765432),(-2147483648,2147483647)]:
     record=[x,y,524288,-524288,direction,4,1,3000,100,4,0];payload=owner+0x2000
     for i,v in enumerate(record):write(payload+i*4,v)
     sp=stack+0xf000;write(sp,stop);write(sp+4,payload)
     cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);events=[];probes=0;cpu.emu_start(0x4d3f30,stop,count=10000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Spread did not return')
     spread.append({'record':record,'random':random,'clearance':clearance,'allocated':allocated,'events':events,'output':words(payload,11)})
actors=0x4000000;cpu.mem_map(actors,0x10000);vt=owner+0x3000;write(vt,stop+0x200)
pool=[]
for hole in [0,1,99,199,-1]:
 for variant in range(4):
  stamps=[(200-i if variant==0 else 5 if variant==1 else -i if variant==2 else (-2147483648 if i==99 else 2147483647)) for i in range(200)]
  for i,stamp in enumerate(stamps):
   address=actors+i*0x100;write(address,vt);write(address+0x7c,stamp);write(context+0x4b0+4*i,0 if i==hole else address)
  write(context+0x7f0,1234);sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);events=[];cpu.emu_start(0x4d3e90,stop,count=20000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Pool did not return')
  pool.append({'hole':hole,'stamps':stamps,'frame':1234,'events':events,'slot':read(owner+0x80),'created':read(owner+0x7c),'ownerSlots':[i for i in range(200) if read(context+0x4b0+4*i)==owner]})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Original full spread004D3F30 captures terrain probes, RNG, parent lookup, allocation and constructor. Original full pool004D3E90 executes with destructor captured; all200 slots examined including signed ages/ties.','spread':spread,'pool':pool},separators=(',',':'))+'\n')
print(f'Captured {len(spread)} spread and {len(pool)} pool cases')
