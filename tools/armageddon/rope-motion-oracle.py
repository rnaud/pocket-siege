"""Execute original004CA8A0 constrained rope movement with captured interfaces."""
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

manager,mt,world,terrain,tt,buffer= [owner+0x1000+i*0x1000 for i in range(6)]
point,collide,time=owner+0x7000,owner+0x7100,owner+0x7200
write(manager,mt);write(mt+0xc,collide);write(manager+0x3c0,world);write(world+0x24,terrain);write(terrain,tt);write(tt+0x28,point);write(owner+0xf8,buffer)
fields={'x':0x90,'y':0x94,'vx':0x9c,'vy':0xa0,'anchorX':0xcc,'anchorY':0xd0,'length':0xd4,'segmentCount':0xdc}
def hook(cpu,address,size,user):
 global terrainCalls,bodyCalls
 if address not in [point,collide]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4)
 if address==point:
  terrainCalls+=1;calls.append(dict(operation='terrain',request=[signed(arg(0)),signed(arg(1))]));count=2
  cpu.reg_write(UC_X86_REG_EAX,int(terrainCalls==terrainAt))
 else:
  bodyCalls+=1;calls.append(dict(operation='collide',request=[signed(arg(1)),signed(arg(2))]));count=3
  cpu.reg_write(UC_X86_REG_EAX,7 if bodyCalls==bodyAt else 0)
 cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for count in [2,5]:
 for angle in [0,0x4000,0x6000,0x8000,0xe000]:
  for vx,vy in [(0,0),(65536,0),(-65536,65536),(1000000,-2000000),(2147483647,-2147483648)]:
   for bends in [0,1,2,3]:
    for terrainAt,bodyAt,remaining in [(0,0,65536),(1,0,65536),(3,0,32768),(0,1,65536),(0,3,12345)]:
     segments=[0]*128;segments[1]=angle
     if bends:
      segments[(count-2)*2]=1 if bends==1 else -1
      segments[(count-1)*2+1]=0x1000 if bends==1 else -1 if bends==2 else 1
     body=dict(x=12345678,y=-8765432,vx=vx,vy=vy,anchorX=100<<16,anchorY=200<<16,length=(count*8-2)<<16,segmentCount=count,segments=segments)
     for key,offset in fields.items():write(owner+offset,body[key])
     for i,value in enumerate(segments):write(buffer+i*4,value)
     write(time,remaining)
     sp=stack+0xff00;write(sp,stop);write(sp+4,owner);write(sp+8,time);cpu.reg_write(UC_X86_REG_ECX,manager);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[];terrainCalls=bodyCalls=0
     cpu.emu_start(0x4ca8a0,stop,count=30000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Rope movement failed to return')
     out={key:signed(read(owner+offset)) for key,offset in fields.items()}
     out['segments']=[signed(read(buffer+i*4)) for i in range(128)]
     output=dict(body=out,remaining=signed(read(time)),hit=signed(cpu.reg_read(UC_X86_REG_EAX)),calls=calls)
     cases.append(dict(body=body,remaining=remaining,terrainAt=terrainAt,bodyAt=bodyAt,output=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004CA8A0 with real native trig, clamp, fixed division and multiplication. Terrain-point and body collision interfaces return designated hits; all128 segment words, body motion, remaining time, hit and query order compared. Full collision response and outer constrained-body tick are not executed.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} rope-motion cases')
