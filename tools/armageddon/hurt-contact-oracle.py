"""Execute original hurt collision callback 004D6E30.

Original body getters/setters, fallback dispatcher and bounce execute.
Collision predicate, RNG, voice/audio, health, particles and state entry
are explicit supplied/captured interfaces. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EDI, UC_X86_REG_EBP
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

context,manager,manager_vtable=owner+0x4000,owner+0x5000,owner+0x5100
vtable,incoming,other_vtable,probe,transition=owner+0x1000,owner+0x2000,owner+0x3000,owner+0x3500,owner+0x3600
cpu.mem_write(vtable,bytes(cpu.mem_read(0x526de0,0x180)))
write(owner,vtable);write(owner+0x38,context);write(context+0x7d4,manager)
write(manager,manager_vtable);write(manager_vtable+0xc,probe)
write(incoming,other_vtable);write(other_vtable+0x50,0x4d0ef0)
write(vtable+0x80,transition)
cpu.mem_write(probe,b'\xc2\x0c\x00')
cpu.mem_write(transition,b'\x8b\x44\x24\x04\x89\x41\x50\xc2\x04\x00')
for address,code in [(0x4ee960,b'\xc3'),(0x4edaf0,b'\xc2\x08\x00'),(0x4edc30,b'\xc2\x04\x00'),(0x4edb90,b'\xc2\x14\x00')]:cpu.mem_write(address,code)
fields={'state':0x50,'x':0x90,'y':0x94,'vx':0x9c,'vy':0xa0,'angularVelocity':0xa4,'sleeping':0xb8,'team':0xfc,'soundHandle':0x38c,'field264':0x264,'field268':0x268,'field26c':0x26c}
receiver=owner+0x3700
write(other_vtable+0x28,receiver);cpu.mem_write(receiver,b'\xc2\x08\x00')
fields.update(complex=0x4c,tangent=0x80,restitutionX=0x78,restitutionY=0x7c,lastFacingFrame=0x1ac,facing=0x1b0)
calls=[];queries=[];pattern=[];environment={};fallback=False;full=False
def observe(cpu,address,size,user):
    global fallback
    sp=cpu.reg_read(UC_X86_REG_ESP)
    if address==0x4d7357:
        fallback=True
        if not full:cpu.emu_stop()
    elif address==0x4d8440:calls.append(dict(operation='health',request=list(struct.unpack('<3i',cpu.mem_read(sp+4,12)))))
    elif address==0x4ee7f0:calls.append(dict(operation='particle',request=list(struct.unpack('<12i',cpu.mem_read(sp+4,48)))))
    elif address==probe:
        if read(sp+4)!=owner:raise RuntimeError('Unexpected body')
        queries.append(list(struct.unpack('<2i',cpu.mem_read(sp+8,8))))
        cpu.reg_write(UC_X86_REG_EAX,pattern[(len(queries)-1)%len(pattern)])
    elif address==receiver:cpu.reg_write(UC_X86_REG_EAX,environment['otherResponse'])
    elif address==transition:
        calls.append({'operation':'state','target':read(sp+4),'velocity':list(struct.unpack('<2i',cpu.mem_read(owner+0x9c,8)))})
    elif address==0x4ee960:
        calls.append({'operation':'random'});cpu.reg_write(UC_X86_REG_EAX,environment['random']&0xffffffff)
    elif address==0x4edaf0:
        calls.append({'operation':'voice','team':read(sp+4),'slot':read(sp+8)})
        cpu.reg_write(UC_X86_REG_EAX,environment['voiceId'])
    elif address==0x4edc30:calls.append({'operation':'stopSound','handle':read(sp+4)})
    elif address==0x4edb90:
        calls.append({'operation':'sound','request':list(struct.unpack('<5i',cpu.mem_read(sp+4,20)))})
        cpu.reg_write(UC_X86_REG_EAX,environment['soundHandle'])
cpu.hook_add(UC_HOOK_CODE,observe)
cpu.mem_write(0x4d8440,b'\xc2\x0c\x00');cpu.mem_write(0x4ee7f0,b'\xc2\x30\x00')
fields.update(maxVx=0x254,maxVy=0x258,impact=0x224,damageScale=0x15c,field250=0x250,voiceCooldown=0x1a0,field150=0x150)
full=True;pattern=[0];cases=[]
for state in [0x73,0x7f,0x80,0x81]:
 for side in [1,2,3,4]:
  for other_type in [1,2]:
   for vx,vy in [(0,0),(10000,0x70000),(10000,0x80000),(10000,0xc0000),(-0x60000,0xc0000),(0x60000,-0xc0000),(0,0x80001),(0,0x7ffff),(0x50000,0),(-0x50000,0),(0x4ffff,0),(0,0x70001)]:
    for profile in range(3):
     body={name:0 for name in fields}
     body.update(state=state,x=0x200000,y=0x300000,vx=vx,vy=vy,angularVelocity=1234,sleeping=9,team=1,soundHandle=19 if profile else 0,field264=3,field268=4,field26c=5,complex=profile%2,tangent=0xf5c2,restitutionX=0x9999,restitutionY=0,lastFacingFrame=90 if profile else 89,facing=-1,maxVx=0 if profile<2 else 0x100000,maxVy=0,impact=0,damageScale=[0,50,100][profile],voiceCooldown=profile)
     environment=dict(random=257,voiceId=1111,soundHandle=99,frame=100,otherResponse=0,factor=1,bloodMode=profile%2)
     for name,offset in fields.items():write(owner+offset,body[name]&0xffffffff)
     write(context+0x7f0,100);write(context+0x814,1);write(context+0x1ac0,environment['bloodMode'])
     other=dict(type=other_type,vx=0x3333,vy=0)
     write(incoming+0x3c,other_type);write(incoming+0x9c,other['vx']);write(incoming+0xa0,0)
     cpu.mem_write(stack+0xff00,struct.pack('<3I',stop,incoming,side));cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
     calls=[];queries=[];fallback=False
     cpu.emu_start(0x4d6e30,stop,count=10000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Hurt callback did not return')
     result={name:struct.unpack('<i',cpu.mem_read(owner+off,4))[0] for name,off in fields.items()}
     other_out=dict(type=other_type,vx=struct.unpack('<i',cpu.mem_read(incoming+0x9c,4))[0],vy=struct.unpack('<i',cpu.mem_read(incoming+0xa0,4))[0])
     cases.append(dict(input=body,other=other,side=side,environment=environment,queries=queries,result=dict(body=result,calls=calls,fallback=fallback,other=other_out)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original released-rope state73 and hurt receiver, getters/setters, fallback and bounce; state entry, health, particles, voice and collision predicate supplied as interfaces.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} hurt callbacks')
