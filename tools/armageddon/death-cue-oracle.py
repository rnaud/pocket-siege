"""Execute original death cue instructions in Unicorn.

Original death cue instructions execute; RNG is supplied and playback is captured. No game entry point runs.
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



context=0x2300000; cpu.mem_map(context,0x20000)
write(owner+0x38,context);write(owner+0xfc,0)
for index in [6,33]:write(context+0x1b808+index*4,index)
cpu.mem_write(0x4ee960,b'\xc3')
cpu.mem_write(0x4edc90,b'\xc2\x14\x00')
state={}; random_value=0
def capture(cpu,address,size,user):
 if address==0x4ee960:
  state['randomCalls']+=1;cpu.reg_write(UC_X86_REG_EAX,random_value)
 elif address==0x4edc90:
  sp=cpu.reg_read(UC_X86_REG_ESP);state['sound']=list(struct.unpack('<5I',cpu.mem_read(sp+4,20)))
 elif address in [0x4de5f6,0x4de6a5]:
  state['complete']=address==0x4de5f6;cpu.emu_stop()
cpu.hook_add(UC_HOOK_CODE,capture)
cases=[]
for sprite in [10,11]:
 for progress in [-1,0,0x435d,0x435e,0xffff,0x10000,0x1ffff,0x7fffffff,-0x80000000]:
  for spoken in [0,1,-1]:
   for random_value in [0,0xffff,0x10000,0xffffffff]:
    state.clear();state.update(randomCalls=0,sound=None,complete=False)
    write(owner+0x208,spoken&0xffffffff)
    esp=stack+0xf000;write(esp+0x24,progress&0xffffffff);write(esp+0x28,sprite)
    cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESP,esp)
    cpu.emu_start(0x4de582,stop,count=1000)
    state['spoken']=struct.unpack('<i',cpu.mem_read(owner+0x208,4))[0]
    cases.append(dict(sprite=sprite,progress=progress,spoken=spoken,random=random_value,result=dict(state)))
# Death entry uses original virtual velocity/rotation/suspension setters.
animator,anim_vt,clear,queue=owner+0x1000,owner+0x1100,owner+0x1200,owner+0x1300
write(owner,0x526de0);write(owner+0x350,animator);write(animator,anim_vt)
write(anim_vt+0x14,clear);write(anim_vt+0x1c,queue)
cpu.mem_write(clear,b'\xc3');cpu.mem_write(queue,b'\xc2\x04\x00')
def entry_hook(cpu,address,size,user):
 if address==clear:entry_calls.append(dict(operation='clear'))
 elif address==queue:entry_calls.append(dict(operation='queue',sprite_id=read(cpu.reg_read(UC_X86_REG_ESP)+4),progress=0))
for address in [clear,queue]:cpu.hook_add(UC_HOOK_CODE,entry_hook,begin=address,end=address)
fields=dict(vx=0x9c,vy=0xa0,angularVelocity=0xa4,suspended=0x54,spoken=0x208)
entries=[]
for speed in [-655360,0,655360]:
 for suspended in [0,1]:
  for spoken in [0,1,-1]:
   initial=dict(vx=speed,vy=-speed,angularVelocity=12345,suspended=suspended,spoken=spoken)
   for key,offset in fields.items():write(owner+offset,initial[key]&0xffffffff)
   sp=stack+0xf000;cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_EBP,0x526de0);entry_calls=[]
   cpu.emu_start(0x4d8030,0x4d8189,count=1000)
   if cpu.reg_read(UC_X86_REG_EIP)!=0x4d8189:raise RuntimeError('Death entry did not reach state tail')
   body={key:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for key,offset in fields.items()}
   entries.append(dict(input=initial,result=dict(body=body,calls=entry_calls)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,block='004DE582–004DE5F6 / 004DE6A5',method='Original trigger/choice/completion instructions; supplied RNG, original team sound lookup, captured playback request. Stop before explosion or state return. Death entry executes004D8030..004D806F with real body setters and an explicit animation sink.',cases=cases,entries=entries),indent=2)+'\n')
print(f'Captured {len(cases)} death cue cases')
