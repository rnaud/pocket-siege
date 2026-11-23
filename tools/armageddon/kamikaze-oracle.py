"""Capture the original Kamikaze flight from the executable.

Three routines run unchanged:
- 004F76A0, entered with worm state 0x6D after the 004FCB20 launch: dig
  budget from weapon +0x70, the wkami1..5 sprite chosen by aim, pixel
  alignment, border clamping, unit velocity and the scene flag +0x12418;
- 004F77E0, the state 0x6D frame: aim direction (004FAF90 with the original
  trig) snapped to eight directions, the landscape dig and collision test
  with tool mask 4 or 5, a 16-pixel step, the 004F7DA0 ram request, the map
  bounds, the smoke particle with the visual random stream (004EE930), the
  water exit to state 0x87, and the final 0x404 blast, damage accounting,
  announcement, state 0x89 and task deletion;
- 004D68D0, the announcement selector over the English table +0x24.
Worm virtuals, the landscape, the ram/particle/blast requests, health and
damage-total queries, accounting and the announcement sink are interfaces
whose arguments are recorded.
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
def string(address): return bytes(cpu.mem_read(address,256)).split(b'\0')[0].decode('cp1252')
def ret(cleanup,value=0):
    sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp)
    cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)

vt, record, anim, anim_vt, land, land_vt, language = (owner+0x1000, owner+0x2000, owner+0x3000,
    owner+0x3100, owner+0x4000, owner+0x4100, owner+0x5000)
stubs = {name: stop+0x100+i*0x10 for i,name in enumerate(
    ['position','setPosition','setVelocity','physics','setState','delete','clear','queue','dig','test'])}
write(owner,vt);write(owner+0x38,scene);write(owner+0x350,anim);write(owner+0x354,record)
write(vt+0x5c,stubs['position']);write(vt+0x100,stubs['setPosition']);write(vt+0x104,stubs['setVelocity'])
write(vt+0x114,stubs['physics']);write(vt+0x80,stubs['setState']);write(vt+0x0,stubs['delete'])
write(anim,anim_vt);write(anim_vt+0x14,stubs['clear']);write(anim_vt+0x1c,stubs['queue'])
write(scene+0x24,land);write(land,land_vt);write(land_vt+0xc,stubs['dig']);write(land_vt+0x10,stubs['test'])
write(language,0x5259c8);write(scene+0x1c,language)
write(record+0x68,4);write(record+0x6c,4)
for offset,value in [(0x70,500),(0x74,30),(0x78,95),(0x7c,30),(0x80,100),(0x84,30)]: write(record+offset,value)
write(owner+0xfc,1);write(owner+0x100,2)
write(0x5178f4,stop+0x300)

calls=[];world={}
def hook(cpu,address,size,user):
    sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i: signed(read(sp+i*4))
    if address==stubs['position']:
        write(read(sp+4),world['x']);write(read(sp+8),world['y']);ret(8)
    elif address==stubs['setPosition']:
        world['x'],world['y']=arg(1),arg(2);calls.append({'operation':'position','x':arg(1),'y':arg(2)});ret(8)
    elif address==stubs['setVelocity']:
        calls.append({'operation':'velocity','x':arg(1),'y':arg(2)});ret(8)
    elif address==stubs['physics']: calls.append({'operation':'physics','value':arg(1)});ret(4)
    elif address==stubs['setState']: calls.append({'operation':'state','state':arg(1)});ret(4)
    elif address==stubs['delete']: calls.append({'operation':'delete','value':arg(1)});ret(4)
    elif address==stubs['clear']: calls.append({'operation':'clear'});ret(0)
    elif address==stubs['queue']: calls.append({'operation':'queue','sprite':arg(1)});ret(4)
    elif address==stubs['dig']: calls.append({'operation':'dig','request':[arg(1),arg(2),arg(3)]});ret(12)
    elif address==stubs['test']:
        request=[arg(1),arg(2),arg(3)];calls.append({'operation':'test','request':request})
        ret(12,world['solid'](*request))
    elif address==0x4d6760: calls.append({'operation':'camera'});ret(0)
    elif address==0x4f7da0: calls.append({'operation':'area','request':[arg(i) for i in range(1,13)]});ret(0x30)
    elif address==0x4ee7f0: calls.append({'operation':'particle','request':[arg(i) for i in range(1,13)]});ret(0x30)
    elif address==0x4c2e50: ret(8,world['total'])
    elif address==0x4c2cc0: ret(8,world['health'])
    elif address==0x4ef070: calls.append({'operation':'blast','packet':[arg(i) for i in range(1,7)]});ret(0x18)
    elif address==0x4d8440: calls.append({'operation':'accounting','request':[arg(1),arg(2),arg(3)]});ret(0xc)
    elif address==0x4d68d0 and world.get('stubAnnouncement',True):
        calls.append({'operation':'announcement','table':read(sp+4)});ret(4)
    elif address==stop+0x300:
        text=string(read(sp+8)).replace('%s',string(read(sp+12)))
        cpu.mem_write(read(sp+4),text.encode('cp1252')+b'\0');ret(0,len(text))
    elif address==0x4eefb0:
        calls.append({'operation':'message','text':string(read(sp+8)),'font':arg(1)});ret(8)
cpu.hook_add(UC_HOOK_CODE,hook)

def run(entry,cleanup_args):
    sp=stack+0xf000
    for i,value in enumerate([stop]+cleanup_args): write(sp+i*4,value)
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
    cpu.emu_start(entry,stop,count=200000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError(f'{entry:x} did not return')
    return signed(cpu.reg_read(UC_X86_REG_EAX))

def setup(state):
    world.clear();world.update(state)
    write(owner+0x260,state['aim']);write(owner+0x1b0,state['facing']);write(owner+0x28c,state.get('dig',0))
    cpu.mem_write(scene+0x11d67,bytes([state.get('border',0)]));write(scene+0x1b8ac,state.get('roof',0))
    write(scene+0x804,state.get('water',600));write(scene+0x1ad0,state.get('seed',0))
    cpu.mem_write(owner+0x0,struct.pack('<I',vt))
    # Team 1's marked byte (scene + team*3000 + 0x3CD2) skips the announcement.
    cpu.mem_write(scene+3000*1+0x3cd2,bytes([state.get('marked',0)]))

AIMS=[0,1,0x1000,0x2000,0x3fff,0x4000,0x6000,0x8000,0xa000,0xc000,0xe000,0xffff,0x10000]
starts=[]
for aim in AIMS:
    for facing in [-1,1]:
        for x,y in [(0x3201234,0x1009876),(-0x50000,0x10000),(0x7a00000,0x2c00000),(0x180000,0x180000)]:
            for border,roof in [(0,0),(1,0),(0,1)]:
                state=dict(aim=aim,facing=facing,x=x,y=y,border=border,roof=roof)
                setup(state);calls.clear()
                write(scene+0x12418,0)
                run(0x4f76a0,[0,0,0])
                starts.append({'input':state,'result':{'calls':list(calls),'dig':signed(read(owner+0x28c)),
                    'flag':read(scene+0x12418)}})

ticks=[]
solid_any=lambda s,x,y: 1
solid_none=lambda s,x,y: 0
for aim in AIMS:
    for facing in [-1,1]:
        for dig in [0,15,20,21,500]:
            for solid in [0,1]:
                for total in [0,5]:
                    for health,marked in [(0,0),(50,0),(50,1)]:
                        for x,y,water in [(0x3201234,0x1009876,600),(-0x1ff0000,0x1000000,600),(0x97f0000,0x1000000,600),
                                          (0x1000000,-0x1ff8000,600),(0x1000000,0x2500000,600),(0x1000000,0x2600000,600)]:
                            if health==50 and marked==1 and (x,y)!=(0x3201234,0x1009876): continue
                            state=dict(aim=aim,facing=facing,dig=dig,x=x,y=y,water=water,total=total,health=health,
                                marked=marked,seed=0x1234567+aim,solid=solid_any if solid else solid_none)
                            setup(state);calls.clear()
                            result=run(0x4f77e0,[])
                            row=dict(state);row['solid']=solid
                            ticks.append({'input':row,'result':{'returned':result,'calls':list(calls),
                                'dig':signed(read(owner+0x28c)),'seed':read(scene+0x1ad0)}})

# Whole flights: the terrain is solid below y=500 px and right of x=1500 px.
flights=[]
for aim in [0x2000,0x6000,0x8000,0xa000,0xe000]:
    for facing in [-1,1]:
        for dig in [0,100,500]:
            state=dict(aim=aim,facing=facing,x=0x3201234,y=0x1009876,water=650,total=0,health=60,seed=99,
                solid=lambda s,x,y: int(y>=500 or x>=1500))
            setup(state);calls.clear();write(record+0x70,dig)
            run(0x4f76a0,[0,0,0])
            frames=[];returned=1
            while returned==1 and len(frames)<200:
                calls.clear();returned=run(0x4f77e0,[])
                frames.append({'returned':returned,'calls':list(calls),'dig':signed(read(owner+0x28c))})
            flights.append({'aim':aim,'facing':facing,'dig':dig,'frames':frames})
write(record+0x70,500)

# 004D68D0 over the language +0x24 table with the original selector.
sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,language);cpu.reg_write(UC_X86_REG_ESP,sp)
cpu.emu_start(read(0x5259c8+0x24),stop,count=100)
table=cpu.reg_read(UC_X86_REG_EAX);messages=[];entry=table
while read(entry): messages.append(string(read(entry)));entry+=4
announcements=[]
cpu.mem_write(owner+0x304,b'Boggy B\0')
for seed in [0,1,17,255,0xffffffff]:
    for frame in [0,3,0x7fffffff]:
        for color in [0,1,5]:
            world.clear();world['stubAnnouncement']=False;calls.clear()
            write(scene+0x1acc,seed);write(scene+0x7f0,frame);write(owner+0x10c,color)
            run(0x4d68d0,[table])
            announcements.append({'seed':seed,'frame':frame,'color':color,
                'result':{'calls':list(calls),'random':read(scene+0x1acc)}})

args.output.write_text(json.dumps({'sha256':digest,'table':table,'messages':messages,'starts':starts,'ticks':ticks,
    'flights':flights,'announcements':announcements},separators=(',',':'))+'\n')
print(f'{len(starts)} starts, {len(ticks)} ticks, {len(flights)} flights '
      f'({sum(len(f["frames"]) for f in flights)} frames), {len(announcements)} announcements, messages {messages}')
