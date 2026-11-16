"""Execute original004F7490/004F74F0 Drill entry/tick with captured interfaces."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP
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
vtable,record,world,terrain,terrain_table,registry,registry_table=[owner+0x1000+i*0x1000 for i in range(7)]
position,state,cut,overlap,clear,queue=[owner+0x8000+i*0x100 for i in range(6)]
write(owner,vtable);write(owner+0x354,record);write(owner+0x38,world)
write(vtable+0x5c,position);write(vtable+0x80,state)
write(world+0x24,terrain);write(terrain,terrain_table);write(terrain_table+0xc,cut)
write(world+0x7d4,registry);write(registry,registry_table);write(registry_table+0xc,overlap)
def hook(cpu,address,size,user):
 global cursor
 if address not in [position,state,cut,overlap,clear,queue,0x4dd610,0x4d6760,0x4ee960,0x4f7da0,0x4edbe0]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4);count=0
 if address==position:
  write(arg(0),body['x']);write(arg(1),body['y']);count=2
 elif address==clear:calls.append(dict(operation='clear'))
 elif address==queue:calls.append(dict(operation='queue',sprite=arg(0)));count=1
 elif address==0x4ee960:
  cpu.reg_write(UC_X86_REG_EAX,draws[cursor]);cursor+=1
 elif address==0x4d6760:calls.append(dict(operation='camera'))
 elif address==state:calls.append(dict(operation='state',value=arg(0)));count=1
 elif address==overlap:
  calls.append(dict(operation='overlap',request=[signed(arg(1)),signed(arg(2))]));count=3;cpu.reg_write(UC_X86_REG_EAX,occupied)
 else:
  operation,count={cut:('terrain',3),0x4dd610:('loopSound',4),0x4f7da0:('area',12),0x4edbe0:('volume',2)}[address]
  calls.append(dict(operation=operation,request=[signed(arg(i)) for i in range(count)]))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for remaining in [-2147483648,-1,0,20,21,5000]:
 for handle in [0,123]:
  for occupied in [0,1]:
   for facing in [-1,1]:
    for x,y in [(100<<16,200<<16),(2147483647,-2147483648)]:
     for draws in [[0,0,0,0],[0x40000,65535,65535,0x100],[0x50000],[0xffffffff]]:
      body=dict(x=x,y=y,facing=facing,remaining=remaining,loopHandle=handle)
      config={'0x70':15,'0x74':30,'0x78':60}
      for k,v in config.items():write(record+int(k,16),v)
      for offset,value in [(0x1b0,facing),(0x290,remaining),(0x388,handle)]:write(owner+offset,value)
      sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[];cursor=0
      cpu.emu_start(0x4f74f0,stop,count=10000)
      if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Drill tick failed to return')
      output=dict(body={**body,'remaining':signed(read(owner+0x290))},calls=calls)
      cases.append(dict(body=body,record=config,random=draws,occupied=occupied,randomCount=cursor,output=output))
# Execute entry plus the real counter increment, capturing only animation calls.
entry_world=0x2300000
cpu.mem_map(entry_world,0x10000)
animation,animation_table=owner+0x9000,owner+0xa000
write(owner+0x38,entry_world);write(owner+0x350,animation)
write(animation,animation_table);write(animation_table+0x14,clear);write(animation_table+0x1c,queue)
entries=[]
for team in [1,2,6]:
 for worm in [0,1,7]:
  for counter in [0,17,2147483647,-2147483648]:
   for duration in [0,1,5000,-1]:
    body=dict(team=team,worm=worm,remaining=123)
    config={'0x7c':duration}
    address=entry_world+0x1b94+team*0x51c+worm*0x9c-0x590
    write(address,counter);write(owner+0xfc,team);write(owner+0x100,worm)
    write(owner+0x290,123);write(record+0x7c,duration)
    sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[]
    cpu.emu_start(0x4f7490,stop,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Drill entry failed to return')
    entries.append(dict(body=body,record=config,counter=counter,output=dict(body={**body,'remaining':signed(read(owner+0x290))},counter=signed(read(address)),calls=calls)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F7490 entry with real004C3560 counter update and captured animation calls; original004F74F0 tick with native trig. Position, RNG, registry overlap supplied; loop creation captured without allocating handle, camera/terrain/area/volume/state captured.',cases=cases,entries=entries),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} drill ticks and {len(entries)} entries')
