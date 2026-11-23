"""Capture the original Earthquake from the executable.

Four routines run unchanged:
- 004EB2E0, the world's per-frame earthquake tick: progress over
  duration*50 frames, a strength easing 0xCCC per frame toward a triangle
  target, the busy helper, two looping sounds, camera shake and the
  scene+0x1AC4 strength bodies read;
- 004ECFB0 event 0x445 (the Earthquake utility 004FC990 sends {8}),
  including the English language getter +0x300 and announcement selector;
- 004CA250, the per-body kick: two logic-random samples scaled by strength,
  skipped for submerged bodies, delivered through virtual +0x34;
- 004D6940, the worm's +0x34 receiver: outside its flight states the worm
  enters state 0x7F, then 004F4D20 adds the velocity.
Sound, announcement, state and sprintf calls are interfaces whose arguments
are recorded.
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
owner, stack, stop = 0x2000000, 0x2100000, 0x2200000
for address in [owner, stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v): return v if v<0x80000000 else v-0x100000000

context=owner+0x20000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
fields={'strength':0x64,'target':0x68,'progress':0x6c,'duration':0x70,'handleA':0xb4,'handleB':0xb8}
shared={'shake':0x1b8c4,'busy':0x800,'quake':0x1ac4,'started':0x1ac8}
language=owner+0x5000;payload=owner+0x6000
write(language,0x5259c8);write(context+0x1c,language)
write(0x5178f4,stop+0x300)
def string(address):
    return bytes(cpu.mem_read(address,256)).split(b'\0')[0].decode('cp1252')
calls=[]
def ret(cleanup,value=0):
    sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp)
    cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)

# Worm receiver: vtable +0x7C state getter, +0x80 state setter.
worm, worm_vt = owner+0x8000, owner+0x9000
GET_STATE, SET_STATE, RECEIVER = stop+0x400, stop+0x500, stop+0x600
write(worm,worm_vt);write(worm_vt+0x7c,GET_STATE);write(worm_vt+0x80,SET_STATE);write(worm_vt+0x34,RECEIVER)
worm_state=[0x65]
# Body for 004CA250: environment +0x3C0 is the scene.
environment=owner+0xa000;write(environment+0x3c0,context)

def hook(cpu,address,size,user):
    sp=cpu.reg_read(UC_X86_REG_ESP)
    if address==stop+0x300:
        text=string(read(sp+8)).replace('%s',string(read(sp+12)))
        cpu.mem_write(read(sp+4),text.encode('cp1252')+b'\0');ret(0,len(text))
    elif address==0x4b26a0:
        event=read(sp+16);record=read(sp+24)
        if event!=0x43d: raise RuntimeError('Unexpected event')
        calls.append({'operation':'announcement','message':{'text':string(read(record+8)),'font':signed(read(record+12))}});ret(24)
    elif address==0x4edb90:
        request=[signed(read(sp+i*4)) for i in range(1,6)];handle=401 if request[0]==0x10004 else 402
        calls.append({'operation':'play','request':request,'handle':handle});ret(20,handle)
    elif address==0x4edbe0:
        calls.append({'operation':'volume','handle':read(sp+4),'volume':signed(read(sp+8))});ret(8)
    elif address==0x4edc30:
        calls.append({'operation':'stop','handle':read(sp+4)});ret(4)
    elif address==GET_STATE: ret(0,worm_state[0])
    elif address==SET_STATE:
        calls.append({'operation':'state','state':read(sp+4)});worm_state[0]=read(sp+4);ret(4)
    elif address==RECEIVER:
        calls.append({'operation':'impulse','x':signed(read(sp+4)),'y':signed(read(sp+8))});ret(8,1)
cpu.hook_add(UC_HOOK_CODE,hook)

def snapshot():
    return dict([(k,signed(read(owner+o))) for k,o in fields.items()]+[(k,signed(read(context+o))) for k,o in shared.items()])

# 004EB2E0 ticks.
cases=[]
for progress in [-1,0,1,16384,32767,32768,65535,65536]:
    for duration in [1,8,60]:
        for strength in [0,1,3276,3277,0x8000,65536,70000]:
            for target in [0,0x3333]:
                for handles in [(0,0),(11,0),(0,12),(11,12)]:
                    body=dict(strength=strength,target=target,progress=progress,duration=duration,
                        handleA=handles[0],handleB=handles[1],shake=77,busy=0,quake=55,started=1)
                    for k,o in fields.items(): write(owner+o,body[k])
                    for k,o in shared.items(): write(context+o,body[k])
                    sp=stack+0xf000;write(sp,stop);calls.clear()
                    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
                    cpu.emu_start(0x4eb2e0,stop,count=1000)
                    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('Earthquake tick did not return')
                    cases.append({'input':body,'result':{'body':snapshot(),'calls':list(calls)}})

# 004ECFB0 event 0x445 starts.
starts=[]
for duration in [1,8,60]:
    for seed in [0,1,17,255,0xffffffff]:
        for frame in [0,3,100,0x7fffffff]:
            body=dict(strength=12345,target=23456,progress=-1,duration=9,handleA=11,handleB=12,shake=77,busy=99,quake=5,started=0)
            for k,o in fields.items(): write(owner+o,body[k])
            for k,o in shared.items(): write(context+o,body[k])
            write(context+0x1acc,seed);write(context+0x7f0,frame);write(payload,duration)
            sp=stack+0xf000
            for i,value in enumerate([stop,owner,0x445,0x124,payload]): write(sp+i*4,value)
            calls.clear();cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
            cpu.emu_start(0x4ecfb0,stop,count=10000)
            if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('Earthquake start did not return')
            starts.append({'input':body,'duration':duration,'seed':seed,'frame':frame,
                'result':{'body':snapshot(),'calls':list(calls),'random':read(context+0x1acc)}})

# 004CA250 kicks through a recording +0x34 receiver.
body_object, body_vt = owner+0xb000, owner+0xc000
write(body_object,body_vt);write(body_vt+0x34,RECEIVER)
kicks=[]
for strength in [0,1,0x8000,0x10000,0x80000,-0x10000]:
    for seed in [0,1,0x12345678,0xffffffff]:
        for frame in [0,7,0x7fffffff]:
            for submerged in [0,1]:
                write(context+0x1acc,seed);write(context+0x7f0,frame);write(body_object+0xbc,submerged)
                sp=stack+0xf000
                for i,value in enumerate([stop,body_object,strength]): write(sp+i*4,value)
                calls.clear();cpu.reg_write(UC_X86_REG_ECX,environment);cpu.reg_write(UC_X86_REG_ESP,sp)
                cpu.emu_start(0x4ca250,stop,count=1000)
                if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('Earthquake kick did not return')
                kicks.append({'strength':strength,'seed':seed,'frame':frame,'submerged':submerged,
                    'result':{'calls':list(calls),'random':read(context+0x1acc)}})

# 004D6940 worm receiver with original 004F4D20.
responses=[]
write(worm_vt+0x34,0x4d6940)
for state in range(0x65,0x8a):
    for vx,vy in [(0,0),(0x1234,-0x5678),(-0x7fffffff,-0x10)]:
        for x,y in [(0x100,-0x200),(-0x10000,0x10000),(0x10,-0x7fffffff)]:
            worm_state[0]=state;write(worm+0x9c,vx);write(worm+0xa0,vy)
            sp=stack+0xf000
            for i,value in enumerate([stop,x,y]): write(sp+i*4,value)
            calls.clear();cpu.reg_write(UC_X86_REG_ECX,worm);cpu.reg_write(UC_X86_REG_ESP,sp)
            cpu.emu_start(0x4d6940,stop,count=1000)
            if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('Worm receiver did not return')
            responses.append({'state':state,'vx':vx,'vy':vy,'x':x,'y':y,'result':{
                'calls':list(calls),'vx':signed(read(worm+0x9c)),'vy':signed(read(worm+0xa0)),
                'returned':cpu.reg_read(UC_X86_REG_EAX)}})

# Execute the English virtual getter to extract its null-terminated table.
sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,language);cpu.reg_write(UC_X86_REG_ESP,sp)
cpu.emu_start(read(0x5259c8+0x300),stop,count=100)
table=cpu.reg_read(UC_X86_REG_EAX);messages=[]
while read(table): messages.append(string(read(table)));table+=4
args.output.write_text(json.dumps({'sha256':digest,'messages':messages,'starts':starts,'cases':cases,
    'kicks':kicks,'responses':responses},separators=(',',':'))+'\n')
print(f'{len(cases)} ticks, {len(starts)} starts, {len(kicks)} kicks, {len(responses)} responses, messages {messages}')
