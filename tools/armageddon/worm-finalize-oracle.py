"""Execute worm transition finalization 004D8189..004D82CF.

Body getter, team-state writes and scheduler timer routine execute unchanged.
Event queue insertion is observed at the interface; no event consumer runs.
The state-specific entry routine has already finished at this boundary.
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

context=0x2300000
cpu.mem_map(context,0x20000)
write(owner,0x526de0);write(owner+0x38,context)
cpu.mem_write(0x4b26a0,b'\xc2\x18\x00')
fields={'state':0x50,'team':0xfc,'worm':0x100,'field298':0x298,'field29c':0x29c,'field2e0':0x2e0,'field26c':0x26c,'weaponId':0x170,'weaponRecord':0x354}
calls=[]
def observe(cpu,address,size,user):
    if address!=0x4b26a0:return
    sp=cpu.reg_read(UC_X86_REG_ESP)
    source,delay,flags,event,size,payload=struct.unpack('<6I',cpu.mem_read(sp+4,24))
    if source!=owner:raise RuntimeError('Unexpected event source')
    calls.append({'operation':'event','delay':delay,'flags':flags,'id':event,'size':size,'payload':list(struct.unpack('<3i',cpu.mem_read(payload,12)))})
cpu.hook_add(UC_HOOK_CODE,observe)
cases=[]
states=list(range(0x65,0x89))+[-1,0x100]
for previous in states:
    for next_state in states:
        for profile in range(5):
            body={'state':previous,'team':profile+1,'worm':profile+1,'field298':0 if profile==4 else 7,'field29c':0 if profile==4 else (8 if profile==1 else 7),'field2e0':int(profile==2),'field26c':int(profile==3),'weaponId':43,'weaponRecord':123456}
            for name,offset in fields.items():write(owner+offset,body[name]&0xffffffff)
            state_address=context+0x1b94+body['team']*0x51c+body['worm']*0x9c-0x594
            busy_address=state_address+0x98
            write(state_address,0x123);write(busy_address,0x123);write(context+0x800,37)
            sp=stack+0xf000
            cpu.mem_write(sp,bytes(0x150));write(sp+0x144,stop)
            for reg,value in [(UC_X86_REG_ESP,sp),(UC_X86_REG_EBX,owner),(UC_X86_REG_EBP,0x526de0),(UC_X86_REG_ESI,next_state&0xffffffff),(UC_X86_REG_EDI,previous&0xffffffff)]:cpu.reg_write(reg,value)
            calls=[]
            cpu.emu_start(0x4d8189,stop,count=10000)
            if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Finalization did not return')
            result={name:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for name,offset in fields.items()}
            signed_state=struct.unpack('<i',cpu.mem_read(state_address,4))[0]
            cases.append({'input':body,'previous':previous,'next':next_state,'timer':37,'result':{'body':result,'calls':calls,'scheduler':{'state':signed_state,'busy':read(busy_address),'timer':read(context+0x800)}}})
# Isolated jump/landing update branches: explicit velocity and animation inputs.
animator,anim_vtable,queue,transition,vtable=owner+0x1000,owner+0x1100,owner+0x1200,owner+0x1300,owner+0x1400
write(owner+0x350,animator);write(animator,anim_vtable);write(anim_vtable+0x1c,queue)
write(vtable+0x80,transition)
for address in [queue,transition]:cpu.mem_write(address,b'\xc2\x04\x00')
target=None
def tick_observe(cpu,address,size,user):
    global target
    sp=cpu.reg_read(UC_X86_REG_ESP)
    if address==queue:calls.append({'operation':'queue','sprite_id':read(sp+4),'progress':0})
    elif address==transition:target=read(sp+4)
cpu.hook_add(UC_HOOK_CODE,tick_observe)
ticks=[]
for state,entry in [(0x79,0x4deb8d),(0x7a,0x4debc5)]:
    for sprite in [0x16,0x18,0x17,0x19,0x1a,0x1d]:
        for progress in [-1,0,65535,65536,65537,-0x80000000,0x7fffffff]:
            for vy in [-1,0,1,-0x80000000,0x7fffffff]:
                sp=stack+0xf000
                write(sp+0x24,progress&0xffffffff);write(sp+0x28,sprite);write(sp+0x2c,vy&0xffffffff)
                for reg,value in [(UC_X86_REG_ESP,sp),(UC_X86_REG_EDI,owner),(UC_X86_REG_ESI,vtable)]:cpu.reg_write(reg,value)
                calls=[];target=None
                cpu.emu_start(entry,0x4ded66,count=1000)
                if cpu.reg_read(UC_X86_REG_EIP)!=0x4ded66:raise RuntimeError('Tick branch did not reach boundary')
                ticks.append({'state':state,'sprite':sprite,'progress':progress,'vy':vy,'result':{'calls':calls,'target':target}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D8189..004D82CF','method':__doc__,'cases':cases,'jump_landing_ticks':ticks},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} finalization cases and {len(ticks)} jump/landing ticks')
