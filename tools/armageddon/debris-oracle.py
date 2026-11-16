"""Execute original debris emission and motion instructions in Unicorn.

Original debris emission and motion instructions execute; RNG is supplied and playback is captured. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]



context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
cpu.mem_write(0x4ccf50,b'\xb8\x01\x00\x00\x00\xc2\x08\x00')
cpu.mem_write(0x492550,b'\xb8\x01\x00\x00\x00\xc3')
for address,n in [(0x4df8f0,8),(0x4ee190,4),(0x4edc90,20)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',n))
vtable,destroy,manager,manager_table,gravity_fn=owner+0x3000,owner+0x5000,owner+0x6000,owner+0x7000,owner+0x7100
write(owner,vtable);write(vtable,destroy);write(context+0x7d4,manager);write(manager,manager_table);write(manager_table+0x24,gravity_fn)
cpu.mem_write(gravity_fn,b'\xb8\x70\x3d\x00\x00\xc3')
state={}
def capture(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4df8f0:
  state['requests'].append(list(struct.unpack('<6i',cpu.mem_read(read(sp+8),24))))
  write(context+0x12424,read(context+0x12424)+1)
 elif address==0x4ee190:state['smoke'].append(list(struct.unpack('<7i',cpu.mem_read(read(sp+4),28))))
 elif address==0x4edc90:state['sounds'].append(list(struct.unpack('<5i',cpu.mem_read(sp+4,20))))
 elif address==destroy:state['alive']=False;cpu.emu_stop()
for address in [0x4df8f0,0x4ee190,0x4edc90,destroy]:cpu.hook_add(UC_HOOK_CODE,capture,begin=address,end=address)
def run(address,args):
 sp=stack+0xf000;write(sp,stop)
 for i,value in enumerate(args):write(sp+4+i*4,value&0xffffffff)
 cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(address,stop,count=100000)
emissions=[]
for strength in [0,5,6,25,100]:
 for seed in [0,42,0xffffffff]:
  for active in [0,23,24]:
   state={'requests':[]};write(context+0x1ad0,seed);write(context+0x12424,active)
   speed=((strength<<16)//8)+2;count=strength//6
   run(0x4ee020,[100<<16,200<<16,speed,count])
   emissions.append(dict(strength=strength,seed=seed,active=active,requests=state['requests'],random=read(context+0x1ad0)))
fields={'trail':0x3c,'trailStep':0x40,'progress':0x44,'step':0x48,'sprite':0x4c,'x':0x50,'y':0x54,'vx':0x58,'vy':0x5c}
ticks=[]
for request in [emissions[27]['requests'][0], [0,0,900000,-800000,0x2f4,655], [0,0,0,0,0x402f4,2200]]:
 for water in [1,250,696]:
  x,y,vx,vy,sprite,step=request
  body=dict(x=x,y=y,vx=vx,vy=vy,sprite=sprite,step=step,progress=0,trail=0,trailStep=step*15)
  for key,offset in fields.items():write(owner+offset,body[key]&0xffffffff)
  write(context+0x804,water);write(context+0x1241c,42)
  frames=[]
  for i in range(120):
   state=dict(smoke=[],sounds=[],alive=True)
   run(0x4dfa10,[0,0x3ed,0,0])
   result={key:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for key,offset in fields.items()}
   frames.append(dict(body=result,**state,random=read(context+0x1241c)))
   if not state['alive']:break
  ticks.append(dict(initial=body,water=water,seed=42,frames=frames))
args.output.write_text(json.dumps(dict(executable_sha256=digest,emission='004EE020',tick='004DFA10',method='Original emitter/tick/RNG/fixed multiply; allocation/lookup, gravity and downstream smoke/sound/destruction adapters.',emissions=emissions,ticks=ticks),indent=2)+'\n')
print(f'Captured {len(emissions)} debris emissions and {len(ticks)} flight traces')
