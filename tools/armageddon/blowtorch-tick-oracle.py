"""Execute original004F8E50 Blowtorch tick with captured interfaces."""
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


vtable,record,animation,animation_table,terrain,terrain_table=[owner+0x1000+i*0x800 for i in range(6)]
position,attempt,info,progress,flags_get,flags_set,state,cut=[owner+0x5000+i*0x100 for i in range(8)]
world=0x2300000;cpu.mem_map(world,0x10000)
write(owner,vtable);write(owner+0x38,world);write(owner+0x354,record);write(owner+0x350,animation)
write(animation,animation_table);write(animation_table+0xc,info);write(animation_table+0x10,progress)
write(world+0x24,terrain);write(terrain,terrain_table);write(terrain_table+0xc,cut)
for offset,address in [(0x5c,position),(0x100,attempt),(0x74,flags_get),(0x78,flags_set),(0x80,state)]:write(vtable+offset,address)
fields={'x':0x90,'y':0x94,'field1f4':0x1f4,'field1f8':0x1f8,'field1fc':0x1fc,'remaining':0x290,'flags':0x5c,'facing':0x1b0}
def hook(cpu,address,size,user):
 global cursor
 if address not in [position,attempt,info,progress,flags_get,flags_set,state,cut,0x4faf90,0x4f7da0,0x4d6760]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4);count=0
 if address==position:
  write(arg(0),read(owner+0x90));write(arg(1),read(owner+0x94));count=2
 elif address==info:write(arg(0),body['sprite']);write(arg(1),0);count=2
 elif address==0x4faf90:
  calls.append(dict(operation='launchSetup',value=arg(4)));write(arg(3),slope);count=5
 elif address==attempt:
  calls.append(dict(operation='tryPosition',request=[signed(arg(0)),signed(arg(1))]));count=2
  accepted=pattern[cursor%len(pattern)];cursor+=1
  if accepted:write(owner+0x90,arg(0));write(owner+0x94,arg(1))
  cpu.reg_write(UC_X86_REG_EAX,accepted)
 elif address==flags_get:cpu.reg_write(UC_X86_REG_EAX,read(owner+0x5c))
 elif address in [progress,flags_set,state]:
  operation={progress:'progress',flags_set:'flags',state:'state'}[address]
  calls.append(dict(operation=operation,value=signed(arg(0))));count=1
  if address==flags_set:write(owner+0x5c,arg(0))
 elif address==0x4d6760:calls.append(dict(operation='camera'))
 else:
  operation,count={cut:('terrain',3),0x4f7da0:('area',12)}[address]
  calls.append(dict(operation=operation,request=[signed(arg(i)) for i in range(count)]))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for sprite in [124,125]:
 for facing in [-1,1]:
  for slope in [-65536,-6554,-6553,0,6553,6554,65536]:
   for phase in [0,65000,2147483647]:
    for remaining in [20,21]:
     for pattern in [[0],[1,1,1],[1,0,1,1],[1,0,0,1,1],[1,0,0,0,1,1],[1,0,0,0,0]]:
      body=dict(x=100*65536+32768,y=200*65536+123,field1f4=phase>>16,field1f8=phase,field1fc=100*65536,remaining=remaining,flags=0x420cc6,facing=facing,sprite=sprite)
      config={'0x70':15,'0x74':30,'0x78':15}
      for key,offset in fields.items():write(owner+offset,body[key])
      for key,value in config.items():write(record+int(key,16),value)
      sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[];cursor=0
      cpu.emu_start(0x4f8e50,stop,count=10000)
      if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Blowtorch tick failed to return')
      output=dict(body={**body,**{key:signed(read(owner+offset)) for key,offset in fields.items()}},calls=calls)
      cases.append(dict(body=body,record=config,slope=slope,pattern=pattern,attemptCount=cursor,output=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F8E50 with native fixed multiply and trig. Animation, launch direction, position/flags and collision acceptance interfaces supplied; area, terrain, camera and state dispatch captured.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} Blowtorch ticks')
