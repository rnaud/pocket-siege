"""Execute original worm water skim callback."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_ESI, UC_X86_REG_EDI
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


vt,world,state,state_set=owner+0x1000,owner+0x20000,owner+0x2000,owner+0x2100
cpu.mem_map(world,0x20000);write(owner,vt);write(owner+0x38,world);write(vt+0x7c,state);write(vt+0x80,state_set)
def hook(cpu,address,size,user):
 if address not in [state,state_set,0x4edc90]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:signed(read(sp+4+i*4));count=0;result=0
 if address==state:result=read(owner+0x50)
 elif address==state_set:
  count=1;write(owner+0x50,arg(0));calls.append(dict(operation='state',target=arg(0)))
 else:
  count=5;calls.append(dict(operation='sound',request=[arg(i) for i in range(5)]))
 cpu.reg_write(UC_X86_REG_EAX,result);cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for initial in [0,0x65,0x70,0x73,0x78,0x79,0x7b,0x7c,0x7d,0x7e,0x7f,0x80,0x81,0x88]:
 for flag in [0,1,99]:
  write(owner+0x50,initial);write(world+0x12418,flag);sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[]
  cpu.emu_start(0x4d6720,stop,count=1000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Skim failed to return')
  cases.append(dict(body=dict(state=initial),worldSkim=flag,output=dict(body=dict(state=read(owner+0x50)),calls=calls,worldSkim=read(world+0x12418))))
drowning=[]
write(vt+0xf8,0x4d1220)
for initial in [0x65,0x73,0x7b,0x81,0x87,0x88]:
 for submerged in [0,1,-1]:
  write(owner+0x50,initial);write(owner+0xbc,submerged)
  sp=stack+0xff00;cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESI,vt);cpu.reg_write(UC_X86_REG_EBX,state);calls=[]
  cpu.emu_start(0x4de7c2,0x4de7e6,count=1000)
  if cpu.reg_read(UC_X86_REG_EIP)!=0x4de7e6:raise RuntimeError('Drowning gate failed')
  drowning.append(dict(body=dict(state=initial,submerged=submerged),target=calls[0]['target'] if calls else None))
# Original full bubble emitter, with position/state/animation getters and allocation boundaries.
position,progress=owner+0x2200,owner+0x2300
write(vt+0x5c,position);write(vt+0xc0,progress)
def bubble_hook(cpu,address,size,user):
 if address not in [position,progress,0x4ee930,0x4edfa0]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);count=0;result=0
 if address==position:
  count=2;write(read(sp+4),bubble_input['x']);write(read(sp+8),bubble_input['y'])
 elif address==progress:result=bubble_input['progress']
 elif address==0x4ee930:
  result=random_value;random_reads.append(result)
 else:
  count=5;bubble_calls.append(dict(operation='bubble',request=[signed(read(sp+4+i*4)) for i in range(5)]))
 cpu.reg_write(UC_X86_REG_EAX,result&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,bubble_hook)
bubbles=[]
for initial in [0x65,0x82,0x83,0x84,0x85,0x87,0x88]:
 for phase in [0,0xbfff,0xc000,0xffff,0x28000,0x7ffff000,-1]:
  for frame in [0,1,63,64]:
   for animation_progress in [0xf332,0xf333]:
    for facing in [-1,1]:
     if phase==0x7ffff000 and initial not in [0x85,0x87]:continue
     random_value=(frame+phase)&0xffffffff
     bubble_input=dict(state=initial,x=-17*65536,y=250*65536,facing=facing,progress=animation_progress,bubbleProgress=phase)
     write(owner+0x50,initial);write(owner+0x230,phase);write(owner+0x1b0,facing);write(world+0x7f0,frame)
     sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
     bubble_calls=[];random_reads=[]
     cpu.emu_start(0x4dcd60,stop,count=2000000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Bubble emitter did not return')
     output=dict(body={**bubble_input,'bubbleProgress':signed(read(owner+0x230))},calls=bubble_calls)
     bubbles.append(dict(body=bubble_input,frame=frame,random=random_value,randomReads=len(random_reads),output=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004D6720,004F4FC0 and004DE7C2..004DE7E6 water callbacks. Original004DCD60 bubble emitter with explicit getters, visual RNG and allocation capture.',cases=cases,drowning=drowning,bubbles=bubbles),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} skim, {len(drowning)} drowning gates and {len(bubbles)} bubble cases')
