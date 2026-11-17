"""Execute original motion primitives and simple-body ticks in Unicorn.

Collision predicates receive fixed-point coordinates and return explicit hit IDs.
No game entry point runs.
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

body,vtable,collision=owner+0x2000,owner+0x800,owner+0xa00
write(owner,vtable);write(vtable+0xc,collision);cpu.mem_write(collision,b'\xc2\x0c\x00')
queries=[];shape='empty';hit_id=7
def solid(x,y):
    x >>= 16;y >>= 16
    return {'empty':False,'right':x>=5,'left':x<0,'floor':y>=5,'ceiling':y<0,'pixel':x==3 and y==3}[shape]
def observe(cpu,address,size,unused):
    sp=cpu.reg_read(UC_X86_REG_ESP)
    x,y=struct.unpack('<2i',cpu.mem_read(sp+8,8))
    queries.append([x,y]);cpu.reg_write(UC_X86_REG_EAX,hit_id if solid(x,y) else 0)
cpu.hook_add(UC_HOOK_CODE,observe,begin=collision,end=collision)
def run(address,arguments,this=owner):
    queries.clear()
    cpu.mem_write(stack+0xff00,struct.pack('<I',stop)+b''.join(struct.pack('<I',v&0xffffffff) for v in arguments))
    cpu.reg_write(UC_X86_REG_ECX,this);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(address,stop,count=50000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('Native routine did not return')
    return cpu.reg_read(UC_X86_REG_EAX)
sweeps=[]
for start in [[0,0],[0x18000,0x24000],[-0x18000,0x1ffff]]:
    for velocity in [[0,0],[123,456],[8<<16,2<<16],[2<<16,8<<16],[-8<<16,2<<16],[2<<16,-8<<16],[-8<<16,-8<<16],[8<<16,8<<16]]:
        for fraction in [0,32768,65536]:
            for shape in ['empty','right','left','floor','ceiling','pixel']:
                for offset,value in zip([0x90,0x94,0x9c,0xa0],start+velocity): write(body+offset,value&0xffffffff)
                write(owner+0x7000,99);write(owner+0x7004,fraction)
                hit=run(0x4c9aa0,[body,owner+0x7000,owner+0x7004])
                sweeps.append({'start':start,'velocity':velocity,'fraction':fraction,'shape':shape,'hit':hit,
                    'position':list(struct.unpack('<2i',cpu.mem_read(body+0x90,8))),'side':read(owner+0x7000),'remaining':read(owner+0x7004),'queries':list(queries)})
forces=[]
for gravity in [-32768,0,32768]:
    for wind in [-4096,0,4096]:
        for velocity in [[0,0],[65536,-32768]]:
            for scale in [0,32768,65536]:
                for drag in [60000,65536]:
                    for shape in ['empty','right','floor','ceiling']:
                        write(owner+0x3b8,gravity&0xffffffff);write(owner+0x3bc,wind&0xffffffff)
                        for offset,value in {0x90:4<<16,0x94:4<<16,0x9c:velocity[0],0xa0:velocity[1],0x64:drag,0x68:scale,0x6c:scale,0xc4:0}.items():write(body+offset,value&0xffffffff)
                        result=run(0x4ca110,[body])
                        forces.append({'gravity':gravity,'wind':wind,'velocity':velocity,'scale':scale,'drag':drag,'shape':shape,
                            'result':result,'velocity_out':list(struct.unpack('<2i',cpu.mem_read(body+0x9c,8))),'moving':read(body+0xc4),'queries':list(queries)})
bounces=[]
other=owner+0x4000
velocities=[[0,0],[0x6665,0],[0x6666,0],[-0x6666,0],[0x3333,0x3332],[0x3333,0x3333],[8<<16,-3<<16],[-8<<16,3<<16],[0x7fffffff,1],[-0x80000000,0]]
for velocity in velocities:
    for other_velocity in [[0,0],[0x6665,0],[0x6666,0],[-0x80000000,1]]:
        for coefficients in [[0,0,0],[65536,65536,65536],[0x9999,0x8000,0xcccc],[-32768,98304,60000]]:
            for side in [0,1,2,3,4,99]:
                write(body+0x4c,0)
                for offset,value in zip([0x9c,0xa0,0x78,0x7c,0x80],velocity+coefficients):write(body+offset,value&0xffffffff)
                for offset,value in zip([0x9c,0xa0],other_velocity):write(other+offset,value&0xffffffff)
                run(0x4f4860,[other,side],body)
                bounces.append({'velocity':velocity,'other_velocity':other_velocity,'coefficients':coefficients,'side':side,
                    'velocity_out':list(struct.unpack('<2i',cpu.mem_read(body+0x9c,8))),
                    'other_velocity_out':list(struct.unpack('<2i',cpu.mem_read(other+0x9c,8)))})
water=[]
body_vtable,skim_event=owner+0xb00,owner+0xc00
write(body,body_vtable);write(body_vtable+0x40,skim_event);cpu.mem_write(skim_event,b'\xc3')
skims=[]
def on_skim(cpu,address,size,unused): skims.append(True)
cpu.hook_add(UC_HOOK_CODE,on_skim,begin=skim_event,end=skim_event)
for flags in [0,0x400000]:
    for y in [4<<16,5<<16,(5<<16)+65535,6<<16]:
        for velocity in [[6<<16,0],[(6<<16)+1,0],[10<<16,2<<16],[-10<<16,-2<<16],[24<<16,8<<16],[24<<16,(8<<16)-1],[0,0]]:
            for suppress in [0,1]:
                for shape in ['empty','floor']:
                    skims.clear();write(owner+0x3b4,5)
                    for offset,value in {0x40:flags,0x90:4<<16,0x94:y,0x9c:velocity[0],0xa0:velocity[1],0xb4:65536,0x60:0xcccc,0xbc:0}.items():write(body+offset,value&0xffffffff)
                    result=run(0x4c9f10,[body,suppress])
                    water.append({'flags':flags,'y':y,'velocity':velocity,'suppress':suppress,'shape':shape,
                        'y_out':struct.unpack('<i',cpu.mem_read(body+0x94,4))[0],
                        'velocity_out':list(struct.unpack('<2i',cpu.mem_read(body+0x9c,8))),
                        'submerged':read(body+0xbc),'skim':bool(skims),'result':result,'queries':list(queries)})
ticks=[]
context=owner+0x6000
awake_stub,water_event=owner+0xd00,owner+0xe00
write(body_vtable+0x2c,0x4f4860);write(body_vtable+0xf4,awake_stub);write(body_vtable+0x3c,water_event)
cpu.mem_write(awake_stub,b'\xc3');cpu.mem_write(water_event,b'\xc3')
awake_value=1;events=[]
def on_awake(cpu,address,size,unused):
    events.append('awake');cpu.reg_write(UC_X86_REG_EAX,awake_value)
def on_water(cpu,address,size,unused): events.append('water')
cpu.hook_add(UC_HOOK_CODE,on_awake,begin=awake_stub,end=awake_stub)
cpu.hook_add(UC_HOOK_CODE,on_water,begin=water_event,end=water_event)
hit_id=other
fields={'enabled':0x48,'suspended':0x54,'sleeping':0xb8,'submerged':0xbc,'contact':0xc0,'moving':0xc4,
'x':0x90,'y':0x94,'vx':0x9c,'vy':0xa0,'angle':0x98,'angularVelocity':0xa4,'radius':0x5c,
'flags':0x40,'gravityScale':0x6c,'windScale':0x68,'drag':0x64,'skimScale':0xb4,'waterDrag':0x60,
'restitutionX':0x78,'restitutionY':0x7c,'tangent':0x80}
for velocity in [[8<<16,2<<16],[-8<<16,2<<16],[0,0],[40<<16,-35<<16]]:
    for shape in ['empty','right','floor']:
        for awake_value in [0,1]:
            for sleeping in [0,1]:
                for frame in [0,1]:
                    for flags in [0,0x400000]:
                        initial={'enabled':1,'suspended':0,'sleeping':sleeping,'submerged':0,'contact':1,'moving':1,
                            'x':2<<16,'y':4<<16,'vx':velocity[0],'vy':velocity[1],'angle':123,'angularVelocity':456,'radius':2<<16,
                            'flags':flags,'gravityScale':65536,'windScale':65536,'drag':65536,'skimScale':65536,'waterDrag':0xcccc,
                            'restitutionX':0x9999,'restitutionY':0x8000,'tangent':0xcccc}
                        for name,offset in fields.items():write(body+offset,initial[name]&0xffffffff)
                        write(body+0xc8,0);write(body+0x4c,0)
                        write(other+0x9c,0);write(other+0xa0,0)
                        write(owner+0x3c0,context);write(context+0x7f0,frame);write(context+0x1ac4,0)
                        write(owner+0x3b4,3);write(owner+0x3b8,0x3d70);write(owner+0x3bc,1024)
                        # Prime native collision-mask cache; callback supplies the predicate.
                        for offset,value in {4:body,8:read(body+0x44),12:flags,16:initial['x'],20:initial['y']}.items():write(owner+offset,value)
                        events.clear();skims.clear()
                        run(0x4ca320,[body,0])
                        output={name:struct.unpack('<i',cpu.mem_read(body+offset,4))[0] for name,offset in fields.items()}
                        ticks.append({'initial':initial,'frame':frame,'awake':awake_value,'shape':shape,'output':output,
                            'events':list(events),'skims':len(skims),'queries':list(queries)})
awake=[]
for mask in range(32):
    values=[-1 if mask&(1<<bit) else 0 for bit in range(5)]
    for offset,value in zip([0x9c,0xa0,0xbc,0xc0,0xc4],values):write(body+offset,value&0xffffffff)
    result=run(0x4d11e0,[],body)
    awake.append({'values':values,'result':result})
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps({'executable_sha256':digest,'entries':['004CA110','004C9AA0','004F4860','004C9F10','004CA320 simple-body path','004D11E0'],
    'method':'Original forces and sweep run with fixed-point body fields and explicit collision predicates. Hit side starts at sentinel 99; force position=(4,4). Collision returns object ID 7. Bounce uses the simple-body branch with explicit coefficients and a second body. Water uses level 5, drag 0xcccc, skim scale 0x10000 and observes virtual +0x40 without side effects. Body ticks use the simple-body path with zero earthquake, primed collision-mask cache, native bounce and explicit awake/event callbacks. Awake cases execute 004D11E0 directly for all 32 motion-flag combinations.',
    'sweeps':sweeps,'forces':forces,'bounces':bounces,'water':water,'ticks':ticks,'awake':awake},indent=2)+'\n')
print(f'Captured {len(sweeps)} sweeps and {len(forces)} force cases and {len(bounces)} simple-body bounces and {len(water)} water cases and {len(ticks)} body ticks')

# Drowned worm trajectories: water-only flags, native awake getter and no
# eligible collision categories. These exercise original004CA320 every tick.
write(body_vtable+0xf4,0x4d11e0)
shape='empty'
drowning=[]
for velocity,drag in [([0,0],0xc000),([3<<16,2<<16],0xcccc),([-2<<16,-1<<16],0xc777)]:
    initial={'enabled':1,'suspended':0,'sleeping':0,'submerged':1,'contact':0,'moving':1,
        'x':200<<16,'y':618<<16,'vx':velocity[0],'vy':velocity[1],'angle':0,'angularVelocity':0,'radius':16<<16,
        'flags':0x400000,'gravityScale':65536,'windScale':0,'drag':65536,'skimScale':0x20000,'waterDrag':drag,
        'restitutionX':0x9999,'restitutionY':0,'tangent':0xf5c2}
    for name,offset in fields.items():write(body+offset,initial[name]&0xffffffff)
    write(body+0xc8,0);write(body+0x4c,1)
    write(owner+0x3b4,606);write(owner+0x3b8,0x3d70);write(owner+0x3bc,0)
    trajectory=[]
    for frame in range(300):
        write(context+0x7f0,frame)
        for offset,value in {4:body,8:read(body+0x44),12:0x400000,16:read(body+0x90),20:read(body+0x94)}.items():write(owner+offset,value)
        run(0x4ca320,[body,0])
        output={name:struct.unpack('<i',cpu.mem_read(body+offset,4))[0] for name,offset in fields.items()}
        alive=(output['y']>>16)<808
        trajectory.append(dict(frame=frame,body=output,alive=alive))
        if not alive:break
    if trajectory[-1]['alive']:raise RuntimeError('Drowning trajectory never reached removal depth')
    drowning.append(dict(initial=initial,trajectory=trajectory))
args.output.with_name('drowning-flight.json').write_text(json.dumps(dict(executable_sha256=digest,method='Original004CA320 with native004D11E0 awake, zero eligible collision categories, water606 and removal depth808. Body fields captured after every tick; alive comparison follows004DE2DB..004DE2ED.',cases=drowning),separators=(',',':'))+'\n')
print(f'Captured {sum(len(row["trajectory"]) for row in drowning)} drowning motion ticks')
