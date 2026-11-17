"""Execute original004CA320 constrained body ticks with captured interfaces."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP
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
def signed(v):return v if v<0x80000000 else v-0x100000000


manager,mt,world,terrain,tt,buffer,vt=[owner+0x1000+i*0x1000 for i in range(7)]
point,collide,awake,water,skim,bounce=[owner+0x8000+i*0x100 for i in range(6)]
write(manager,mt);write(mt+0xc,collide);write(manager+0x3c0,world);write(world+0x24,terrain);write(terrain,tt);write(tt+0x28,point);write(owner+0xf8,buffer)
write(owner,vt)
for offset,value in {0xf4:awake,0x3c:water,0x40:skim,0x30:bounce}.items():write(vt+offset,value)
fields={'x':0x90,'y':0x94,'vx':0x9c,'vy':0xa0,'anchorX':0xcc,'anchorY':0xd0,'length':0xd4,'segmentCount':0xdc,
'enabled':0x48,'suspended':0x54,'sleeping':0xb8,'submerged':0xbc,'contact':0xc0,'moving':0xc4,'angle':0x98,'angularVelocity':0xa4,
'flags':0x40,'gravityScale':0x6c,'skimScale':0xb4,'waterDrag':0x60,'ropeFriction':0x84,'angleDamping':0x8c,'constrained':0xc8}
def hook(cpu,address,size,user):
 global terrainCalls,bodyCalls
 if address not in [point,collide,awake,water,skim,bounce,0x4c98e0,0x4ca250]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4)
 count=0;result=0
 if address==point:
  terrainCalls+=1;calls.append(['terrain',signed(arg(0)),signed(arg(1))]);count=2;result=int(terrainCalls==terrainAt)
 elif address==collide:
  bodyCalls+=1;calls.append(['collide',signed(arg(1)),signed(arg(2))]);count=3;result=7 if bodyCalls==bodyAt else 0
 elif address==awake:calls.append(['awake']);result=awakeValue
 elif address==water:calls.append(['water'])
 elif address==skim:calls.append(['skim'])
 elif address==bounce:calls.append(['bounce',arg(0)]);count=1
 elif address==0x4c98e0:calls.append(['refresh']);count=1
 else:calls.append(['earthquake',signed(arg(1))]);count=2
 cpu.reg_write(UC_X86_REG_EAX,result);cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for angle in [0,0x1000,0x4000,0x8000,0xf000]:
 for vx,vy in [(0,0),(65536,0),(-65536,65536),(1000000,-2000000)]:
  for mode in range(12):
   for terrainAt,bodyAt in [(0,0),(1,0),(0,1)]:
    segments=[0]*128;segments[1]=angle
    if mode==11:segments[6]=-1;segments[9]=1
    initial=dict(x=100<<16,y=180<<16,vx=vx,vy=vy,anchorX=100<<16,anchorY=200<<16,length=38<<16,segmentCount=5,segments=segments,
     enabled=int(mode!=1),suspended=int(mode==2),sleeping=int(mode in [3,4]),submerged=int(mode==8),contact=1,moving=1,angle=123,angularVelocity=456,
     flags=0x400000 if mode in [7,8,9] else 0,gravityScale=0 if mode==6 else 65536,skimScale=65536,waterDrag=0xcccc,ropeFriction=60000 if mode==10 else 65536,angleDamping=0x3000,constrained=1)
    env=dict(frame=0 if mode==4 else 1,index=0,earthquake=32 if mode==5 else 0,waterY=179,gravity=0x3d70)
    awakeValue=int(mode not in [3,4,5])
    for key,offset in fields.items():write(owner+offset,initial[key])
    for i,value in enumerate(segments):write(buffer+i*4,value)
    write(world+0x7f0,env['frame']);write(world+0x1ac4,env['earthquake']);write(manager+0x3b4,env['waterY']);write(manager+0x3b8,env['gravity'])
    sp=stack+0xff00;write(sp,stop);write(sp+4,owner);write(sp+8,0);cpu.reg_write(UC_X86_REG_ECX,manager);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[];terrainCalls=bodyCalls=0
    cpu.emu_start(0x4ca320,stop,count=100000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Rope tick failed to return')
    out={key:signed(read(owner+offset)) for key,offset in fields.items()};out['segments']=[signed(read(buffer+i*4)) for i in range(128)]
    cases.append(dict(body=initial,environment=env,awake=awakeValue,terrainAt=terrainAt,bodyAt=bodyAt,output=dict(body=out,calls=calls)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004CA320 constrained path with original004CA8A0 and004C9F10. Real trig and fixed arithmetic. Explicit terrain, collision, awake, refresh, earthquake and event interfaces; bounce reports hits without modifying velocity.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} rope ticks')
