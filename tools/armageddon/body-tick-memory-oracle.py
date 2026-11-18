"""Capture original004CA320 addressed control flow and callback-visible memory."""
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
parser.add_argument('--native-forces', action='store_true')
parser.add_argument('--native-sweep', action='store_true')
parser.add_argument('--native-rope', action='store_true')
parser.add_argument('--native-refresh', action='store_true')
parser.add_argument('--native-collision', action='store_true')
args = parser.parse_args()
if args.native_collision:args.native_refresh=True
if args.native_refresh:args.native_rope=True
if args.native_rope:args.native_sweep=True
if args.native_sweep:args.native_forces=True
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


import base64,zlib,itertools
environment=owner+0x1000;world=owner+0x2000;segments=owner+0x5000;vt=owner+0x6000;mt=owner+0x7000
services={0x4c98e0:('refresh',1),0x4c9f10:('water',2),0x4ca110:('air',1),0x4ca8a0:('rope',2),0x4c9aa0:('sweep',3),0x4ca250:('earthquake',2)}
for i,(name,argc) in enumerate([('awake',0),('waterChanged',0),('bounce',1),('freeBounce',2),('collide',3)]):services[stop+0x100+i*0x100]=(name,argc)
if args.native_forces:
 del services[0x4c9f10];del services[0x4ca110]
 services[stop+0x600]=('skim',0)
if args.native_sweep:del services[0x4c9aa0]
if args.native_rope:
 del services[0x4ca8a0];services[stop+0x700]=('terrain',2)
if args.native_refresh:
 del services[0x4c98e0];services[stop+0x800]=('overlap',5)
