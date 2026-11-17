"""Execute airborne, drill and jetpack worm contact decisions in004D6E30.

Real body getters/setters and position attempt 004D1260 run. Collision manager,
RNG/voice/audio, and state entry are explicit interfaces. Decision cases stop
at fallback 004D7357 or early return. Complete cases execute original fallback
dispatch and bounce, with an explicit receiver handled/declined interface.
Crate cases use a cleared pickup latch, exercising the ordinary fallback. Frozen/hurt branches are excluded.
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
cases=[];complete=[]
for state in [0x6c,0x6e,0x78,0x79,0x7d,0x7e]:
    for side in [0,1,2,3,4,99]:
        for other_type in [1,2,11,12,15]:
            for vy in [-65537,-65536,-65535,0,200000]:
                for pattern in [[0,0],[0,7],[7,0],[7,7]]:
                    for profile in range(2):
                        body={'state':state,'x':0x7fff8000,'y':0x7fff8000,'vx':-123456,'vy':vy,'angularVelocity':1234,'sleeping':9,'team':profile+1,'soundHandle':19 if profile else 0,'field264':3,'field268':4,'field26c':5,'complex':profile,'tangent':0xf5c2,'restitutionX':0x9999,'restitutionY':0,'lastFacingFrame':90 if profile else 89,'facing':-1}
                        environment={'random':-1 if profile else 257,'voiceId':1111,'soundHandle':99,'frame':100}
                        for name,offset in fields.items():write(owner+offset,body[name]&0xffffffff)
                        write(incoming+0x3c,other_type)
                        cpu.mem_write(stack+0xff00,struct.pack('<3I',stop,incoming,side))
                        cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
                        calls=[];queries=[];fallback=False
                        cpu.emu_start(0x4d6e30,stop,count=10000)
                        if cpu.reg_read(UC_X86_REG_EIP) not in [stop,0x4d7357]:raise RuntimeError('Unexpected contact boundary')
                        result={name:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for name,offset in fields.items()}
                        cases.append({'input':body,'otherType':other_type,'side':side,'environment':environment,'pattern':pattern,'queries':queries,'result':{'body':result,'calls':calls,'fallback':fallback}})
                        for response in [0,1]:
                            full=True
                            full_environment={**environment,'otherResponse':response}
                            environment=full_environment
                            for name,offset in fields.items():write(owner+offset,body[name]&0xffffffff)
                            write(context+0x7f0,environment['frame'])
                            other={'type':other_type,'vx':0x3333,'vy':0}
                            write(incoming+0x9c,other['vx']);write(incoming+0xa0,other['vy'])
                            cpu.mem_write(stack+0xff00,struct.pack('<3I',stop,incoming,side))
                            cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
                            calls=[];queries=[];fallback=False
                            cpu.emu_start(0x4d6e30,stop,count=10000)
                            if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Full airborne callback did not return')
                            result={name:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for name,offset in fields.items()}
                            other_out={'type':other_type,'vx':struct.unpack('<i',cpu.mem_read(incoming+0x9c,4))[0],'vy':struct.unpack('<i',cpu.mem_read(incoming+0xa0,4))[0]}
                            complete.append({'input':body,'other':other,'side':side,'environment':full_environment,'pattern':pattern,'queries':queries,'result':{'body':result,'calls':calls,'fallback':fallback,'other':other_out}})
                        full=False
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D6E30..004D7357','method':__doc__,'cases':cases,'complete_callbacks':complete},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} contact decisions and {len(complete)} complete airborne callbacks')
