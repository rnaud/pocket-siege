"""Capture the original Suicide Bomber and its poison gas from the executable.

Routines run unchanged:
- 004F7BE0, entering worm state 0x75: the wkambmr animation;
- 004F7C10, the state 0x75 frame: wait for the animation, then twenty gas
  clouds placed with the logic random stream, the forced damage accounting,
  the farewell, the 0x404 blast, state 0x89 and task deletion;
- 004D37D0, the gas cloud constructor (task base construction stubbed);
- 004D3AB0 events 0x3EA/0x3EB, the gas frame (drift, wind, damping, lifetime,
  busy helper 004EEBF0, and every eleventh frame the 004D39D0 poison scan over
  the object registry) and its draw request.
Worm virtuals, allocation, registry objects, accounting, announcement, blast
and the sprite queue are interfaces whose arguments are recorded.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX
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
owner, stack, stop, scene, gas = 0x2000000, 0x2100000, 0x2200000, 0x2300000, 0x2400000
for address in [owner, stack, stop, gas]: cpu.mem_map(address,0x10000)
cpu.mem_map(scene,0x20000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v): return v if v<0x80000000 else v-0x100000000
def ret(cleanup,value=0):
    sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp)
    cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)

vt, record, anim, anim_vt, world, world_vt = (owner+0x1000, owner+0x2000, owner+0x3000, owner+0x3100,
    owner+0x4000, owner+0x4100)
names=['position','setState','delete','clear','queue','progress','wind','first','next','gasDelete']
stubs={name: stop+0x100+i*0x10 for i,name in enumerate(names)}
write(owner,vt);write(owner+0x38,scene);write(owner+0x350,anim);write(owner+0x354,record);write(owner+0x30,owner+0x6000)
write(vt+0x5c,stubs['position']);write(vt+0x80,stubs['setState']);write(vt+0x0,stubs['delete'])
write(anim,anim_vt);write(anim_vt+0x14,stubs['clear']);write(anim_vt+0x1c,stubs['queue']);write(anim_vt+0xc,stubs['progress'])
write(scene+0x7d4,world);write(world,world_vt);write(world_vt+0x28,stubs['wind'])
write(world_vt+0x48,stubs['first']);write(world_vt+0x4c,stubs['next'])
write(record+0x70,5);write(record+0x74,30)
language=owner+0x5000;write(language,0x5259c8);write(scene+0x1c,language)
write(owner+0xfc,1);write(owner+0x100,2)
gas_vt=owner+0x7000;write(gas_vt,stubs['gasDelete'])
# Registry objects for the poison scan: vtable +0x50 type, +0x5C position, +8 message.
objects=[]
obj_base=owner+0x8000
TYPE,POS,MSG=stop+0x300,stop+0x310,stop+0x320
for i in range(8):
    o=obj_base+i*0x100;ov=o+0x80
    write(o,ov);write(ov+0x50,TYPE);write(ov+0x5c,POS);write(ov+8,MSG)

calls=[];world_state={}
def hook(cpu,address,size,user):
    sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i: signed(read(sp+i*4))
    ecx=cpu.reg_read(UC_X86_REG_ECX)
    if address==stubs['position']:
        write(read(sp+4),world_state['x']);write(read(sp+8),world_state['y']);ret(8)
    elif address==stubs['setState']: calls.append({'operation':'state','state':arg(1)});ret(4)
    elif address==stubs['delete']: calls.append({'operation':'delete','value':arg(1)});ret(4)
    elif address==stubs['gasDelete']: calls.append({'operation':'delete','value':arg(1)});ret(4)
    elif address==stubs['clear']: calls.append({'operation':'clear'});ret(0)
    elif address==stubs['queue']: calls.append({'operation':'queue','sprite':arg(1)});ret(4)
    elif address==stubs['progress']:
        write(read(sp+4),0);write(read(sp+8),world_state['progress']);ret(8)
    elif address==stubs['wind']: ret(0,world_state.get('wind',0))
    elif address in (stubs['first'],stubs['next']):
        # Both write the next object to their first argument; the iterator
        # position is kept here rather than in the caller's stack slots.
        index=0 if address==stubs['first'] else world_state['cursor']+1
        world_state['cursor']=index
        if index>=len(world_state.get('objects',[])): ret(8,0);return
        write(read(sp+4),obj_base+index*0x100);ret(8,1)
    elif address==TYPE: ret(0,world_state['objects'][(ecx-obj_base)//0x100]['type'])
    elif address==POS:
        o=world_state['objects'][(ecx-obj_base)//0x100];write(read(sp+4),o['x']);write(read(sp+8),o['y']);ret(8)
    elif address==MSG:
        calls.append({'operation':'poison','target':(ecx-obj_base)//0x100,'event':arg(2),'amount':signed(read(read(sp+16)))});ret(16,1)
    elif address==0x4ccf50: ret(8,0x5555)
    # 00492550 is the cdecl allocator; the caller pops its argument.
    elif address==0x492550: ret(0,world_state.get('alloc',gas))
    elif address==0x4d37d0 and world_state.get('stubGas',True):
        calls.append({'operation':'gas','request':[arg(2),arg(3),arg(4)]});ret(0x10,ecx)
    elif address==0x4c2cc0: ret(8,world_state['health'])
    elif address==0x4d8440: calls.append({'operation':'accounting','request':[arg(1),arg(2),arg(3)]});ret(0xc)
    elif address==0x4d68d0: calls.append({'operation':'announcement'});ret(4)
    elif address==0x4ef070: calls.append({'operation':'blast','packet':[arg(i) for i in range(1,7)]});ret(0x18)
    elif address==0x4ed970: write(ecx+0x38,scene);ret(4)
    elif address==0x4b19e0: ret(4)
    elif address==0x4eedf0: calls.append({'operation':'draw','request':[arg(i) for i in range(1,7)]});ret(0x18)
    elif address==0x4b26f0: ret(0x10)
cpu.hook_add(UC_HOOK_CODE,hook)

def run(entry,this,arguments):
    sp=stack+0xf000
    for i,value in enumerate([stop]+arguments): write(sp+i*4,value)
    cpu.reg_write(UC_X86_REG_ECX,this);cpu.reg_write(UC_X86_REG_ESP,sp)
    cpu.emu_start(entry,stop,count=500000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError(f'{entry:x} did not return')
    return signed(cpu.reg_read(UC_X86_REG_EAX))

entries=[]
calls.clear();run(0x4f7be0,owner,[0,0,0]);entries.append(list(calls))

frames=[]
for progress in [0,0x8000,0xffff,0x10000,0x18000]:
    for health in [0,40]:
        for marked in [0,1]:
            for seed,frame in [(0,0),(0x12345678,77),(0xffffffff,0x7fffffff)]:
                for x,y in [(0x3201234,0x1009876),(-0x10000,0x2a00000)]:
                    if marked and (health==0 or x<0): continue
                    world_state.clear();world_state.update(progress=progress,health=health,x=x,y=y)
                    cpu.mem_write(scene+3000+0x3cd2,bytes([marked]))
                    write(scene+0x1acc,seed);write(scene+0x7f0,frame)
                    calls.clear();result=run(0x4f7c10,owner,[])
                    frames.append({'input':{'progress':progress,'health':health,'marked':marked,'seed':seed,
                        'frame':frame,'x':x,'y':y},'result':{'returned':result,'calls':list(calls),
                        'random':read(scene+0x1acc)}})

FIELDS={'x':0x40,'y':0x44,'vx':0x48,'vy':0x4c,'progress':0x50,'speed':0x54,'sprite':0x58,'minRadius':0x5c,
    'maxRadius':0x60,'order':0x64,'damping':0x68,'lift':0x6c,'amount':0x3c}
def gas_state(): return {k:signed(read(gas+o)) for k,o in FIELDS.items()}
creates=[]
for seed,frame in [(0,0),(1,3),(0x12345678,0x3ff),(0xffffffff,0x7fffffff)]:
    for x,y,amount in [(0x3201234,0x1009876,5),(-0x80000,0x80000,10)]:
        world_state.clear();world_state['stubGas']=False
        write(scene+0x1acc,seed);write(scene+0x7f0,frame)
        calls.clear();run(0x4d37d0,gas,[0x5555,x,y,amount])
        creates.append({'input':{'seed':seed,'frame':frame,'x':x,'y':y,'amount':amount},
            'result':{'body':gas_state(),'random':read(scene+0x1acc)}})

ticks=[]
OBJECTS=[{'type':5,'x':0x3201234,'y':0x1009876},{'type':5,'x':0x3301234,'y':0x1009876},{'type':1,'x':0x3201234,'y':0x1009876},
    {'type':2,'x':0x3201234+0x110000,'y':0x1009876+0x100000},{'type':6,'x':0x3201234,'y':0x1009876},{'type':4,'x':0x3201234-0x230000,'y':0x1009876}]
for progress,speed in [(0,0x3d7),(0x8000,0x400),(0xfc00,0x49e),(0xffff,0x3d7)]:
    for vx,vy in [(0,0),(0x12345,-0x23456),(-0x7fffffff,0x7fffffff)]:
        for wind in [0,0x1000,-0x8000]:
            for frame in [0,11,12,0x7ffffff4]:
                body={'x':0x3201234,'y':0x1009876,'vx':vx,'vy':vy,'progress':progress,'speed':speed,
                    'sprite':0x1000344,'minRadius':1,'maxRadius':0x17,'order':0x70005,'damping':0xf333,'lift':-0x2666,'amount':5}
                for k,o in FIELDS.items(): write(gas+o,body[k])
                write(gas,gas_vt);write(gas+0x38,scene);write(scene+0x800,0)
                world_state.clear();world_state.update(wind=wind,objects=OBJECTS)
                write(scene+0x1acc,0x2468ace0+frame);write(scene+0x7f0,frame)
                calls.clear();run(0x4d3ab0,gas,[0,0x3ea,0,0])
                after=gas_state();busy=read(scene+0x800)
                calls_tick=list(calls);calls.clear();run(0x4d3ab0,gas,[0,0x3eb,0,0])
                ticks.append({'input':{**body,'wind':wind,'frame':frame,'seed':0x2468ace0+frame},
                    'result':{'body':after,'busy':busy,'calls':calls_tick,'draw':list(calls),'random':read(scene+0x1acc)}})

args.output.write_text(json.dumps({'sha256':digest,'objects':OBJECTS,'entries':entries,'frames':frames,
    'creates':creates,'ticks':ticks},separators=(',',':'))+'\n')
print(f'{len(frames)} bomber frames, {len(creates)} gas creations, {len(ticks)} gas ticks')
