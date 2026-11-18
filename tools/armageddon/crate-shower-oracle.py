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
def ret(value,cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp)
 cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4ccf50:
  events.append(['parent',read(sp+4),read(sp+8)]);ret(0x1234,8)
 elif address==0x4eebe0:events.append(['busy'])
 elif address==0x4b7c00:
  events.append(['place',read(sp+12),read(sp+16)])
  write(read(sp+4),123*65536);write(read(sp+8),-45*65536);ret(placement,16)
 elif address==0x4ee960:events.append(['random']);ret(random,0)
 elif address==0x492550:events.append(['allocate',read(sp+4)]);ret(owner+0x1000 if allocate else 0,0)
 elif address==0x4dfba0:
  record=read(sp+8)
  events.append(['create',read(sp+4),read(sp+12),signed(read(record+4)),signed(read(record+8)),read(record+20),read(record+24),read(record+28)])
  ret(owner+0x1000,12)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for pool,used in [([1],[]),([1,6,11],[8]),([67,69],[])]:
 for count in [0,1,5]:
  for timer in [0,20,21,4000,-2147483648]:
   for placement in [0,1]:
    for allocate in [0,1]:
     for random in [0,0x12345678,0xffffffff]:
      events=[];write(owner+0x1dc,count);write(owner+0x1d8,timer);write(context+0x800,0)
      write(context+0x1668,len(pool));write(context+0x1788,len(used))
      for i,v in enumerate(pool):write(context+0x154c+i*4,v)
      for i,v in enumerate(used):write(context+0x166c+i*4,v)
      for v in pool+used:write(context+0x1bfb8+v*4,v+2)
      sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
      cpu.emu_start(0x4b81b0,stop,count=10000)
      if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Shower routine did not finish')
      output={'count':signed(read(owner+0x1dc)),'timer':signed(read(owner+0x1d8)),
        'pool':[read(context+0x154c+i*4) for i in range(read(context+0x1668))],
        'used':[read(context+0x166c+i*4) for i in range(read(context+0x1788))]}
      cases.append({'input':{'count':count,'timer':timer,'pool':pool,'used':used},'placement':bool(placement),'allocate':bool(allocate),'random':random,'output':output,'events':events,'busy':read(context+0x800)})
schemes=[]
pools=json.loads(Path('tests/fixtures/armageddon/crate-content-pool.json').read_text())['schemes']
for scheme in json.loads(Path('src/armageddon/crate-scheme-data.json').read_text())['schemes']:
 for row in [r for r in pools if r['resource_id']==scheme['resource_id']]:
  pool=row['pool'];used=[]
  if not pool:continue
  for random in [0,0x12345678,0xffffffff]:
   placement=1;allocate=1;count=5;timer=0;events=[]
   write(owner+0x1dc,count);write(owner+0x1d8,timer);write(context+0x800,0)
   write(context+0x1668,len(pool));write(context+0x1788,0)
   for i,v in enumerate(pool):write(context+0x154c+i*4,v)
   for i,v in enumerate(scheme['ammo']):write(context+0x1bfb8+i*4,v)
   sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4b81b0,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   output={'count':signed(read(owner+0x1dc)),'timer':signed(read(owner+0x1d8)),
     'pool':[read(context+0x154c+i*4) for i in range(read(context+0x1668))],
     'used':[read(context+0x166c+i*4) for i in range(read(context+0x1788))],'ammo':scheme['ammo']}
   schemes.append({'resource_id':scheme['resource_id'],'tall':row['tall'],'input':{'count':count,'timer':timer,'pool':pool,'used':used,'ammo':scheme['ammo']},'placement':True,'allocate':True,'random':random,'output':output,'events':events,'busy':read(context+0x800)})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004B81B0','method':'Original scheduler, pool removal/refill and busy setter execute; parent lookup, placement, RNG, allocation and constructor are captured interfaces. Empty content pools are excluded: original divides before its zero guard.','cases':cases,'schemes':schemes},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} crate shower cases')
