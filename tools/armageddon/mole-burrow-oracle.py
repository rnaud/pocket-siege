"""Capture the original mode-4 projectile burrow (Mole Bomb's mole).

Routines run unchanged:
- 004E3570, the mode-4 frame: while its dig counter (+0x3AC) runs it follows
  its saved arc (+0x3B4 time, +0x3B8..+0x3C4 position and velocity) at a tenth
  of the speed with the original fixed multiply/divide and atan2, sprays dirt
  every third frame, tests and digs tool mask 1, moves, and when the counter
  empties or it reaches the water line it resumes physics, arms (+0x3B0) and
  takes the arc's velocity, its vertical part clamped;
- 004EDD10, the dirt spray with the original trig and logic random stream.
World gravity, landscape test/dig/pixel colour, worm virtuals and the dirt
receiver (message 0x43F) are interfaces whose arguments are recorded.
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
owner, stack, stop, scene = 0x2000000, 0x2100000, 0x2200000, 0x2300000
for address in [owner, stack, stop]: cpu.mem_map(address,0x10000)
cpu.mem_map(scene,0x20000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v): return v if v<0x80000000 else v-0x100000000
def ret(cleanup,value=0):
    sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp)
    cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
vt, world, world_vt, land, land_vt, dirt, dirt_vt = (owner+0x1000, owner+0x2000, owner+0x2100, owner+0x3000, owner+0x3100,
    owner+0x4000, owner+0x4100)
names=['setPosition','setVelocity','state','physics','gravity','test','dig','pixel','dirt']
stubs={n: stop+0x100+i*0x10 for i,n in enumerate(names)}
write(owner,vt);write(owner+0x38,scene);write(owner+0x30,owner+0x6000)
write(vt+0x100,stubs['setPosition']);write(vt+0x104,stubs['setVelocity']);write(vt+0x80,stubs['state']);write(vt+0x6c,stubs['physics'])
write(scene+0x7d4,world);write(world,world_vt);write(world_vt+0x24,stubs['gravity'])
write(scene+0x24,land);write(land,land_vt);write(land_vt+0x10,stubs['test']);write(land_vt+0xc,stubs['dig']);write(land_vt+0x1c,stubs['pixel'])
write(dirt,dirt_vt);write(dirt_vt+8,stubs['dirt'])
calls=[];env={}
def hook(cpu,address,size,user):
    sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i: signed(read(sp+i*4))
    if address==stubs['setPosition']:
        calls.append({'operation':'position','x':arg(1),'y':arg(2)});ret(8,env.get('placed',1))
    elif address==stubs['setVelocity']: calls.append({'operation':'velocity','x':arg(1),'y':arg(2)});ret(8)
    elif address==stubs['state']: calls.append({'operation':'state','state':arg(1)});ret(4)
    elif address==stubs['physics']: calls.append({'operation':'physics','value':arg(1)});ret(4)
    elif address==stubs['gravity']: ret(0,env['gravity'])
    elif address==stubs['test']:
        request=[arg(1),arg(2),arg(3)];calls.append({'operation':'test','request':request});ret(12,env['solid'](request[2]))
    elif address==stubs['dig']: calls.append({'operation':'dig','request':[arg(1),arg(2),arg(3)]});ret(12)
    elif address==stubs['pixel']:
        x,y=arg(1),arg(2);ret(8,env['color'](x,y))
    elif address==stubs['dirt']:
        packet=read(sp+16);calls.append({'operation':'dirt','event':arg(2),'packet':[signed(read(packet+i*4)) for i in range(5)]});ret(16,1)
    elif address==0x4ccf50: ret(8,dirt)
cpu.hook_add(UC_HOOK_CODE,hook)
FIELDS={'counter':0x3ac,'armed':0x3b0,'time':0x3b4,'x':0x3b8,'y':0x3bc,'vx':0x3c0,'vy':0x3c4}
def run(entry,arguments):
    sp=stack+0xf000
    for i,value in enumerate([stop]+arguments): write(sp+i*4,value)
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
    cpu.emu_start(entry,stop,count=200000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError(f'{entry:x} did not return')
    return signed(cpu.reg_read(UC_X86_REG_EAX))
def body(): return {k:signed(read(owner+o)) for k,o in FIELDS.items()}
color=lambda x,y: (x*7+y*3)&0xff
frames=[]
for counter in [0,1,2,10]:
    for t in [0,0x1999,0x8000,0x33333]:
        for vx,vy in [(0x30000,0x20000),(-0x20000,0x50000),(0,-0x40000)]:
            for gravity in [0x3d70,0x7ae0]:
                for frame in [0,1,3]:
                    for solid,placed,water in [(0,1,600),(1,1,600),(0,0,600),(0,1,200)]:
                        state=dict(counter=counter,armed=0,time=t,x=0x3200000,y=0xc80000,vx=vx,vy=vy)
                        for k,o in FIELDS.items(): write(owner+o,state[k])
                        env.clear();env.update(gravity=gravity,placed=placed,color=color,
                            solid=(lambda y,s=solid: s))
                        write(scene+0x804,water);write(scene+0x7f0,frame);write(scene+0x1acc,0x13572468+frame)
                        calls.clear();run(0x4e3570,[])
                        frames.append({'input':{**state,'gravity':gravity,'frame':frame,'solid':solid,'placed':placed,
                            'water':water,'seed':0x13572468+frame},'result':{'body':body(),'calls':list(calls),
                            'random':read(scene+0x1acc)}})
# Whole burrows: terrain is solid between y = 210 and 260 px.
burrows=[]
for vx,vy in [(0x30000,0x20000),(-0x20000,0x50000),(0x10000,0x8000)]:
    state=dict(counter=10,armed=0,time=0,x=0x3200000,y=0xc80000,vx=vx,vy=vy)
    for k,o in FIELDS.items(): write(owner+o,state[k])
    env.clear();env.update(gravity=0x3d70,placed=1,color=color,solid=lambda y: int(210<=y<260))
    write(scene+0x804,600);write(scene+0x1acc,99)
    steps=[]
    for frame in range(200):
        write(scene+0x7f0,frame);calls.clear();run(0x4e3570,[])
        steps.append({'body':body(),'calls':list(calls)})
        if not read(owner+0x3ac): break
    burrows.append({'input':state,'steps':steps,'random':read(scene+0x1acc)})
sprays=[]
for angle in [0,0x4000,0x9000,-0x2000]:
    for spread,dist in [(0x2666,0x14),(0x10000,8)]:
        for seed,frame in [(0,0),(0xdeadbeef,5)]:
            env.clear();env.update(color=lambda x,y: 0 if (x+y)%3==0 else (x^y)&0xff)
            write(scene+0x1acc,seed);write(scene+0x7f0,frame);calls.clear()
            count=run(0x4edd10,[0x3200000,0xc80000,angle,spread,dist])
            sprays.append({'input':{'x':0x3200000,'y':0xc80000,'angle':angle,'spread':spread,'distance':dist,'seed':seed,'frame':frame},
                'result':{'count':count,'calls':list(calls),'random':read(scene+0x1acc)}})
args.output.write_text(json.dumps({'sha256':digest,'frames':frames,'burrows':burrows,'sprays':sprays},separators=(',',':'))+'\n')
print(f'{len(frames)} frames, {len(burrows)} burrows ({sum(len(b["steps"]) for b in burrows)} steps), {len(sprays)} sprays')
