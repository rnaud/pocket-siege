"""Execute common worm state body preparation 004D7730..004D7A65.

Original body getters/setters, type changes and constraint detach execute.
Exit handlers, sound backend, allocator and manager callbacks are observed stubs.
State-specific entry routines are not executed. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX
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

context=0x2300000
cpu.mem_map(context,0x20000)
animator,anim_vtable,anim_get=owner+0x1000,owner+0x1100,owner+0x1200
record,rope=owner+0x2000,owner+0x2200
manager,manager_vtable,remove,add=owner+0x3000,owner+0x3100,owner+0x3200,owner+0x3300
write(owner,0x526de0);write(owner+0x38,context)
write(owner+0x350,animator);write(animator,anim_vtable);write(anim_vtable+0xc,anim_get)
cpu.mem_write(anim_get,b'\xc2\x08\x00')
write(owner+0x354,record)
write(context+0x7d4,manager);write(manager,manager_vtable)
write(manager_vtable+0x38,remove);write(manager_vtable+0x34,add)
for address in [remove,add,0x4edc30]:cpu.mem_write(address,b'\xc2\x04\x00')
for address in [0x4f9160,0x4f93a0,0x4f7d90]:cpu.mem_write(address,b'\xc3')
cpu.mem_write(0x4edb90,b'\xc2\x14\x00')
cpu.mem_write(0x492510,b'\xc3') # caller cleans allocator argument
cpu.mem_write(0x4edad0,b'\xb8'+struct.pack('<I',rope)+b'\xc2\x04\x00')
fields={'state':0x50,'type':0x3c,'complex':0x4c,'restitutionY':0x7c,'flags':0x40,'windScale':0x68,'suspended':0x54,'enabled':0x48,'savedFlags':0x288,'drag':0x64,'complexDrag':0x84,'vx':0x9c,'vy':0xa0,'constraint':0xc8,'constraintHandle':0xf8,'soundHandle':0x38c}
for offset in [0x240,0x244,0x2ec,0x8c,0x15c,0x210,0x250,0x140,0x104,0x154]:fields[f'field{offset:03x}']=offset
calls=[]
environment={}
boundary=0x4d7a65
def observe(cpu,address,size,user):
    if address==boundary:
        cpu.emu_stop()
        return
    sp=cpu.reg_read(UC_X86_REG_ESP)
    if address in [0x4f9160,0x4f93a0,0x4f7d90]:calls.append({'operation':'exit','state':read(owner+0x50)})
    elif address==0x4edc30:calls.append({'operation':'stopSound','handle':read(sp+4)})
    elif address==0x4edb90:
        calls.append({'operation':'sound','request':list(struct.unpack('<5i',cpu.mem_read(sp+4,20)))})
        cpu.reg_write(UC_X86_REG_EAX,environment['soundHandle'])
    elif address==0x492510:calls.append({'operation':'freeConstraint','handle':read(sp+4)})
    elif address in [remove,add]:calls.append({'operation':'removeBody' if address==remove else 'addBody','type':read(owner+0x3c)})
cpu.hook_add(UC_HOOK_CODE,observe)
cases=[]
states=list(range(0x65,0x89))+[-1,0x100]
for profile in range(3):
    environment={'soundHandle':99,'weapon70':[25,-25,0x7fffffff][profile],'ropeMode':profile,'schemeByte':[0,42,255][profile]}
    write(record+0x70,environment['weapon70']&0xffffffff)
    cpu.mem_write(rope+0x72,bytes([profile]));cpu.mem_write(context+0x11d40,bytes([environment['schemeByte']]))
    for previous in states:
        for next_state in states:
            body={name:7 for name in fields}
            body.update(state=previous,type=[2,3,6][profile],flags=[0x420cc6,0,-1][profile],savedFlags=0x420cc6,constraint=profile,constraintHandle=73,soundHandle=0 if profile==0 else 19,field104=profile,vx=-4<<16,vy=2<<16)
            for name,offset in fields.items():write(owner+offset,body[name]&0xffffffff)
            calls=[]
            cpu.mem_write(stack+0xff00,struct.pack('<2I',stop,next_state&0xffffffff))
            cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
            cpu.emu_start(0x4d7730,stop,count=10000)
            if cpu.reg_read(UC_X86_REG_EIP)!=0x4d7a65:raise RuntimeError('State prefix did not reach boundary')
            result={name:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for name,offset in fields.items()}
            cases.append({'input':body,'next':next_state,'environment':environment,'result':{'body':result,'calls':calls}})
# Airborne entry blocks are reached through the actual common preparation.
clear,queue=owner+0x1300,owner+0x1400
write(anim_vtable+0x14,clear);write(anim_vtable+0x1c,queue)
cpu.mem_write(clear,b'\xc3');cpu.mem_write(queue,b'\xc2\x04\x00')
cpu.mem_write(0x4edaf0,b'\xc2\x08\x00')
def airborne_observe(cpu,address,size,user):
    sp=cpu.reg_read(UC_X86_REG_ESP)
    if address==anim_get:
        write(read(sp+4),environment['previousSprite']);write(read(sp+8),0)
    elif address==clear:calls.append({'operation':'clear'})
    elif address==queue:calls.append({'operation':'queue','sprite_id':read(sp+4),'progress':0})
    elif address==0x4edaf0:
        team,slot=read(sp+4),read(sp+8)
        calls.append({'operation':'voice','team':team,'slot':slot})
        cpu.reg_write(UC_X86_REG_EAX,environment['voiceId'])
cpu.hook_add(UC_HOOK_CODE,airborne_observe)
airborne=[]
fields.update(team=0xfc,field2b0=0x2b0,field2b4=0x2b4,field19c=0x19c)
for next_state in [0x79,0x7a]:
    for previous in [0x65,0x78,0x7d,0x88]:
        for sprite in [0x16,0x1a9]:
            for vy in [0,0x5ffff,0x60000,-0x60000,-0x80000000]:
                for mode in range(6):
                    environment={'soundHandle':99,'weapon70':25,'ropeMode':0,'schemeByte':42,'previousSprite':sprite,'voiceId':1234}
                    body={name:7 for name in fields}
                    body.update(state=previous,type=2,flags=0x420cc6,savedFlags=0x420cc6,constraint=0,constraintHandle=0,soundHandle=0 if mode%2 else 19,field104=0,vx=-0x12345,vy=vy,team=3,field2b0=[-1,0,1][mode//2],field2b4=mode%2)
                    for name,offset in fields.items():write(owner+offset,body[name]&0xffffffff)
                    calls=[]
                    cpu.mem_write(stack+0xff00,struct.pack('<2I',stop,next_state))
                    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
                    boundary=0x4d7a65
                    try: cpu.emu_start(0x4d7730,stop,count=10000)
                    except Exception:
                        print(hex(cpu.reg_read(UC_X86_REG_EIP)),previous,next_state,mode,environment)
                        raise
                    before={name:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for name,offset in fields.items()}
                    calls=[]
                    boundary=0x4d8189
                    cpu.emu_start(0x4d7a65,stop,count=10000)
                    if cpu.reg_read(UC_X86_REG_EIP)!=0x4d8189:raise RuntimeError('Airborne entry did not reach boundary')
                    result={name:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for name,offset in fields.items()}
                    airborne.append({'input':before,'next':next_state,'environment':environment,'result':{'body':result,'calls':calls}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D7730..004D7A65','method':__doc__,'cases':cases,'jump_landing_entries':airborne},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} state body transitions and {len(airborne)} jump/landing entries')