if args.native_collision:del services[stop+0x500]
calls=[];steps=0
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def hook(cpu,address,size,user):
 global steps
 name,argc=services[address];sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4)
 params=[]
 if name=='overlap':params=[cpu.reg_read(UC_X86_REG_ECX),signed(arg(0)),signed(arg(1)),arg(2),signed(arg(3)),signed(arg(4))]
 if name=='terrain':params=[signed(arg(0)),signed(arg(1))]
 if name=='water':params=[signed(arg(1))]
 if name=='earthquake':params=[signed(arg(1))]
 if name=='bounce':params=[arg(0)]
 if name=='freeBounce':params=[arg(0),arg(1)]
 if name=='collide':params=[signed(arg(1)),signed(arg(2))]
 if name in ['rope','sweep']:params=[read(arg(1 if name=='rope' else 2))]
 calls.append([name,params,snapshot()]);result=0
 if name=='awake':
  result=int(mode not in [3,4,5]);
  if mode==15:write(world+0x1ac4,23)
 elif name=='refresh':
  if mode==6:write(owner+0xbc,1);write(owner+0xc8,1-read(owner+0xc8))
 elif name=='water':
  write(owner+0xbc,int(mode%3==0))
  if mode==7:write(owner+0xc8,0)
  if mode==8:write(environment+0x3b8,0x8000)
  result=int(mode==9)
 elif name=='air':write(owner+0x9c,read(owner+0x9c)+123);write(owner+0xc4,1)
 elif name=='waterChanged':
  if mode==10:write(owner+0xc8,1-read(owner+0xc8))
 elif name in ['rope','sweep']:
  steps+=1;remaining=arg(1 if name=='rope' else 2)
  write(remaining,0 if mode%4==0 else read(remaining)//2)
  write(owner+0x90,read(owner+0x90)+111);write(owner+0x94,read(owner+0x94)-222)
  result=7 if steps%2 else 0
  if name=='sweep':write(arg(1),3)
 elif name in ['bounce','freeBounce']:
  if mode==11:write(owner+0x9c,0);write(owner+0xa0,0)
  if mode==12:write(owner+0x9c,0x7fffffff);write(owner+0xa0,0x80000001)
  if mode==13:write(owner+0xdc,2);write(segments+12,0x1234)
 elif name=='collide':
  result=0 if args.native_forces and mode%2 else 1
  if args.native_forces and mode==7:write(environment+0x3b4,170);write(owner+0x9c,800000);write(owner+0xa0,1234)
  if args.native_forces and mode==8:write(owner+0x64,0x8000);write(owner+0x9c,123456)
 elif name=='overlap':
  result=int(signed(arg(0))!=100 and mode%3!=0) if args.native_collision else int(mode%2==0)
  if mode==7:write(owner+0x90,123<<16);write(owner+0xf0,owner+0x9600);write(owner+0x44,99)
  if mode==8:write(environment+0x40,2)
 elif name=='terrain':
  result=int(mode%4==0)
  if mode==11:
   cpu.mem_write(owner+0x5400,bytes(cpu.mem_read(segments,512)));write(owner+0xf8,owner+0x5400);write(owner+0xdc,3)

 elif name=='skim':
  write(owner+0xc8,0)
  if mode==9:write(owner+0xa0,0);write(owner+0x9c,0)

 elif name=='earthquake':write(owner+0x9c,456);write(world+0x1ac4,0)
 cpu.reg_write(UC_X86_REG_EAX,result)
for address,(name,argc) in services.items():
 cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4));cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for throughList,mode,velocity,constrained in itertools.product(range(2),range(16),([0,65536,-65536,1000000] if args.native_sweep else [0,65536,-65536,0x300000,-0x300000,1000000,-2000000,0x70000000]),range(2)):
 cpu.mem_write(owner,bytes(0x10000));calls.clear();steps=0
 for offset,value in {0:vt,0x48:int(mode!=1),0x54:int(mode==2),0xb8:int(mode in [3,4]),0xbc:1,0xc0:1,0xc4:1,0xc8:constrained,0x90:100<<16,0x94:180<<16,0x9c:velocity,0xa0:-velocity,0x98:123,0xa4:456,0x5c:0 if mode==14 else 0x100000,0x6c:65536,0x84:60000,0x8c:0x3000,0xdc:1,0xf8:segments}.items():write(owner+offset,value)
 write(segments+4,[0,0x1000,0xf000,0x8000][mode%4]);write(environment,mt);write(environment+0x3c0,world);write(environment+0x3b8,0x3d70);write(world+0x7f0,(10 if throughList else 12) if mode==4 else 1);write(world+0x1ac4,32 if mode in [3,5] else 0)
 for offset,value in {0xf4:stop+0x100,0x3c:stop+0x200,0x30:stop+0x300,0x2c:stop+0x400}.items():write(vt+offset,value)
 write(vt+0x40,stop+0x600)
 if args.native_forces:
  for offset,value in {0x40:0x400000 if mode>=6 else 0,0xbc:int(mode==10),0x60:0xcccc,0x64:0xf000,0x68:65536,0xb4:65536,0xa0:10000 if mode in [7,8,9] else -velocity}.items():write(owner+offset,value)
  write(environment+0x3b4,179);write(environment+0x3b8,[0,-0x3d70,0x3d70][mode%3]);write(environment+0x3bc,-0x1000 if mode%2 else 0x2000)
 if args.native_rope:
  write(world+0x24,owner+0x8000);write(owner+0x8000,owner+0x8100);write(owner+0x8128,stop+0x700)
  for offset,value in {0xcc:100<<16,0xd0:200<<16,0xd4:38<<16,0xdc:5}.items():write(owner+offset,value)
 if args.native_refresh:
  write(owner+0x40,read(owner+0x40)|1);write(owner+0xf0,owner+0x9000);write(owner+0x44,mode)
  for mask in [owner+0x9000,owner+0x9600]:write(mask,owner+0x9200)
  write(owner+0x920c,stop+0x800)
  for type in [0,22]:
   row=environment+0x34+type*0x1c;write(row+12,4);write(row+16,owner+0x9800)
  for i,v in enumerate([owner,0,owner+0x9400,owner+0x9500]):write(owner+0x9800+i*4,v)
  for i,other in enumerate([owner+0x9400,owner+0x9500]):
   for offset,value in {0x48:1,0xf0:owner+0x9600,0x90:(105+i)<<16,0x94:180<<16,0xec:123}.items():write(other+offset,value)
  if mode==14:
   for offset,value in {4:owner,8:read(owner+0x44),12:read(owner+0x40),16:read(owner+0x90),20:read(owner+0x94)}.items():write(environment+offset,value)
 write(mt+12,0x4c9770 if args.native_collision else stop+0x500);write(environment+0x24,3);write(environment+0x28,environment+0x800);write(environment+0x808,owner);initial=bytes(cpu.mem_read(owner,0x10000));sp=stack+0xff00
 for i,v in enumerate([stop,owner,1]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ECX,environment);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4ca750 if throughList else 0x4ca320,stop,count=100000)
 assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(nativeCollision=args.native_collision,nativeRefresh=args.native_refresh,nativeRope=args.native_rope,nativeSweep=args.native_sweep,nativeForces=args.native_forces,throughList=throughList,mode=mode,inputMemory=base64.b64encode(zlib.compress(initial)).decode(),calls=list(calls),sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,native_forces=args.native_forces,method=f'{len(cases)} original004CA320 executions, half through original004CA750 sparse-list traversal, full64KiB memory at every service/virtual callback and after return. Native control flow, gravity, friction, rope angle/damping, rotation, clamping and sleep rules execute. Water/air/sweep/rope kernels, refresh, collision, awake, earthquake and event handlers are explicit mutable interfaces. With --native-collision, original004C9770/004C97A0 also execute for every movement collision, using explicit mutable mask-overlap callbacks. With --native-refresh, original004C98E0/004C9970 also execute over sparse category lists with mutable mask-overlap callbacks and cache-hit cases. With --native-rope, original004CA8A0 also executes against five-segment ropes and an explicit terrain-point interface. With --native-sweep, original004C9AA0 also executes and the velocity matrix uses four values (256 cases). With --native-forces, original004C9F10 water and004CA110 air run without interception, including mutable collision and skim callbacks. Not a full native physics integration.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'addressed body ticks')
