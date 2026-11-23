"""Capture the original Longbow arrow (the 0x148-byte task built by 004FCB20
for weapon kind 1, launch mode 4).

Routines run unchanged, with the arrow vtable 00527800 and the base body
accessors (position, velocity, state, flags, gravity scale, water flags):
- 00502E70, the constructor: launch packet, record damage, straight flight
  (gravity and wind scales zero), placement and the first check 00503130;
- 00503130 / 00503230, the arrow checks: heading from 0049C030, one of 32
  rotated collision shapes (10 + heading/2048), object then landscape hits,
  and the switch to body shape 7;
- 005035D0, a hit: dirt spray, sound 0x1C, then the 0x433 kind 9 packet with
  a quarter of the velocity (reversed for the shooter), or the landscape flag;
- 005034A0, sticking: a last object check, else the arrow image is blitted
  into the landscape centred on the arrow;
- 00503840, events 0x3EA (map edges, bubbles, splash, water flags, camera,
  checks and removal) and 0x3EB (sprite 0x282 at the heading);
- 00503720 (water response sound) and 00503780 (body contact).
The base task/body constructors, the collision world (probe, query, reshape,
placement), object lookup, target virtuals, sounds, dirt spray, bubbles,
random, camera, busy, images, landscape blit, sprite queue and deletion are
interfaces whose arguments are recorded.
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
owner, stack, stop, scene, objects = 0x2000000, 0x2100000, 0x2200000, 0x2300000, 0x2400000
for address in [owner, stack, stop, objects]: cpu.mem_map(address,0x10000)
cpu.mem_map(scene,0x20000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v): return v if v<0x80000000 else v-0x100000000
def ret(cleanup,value=0):
    sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp)
    cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)

names=['probe','place','query','reshape','category','message','stamp','size']
stubs={n: stop+0x100+i*0x10 for i,n in enumerate(names)}
world, world_vt, land, land_vt = objects, objects+0x100, objects+0x200, objects+0x300
images, image_vt = objects+0x1000, objects+0x1f00
write(world,world_vt);write(land,land_vt);write(image_vt+0x14,stubs['size'])
for offset,name in [(8,'probe'),(0xc,'place'),(0x3c,'query'),(0x40,'reshape')]: write(world_vt+offset,stubs[name])
write(land_vt+0x14,stubs['stamp'])
write(scene+0x7d4,world);write(scene+0x24,land)
for i in range(32): write(images+i*0x20,image_vt);write(scene+0x2c+i*4,images+i*0x20)
# Hit targets: fake objects whose virtual +0x50 is the category and +8 the message sink.
TARGETS={'landscape':1,'shooter':2,'worm':2,'barrel':0x11,'mine':0x14}
target_at={}
for i,(name,category) in enumerate(TARGETS.items()):
    obj=objects+0x2000+i*0x200;vtable=obj+0x100
    write(obj,vtable);write(vtable+0x50,stubs['category']);write(vtable+8,stubs['message'])
    target_at[name]=obj;target_at[obj]=name
direct={0x4f4000:'base',0x4b19e0:'task',0x4b26a0:'notify',0x4ccf50:'owner',0x4edc90:'sound',0x4edd10:'dirt',
    0x4edfa0:'bubble',0x4ee930:'random',0x4ee990:'camera',0x4eebe0:'busy',0x4eedf0:'draw',0x4aafd0:'waterSprite',
    0x4f4410:'event',0x503000:'delete'}
calls=[];env={}
def target(name): return target_at[name] if name else 0
def hook(cpu,address,size,user):
    sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i: signed(read(sp+i*4))
    ecx=cpu.reg_read(UC_X86_REG_ECX)
    if address==stubs['probe']:
        shape,x,y,flags=arg(1),arg(2),arg(3),arg(4)
        calls.append({'operation':'probe','shape':shape,'x':x,'y':y,'flags':flags})
        ret(16,target(env['probe'](shape,flags)))
    elif address==stubs['place']:
        assert read(sp+4)==owner
        calls.append({'operation':'place','x':arg(2),'y':arg(3),'flags':signed(read(owner+0x40))});ret(12,env.get('place',0))
    elif address==stubs['query']:
        assert read(sp+4)==owner
        shape,flags=arg(2),arg(3);calls.append({'operation':'query','shape':shape,'flags':flags})
        ret(12,target(env['query'](shape,flags)))
    elif address==stubs['reshape']:
        assert read(sp+4)==owner
        shape=arg(2);calls.append({'operation':'reshape','shape':shape})
        ok=env.get('reshape',1)
        if ok: write(owner+0x44,shape)
        ret(8,ok)
    elif address==stubs['category']:
        name=target_at[ecx];calls.append({'operation':'category','target':name});ret(0,TARGETS[name])
    elif address==stubs['message']:
        packet=read(sp+16)
        calls.append({'operation':'hit','target':target_at[ecx],'sender':'arrow' if read(sp+4)==owner else read(sp+4),
            'event':arg(2),'size':arg(3),'packet':[signed(read(packet+i*4)) for i in range(6)]});ret(16)
    elif address==stubs['size']:
        index=(ecx-images)//0x20;calls.append({'operation':'size','index':index})
        w,h=env.get('image',(60,60));write(read(sp+4),w);write(read(sp+8),h);ret(8)
    elif address==stubs['stamp']:
        values=[arg(i) for i in range(1,8)];values[4]=(read(sp+20)-images)//0x20
        calls.append({'operation':'stamp','request':values});ret(28,1)
    elif address in direct:
        name=direct[address]
        if name=='base':
            # 004F4000 records the category and movement shape (+0x3C/+0x44).
            calls.append({'operation':'base','category':arg(2),'shape':arg(3)});write(owner+0x3c,arg(2));write(owner+0x44,arg(3));ret(12)
        elif name=='task': calls.append({'operation':'task','value':arg(1)});ret(4)
        elif name=='notify':
            calls.append({'operation':'notify','category':arg(2),'value':arg(3),'event':arg(4),'size':arg(5),'data':signed(read(read(sp+24)))});ret(24)
        elif name=='owner':
            calls.append({'operation':'owner','category':arg(1),'id':arg(2)});ret(8,target(env.get('owner','shooter')))
        elif name=='sound': calls.append({'operation':'sound','request':[arg(i) for i in range(1,6)]});ret(20)
        elif name=='dirt': calls.append({'operation':'dirt','request':[arg(i) for i in range(1,6)]});ret(20)
        elif name=='bubble': calls.append({'operation':'bubble','request':[arg(i) for i in range(1,6)]});ret(20)
        elif name=='random':
            value=env['randoms'].pop(0);calls.append({'operation':'random'});ret(0,value)
        elif name=='camera': calls.append({'operation':'camera','request':[arg(i) for i in range(1,4)]});ret(12)
        elif name=='busy': calls.append({'operation':'busy'});ret(0)
        elif name=='draw': calls.append({'operation':'draw','request':[arg(i) for i in range(1,7)]});ret(24)
        elif name=='waterSprite':
            calls.append({'operation':'waterSprite','sprite':arg(1)});ret(0,env.get('waterSprite',0x1282))
        elif name=='event':
            calls.append({'operation':'event','event':arg(2)});ret(16)
        elif name=='delete':
            assert ecx==owner;calls.append({'operation':'delete','value':arg(1)});ret(4,owner)
for address in list(stubs.values())+list(direct):
    cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)

FIELDS={'flags':0x40,'shape':0x44,'enabled':0x48,'field4c':0x4c,'state':0x50,'suspended':0x54,'mass':0x58,
    'windScale':0x68,'gravityScale':0x6c,'field78':0x78,'field7c':0x7c,'x':0x90,'y':0x94,'vx':0x9c,'vy':0xa0,
    'surface':0xb0,'sleeping':0xb8,'submerged':0xbc,'slot':0xfc,'damage':0x12c,'bubbles':0x130,'angle':0x134,
    'splashed':0x138,'sunk':0x13c,'offMap':0x140,'stuck':0x144}
def body():
    result={k:signed(read(owner+o)) for k,o in FIELDS.items()}
    result['packet']=[signed(read(owner+0x100+i*4)) for i in range(11)]
    return result
def load(state):
    cpu.mem_write(owner,bytes(0x148));write(owner,0x527800);write(owner+0x38,scene);write(owner+0x30,objects+0x8000)
    for k,o in FIELDS.items():
        if k in state: write(owner+o,state[k])
    for i,v in enumerate(state.get('packet',[])): write(owner+0x100+i*4,v)
def run(entry,arguments):
    sp=stack+0xf000
    for i,value in enumerate([stop]+arguments): write(sp+i*4,value)
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
    cpu.emu_start(entry,stop,count=100000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError(f'{entry:x} did not return')
    return signed(cpu.reg_read(UC_X86_REG_EAX))
def setScene(water=600,bottom=800,left=0x20000,right=0x77e0000,top=0x20000,layers=(0,)*8):
    write(scene+0x804,water);write(scene+0x808,bottom)
    write(scene+0x1b8cc,left);write(scene+0x1b8d0,right);write(scene+0x1b8d4,top)
    for i,v in enumerate(layers): write(scene+0x1030+i*4,v)
def responder(table):
    # table: list of (shape-or-None, flags, target); first match answers.
    def answer(shape,flags):
        for s,f,t in table:
            if (s is None or s==shape) and f==flags: return t
        return None
    return answer
def capture(entry,arguments,state,world):
    load(state);env.clear();env.update(world);env.setdefault('probe',responder([]));env.setdefault('query',responder([]))
    env.setdefault('randoms',[0x12345678,0x9abcdef0,0x0fedcba9,0x55555555,0xaaaaaaaa])
    calls.clear();result=run(entry,arguments)
    return {'result':result,'body':body(),'calls':list(calls)}
def describe(world):
    return {k:v for k,v in world.items() if k not in ('probe','query')}
def worldOf(probe=(),query=(),**rest):
    w=dict(rest);w['probe']=responder(probe);w['query']=responder(query)
    w['probeTable']=[list(t) for t in probe];w['queryTable']=[list(t) for t in query]
    return w

VELOCITIES=[(0x140000,0),(-0x140000,0),(0,-0x140000),(0,0x140000),(0xe2000,-0xe2000),(-0x9a000,0x118000),(0x30000,0x7000),(0,0),(-5,3)]
packetOf=lambda vx,vy,team=1,worm=2: [team,worm,0x3200000+0x1234,0xc80000+0x8765,vx,vy,0,0,0,0,0]
# Constructor (and its first check 00503130).
creates=[]
for vx,vy in VELOCITIES:
    for team,worm in [(1,2),(0,0),(2,0),(3,1)]:
        for world in [worldOf(),
                      worldOf(place=1),
                      worldOf(probe=[(None,2,'landscape')]),
                      worldOf(probe=[(None,2,'landscape')],owner='worm'),
                      worldOf(query=[(None,-3,'worm')]),
                      worldOf(query=[(None,-3,'barrel'),(None,2,'landscape')]),
                      worldOf(query=[(None,2,'landscape')]),
                      worldOf(reshape=0)]:
            for free in [3,0]:
                record=objects+0x9000;write(record,15)
                packet=packetOf(vx,vy,team,worm)
                for i,v in enumerate(packet): write(objects+0x9100+i*4,v)
                write(scene+0xc28,free);write(scene+0x102c,2)
                for i,v in enumerate([5,6,7]): write(scene+0x828+i*4,v)
                out=capture(0x502e70,[objects+0x9200,record,objects+0x9100],{},world)
                creates.append({'input':{'packet':packet,'damage':15,'free':free,'world':describe(world)},**out})
# Per-frame check 00503230 and first check 00503130, from a flying body.
checks=[]
for entry in [0x503130,0x503230]:
    for vx,vy in VELOCITIES:
        for angle in [0,0x7ff,0x800,0xc000,0x12345]:
            for world in [worldOf(),worldOf(query=[(None,-3,'worm')]),worldOf(query=[(None,-3,'shooter')]),
                          worldOf(query=[(None,2,'landscape')]),worldOf(query=[(None,-3,'mine'),(None,2,'landscape')]),
                          worldOf(probe=[(None,2,'landscape')]),worldOf(reshape=0),
                          worldOf(query=[(None,2,'landscape')],probe=[(None,-3,'barrel')])]:
                state=dict(x=0x3200000,y=0xc80000,vx=vx,vy=vy,angle=angle,flags=-1,shape=6,damage=15,packet=packetOf(vx,vy))
                out=capture(entry,[],state,world)
                checks.append({'routine':f'{entry:08X}','input':{**state,'world':describe(world)},**out})
# Hit 005035D0.
hits=[]
for vx,vy in VELOCITIES+[(-7,-7),(0x7fffffff,-0x7fffffff)]:
    for name in ['landscape','worm','shooter','barrel']:
        for team,worm in [(1,2),(0,2),(1,0)]:
            for stuck in [0,1]:
                state=dict(x=-0x10000+5,y=0xc80000,vx=vx,vy=vy,damage=15,stuck=stuck,packet=packetOf(vx,vy,team,worm))
                out=capture(0x5035d0,[target_at[name]],state,worldOf())
                hits.append({'input':{**state,'target':name},**out})
# Stick 005034A0.
sticks=[]
for vx,vy in VELOCITIES:
    for stuck in [0,1]:
        for x,y in [(0x3200000,0xc80000),(0x1ffff,-0x8000),(-0x30001,0x10000)]:
            for image in [(60,60),(61,59),(1,0)]:
                for world in [worldOf(image=image),worldOf(image=image,probe=[(None,-3,'worm')])]:
                    state=dict(x=x,y=y,vx=vx,vy=vy,angle=0x4321,damage=15,stuck=stuck,shape=7,packet=packetOf(vx,vy))
                    out=capture(0x5034a0,[],state,world)
                    sticks.append({'input':{**state,'world':describe(world)},**out})
# Event 0x3EA frames.
frames=[]
def frameCase(state,world,sceneArgs={}):
    setScene(**sceneArgs)
    sender=objects+0x9300;write(sender,0)
    out=capture(0x503840,[sender,0x3ea,0,objects+0x9400],state,world)
    frames.append({'input':{**state,'scene':{**dict(water=600,bottom=800,left=0x20000,right=0x77e0000,top=0x20000),**sceneArgs},
        'world':describe(world)},**out})
base_state=dict(flags=-1,shape=7,enabled=1,mass=0x10000,damage=15,angle=0x4000,slot=1)
for x in [0x3200000,-0x400001,-0x400000,0x7c00000,0x7c00001,0x12000000,-0x12000000,0x20000,0x10000,0x77e0000,0x77e0001]:
    for y in [0xc80000,0x2580000,0x2570000,0x3200000,0x31f0000,0x10000,0x20000]:
        for offMap in [0,1]:
            state=dict(base_state,x=x,y=y,vx=0x140000,vy=-0x30000,offMap=offMap,packet=packetOf(0x140000,-0x30000))
            frameCase(state,worldOf())
for submerged,surface in [(0,0),(1,0),(0,1),(1,1),(0,2)]:
    for splashed,sunk in [(0,0),(1,0),(0,1),(1,1)]:
        for vy in [0x10000,0x10001,-0x10001,0]:
            for bubbles in [0,0xbfff,0xc000,0x3c000]:
                state=dict(base_state,x=0x3200000,y=0x2000000,vx=0x20000,vy=vy,submerged=submerged,surface=surface,
                    splashed=splashed,sunk=sunk,bubbles=bubbles,packet=packetOf(0x20000,vy))
                frameCase(state,worldOf(),dict(water=600))
for state_value in [0,1]:
    for stuck in [0,1]:
        for world in [worldOf(),worldOf(query=[(None,-3,'worm')]),worldOf(query=[(None,2,'landscape')]),
                      worldOf(reshape=0),worldOf(query=[(None,2,'landscape')],probe=[(None,-3,'barrel')])]:
            for sunk in [0,1]:
                state=dict(base_state,x=0x3200000,y=0xc80000,vx=-0x140000,vy=0x8000,state=state_value,stuck=stuck,sunk=sunk,
                    packet=packetOf(-0x140000,0x8000))
                frameCase(state,world)
# Event 0x3EB draws.
draws=[]
for submerged,surface in [(0,0),(1,0),(0,1)]:
    for slot,angle in [(0,0),(3,0x4000),(7,0xfff0)]:
        setScene(layers=(4,9,2,11,0,0,0,13))
        state=dict(base_state,x=0x3200000+77,y=0xc80000-5,submerged=submerged,surface=surface,slot=slot,angle=angle,packet=packetOf(1,1))
        out=capture(0x503840,[objects+0x9300,0x3eb,0x14,objects+0x9400],state,worldOf(waterSprite=0x5a5))
        draws.append({'input':{**state,'layers':[4,9,2,11,0,0,0,13],'waterSprite':0x5a5},**out})
# Water response 00503720 and contact 00503780.
waters=[]
for vx,vy in VELOCITIES+[(0x7fffffff,0x7fffffff),(-0x80000000,0)]:
    state=dict(vx=vx,vy=vy)
    waters.append({'input':state,**capture(0x503720,[],state,worldOf())})
contacts=[]
for name in ['landscape','worm','shooter']:
    for vx,vy in VELOCITIES[:4]:
        state=dict(base_state,x=0x3200000,y=0xc80000,vx=vx,vy=vy,packet=packetOf(vx,vy))
        out=capture(0x503780,[target_at[name],3],state,worldOf())
        contacts.append({'input':{**state,'target':name},**out})
args.output.write_text(json.dumps({'sha256':digest,'creates':creates,'checks':checks,'hits':hits,'sticks':sticks,
    'frames':frames,'draws':draws,'waters':waters,'contacts':contacts},separators=(',',':'))+'\n')
print(f'{len(creates)} creates, {len(checks)} checks, {len(hits)} hits, {len(sticks)} sticks, {len(frames)} frames, '
      f'{len(draws)} draws, {len(waters)} water sounds, {len(contacts)} contacts')
