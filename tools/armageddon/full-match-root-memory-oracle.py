"""Execute world startup with native presentation and scenery and mine/barrel construction, population, landscape, controllers and worms."""
import argparse
import base64
import zlib
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE, UC_HOOK_MEM_INVALID
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
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

context=0x2300000;cpu.mem_map(context,0x20000);config=owner+0x1000;physics=0x2400000;cpu.mem_map(physics,0x100000);vtable=owner+0x2100
boundaryEntries={}
surfaceCalls={stop+0xc00:(0x3c,5),stop+0xd00:(0x34,4),stop+0xe00:(0x38,4),stop+0xf00:(0x58,3)}
delete=read(0x527300)
interfaces=[(0x4ee7f0,12),(delete,1),(stop+0x900,2),(stop+0xa00,2),(stop+0xb00,2)]+[(entry,n) for entry,(_,n) in surfaceCalls.items()]+list(boundaryEntries.items())+[(stop+0x700,1),(stop+0x800,1)]+[(0x4924d0,0),(0x492510,0),(stop+0x500,5),(stop+0x600,0),(stop+0x300,2),(stop+0x400,4),(0x4aab40,0),(0x492550,0)]
assert 0x4eaf40 not in dict(interfaces) and 0x4e1500 not in dict(interfaces) and 0x5029a0 not in dict(interfaces)
assert 0x4ebe10 not in dict(interfaces) and 0x4d4c70 not in dict(interfaces)
assert 0x4d0d30 not in dict(interfaces) and 0x4e9400 not in dict(interfaces)
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 global attempts,heap
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4ee7f0:calls.append(['effect',[signed(sp+4+i*4) for i in range(12)]])
 elif address==delete:calls.append(['delete',cpu.reg_read(UC_X86_REG_ECX),read(sp+4)])
 elif address in [stop+0x900,stop+0xb00]:
  at=cpu.reg_read(UC_X86_REG_ECX);calls.append(['dimensions',at]);width,height=(1,bits%24) if address==stop+0x900 else (34+bits%3,18+bits%5)
  write(read(sp+4),width);write(read(sp+8),height)
 elif address==stop+0xa00:
  x,y=read(sp+4),read(sp+8);calls.append(['pixel',cpu.reg_read(UC_X86_REG_ECX),x,y]);cpu.reg_write(UC_X86_REG_EAX,y if bits&1 else y%7)
 elif address in surfaceCalls:
  method,n=surfaceCalls[address];calls.append(['surface',cpu.reg_read(UC_X86_REG_ECX),method,[read(sp+4+i*4) for i in range(n)]])
 elif address in boundaryEntries:
  at=cpu.reg_read(UC_X86_REG_ECX);calls.append(['call',address,at,[read(sp+4+i*4) for i in range(boundaryEntries[address])]]);cpu.reg_write(UC_X86_REG_EAX,at)
 elif address in [stop+0x700,stop+0x800]:
  at=cpu.reg_read(UC_X86_REG_ECX);method=0x20 if address==stop+0x700 else 0x2c;calls.append(['virtual',at,method,[read(sp+4)]])
  if method==0x20:write(at+0x3b8,read(sp+4))
 elif address==0x4924d0:
  count=read(sp+8);result=heap;heap+=(count+15)&~15;calls.append(['array',count,result,read(sp+4)]);cpu.reg_write(UC_X86_REG_EAX,result)
 elif address==0x492510:calls.append(['free',read(sp+4)])
 elif address==stop+0x400:
  identity=read(sp+4);calls.append(['metadata',cpu.reg_read(UC_X86_REG_ECX),identity])
  for offset,value in [(8,0 if identity%3==0 else 25<<16),(12,identity%2),(16,5+identity%7)]:write(read(sp+offset),value)
 elif address==stop+0x300:calls.append(['font',cpu.reg_read(UC_X86_REG_ECX),read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,8)
 elif address==stop+0x600:calls.append(['label',cpu.reg_read(UC_X86_REG_ECX)]);cpu.reg_write(UC_X86_REG_EAX,0x76543210+bits)
 elif address==stop+0x500:
  args=[signed(sp+4+i*4) for i in range(5)];calls.append(['overlap',cpu.reg_read(UC_X86_REG_ECX)]+args)
  cpu.reg_write(UC_X86_REG_EAX,int(args[1]>=2+bits%4+((args[0]&7)//2 if bits&32 else 0) and (args[2]==owner+0x7300 or args[0]>=800)))
 elif address==0x4aab40:cpu.mem_write(read(sp+4),str(signed(sp+8)).encode()+b'\0')
 elif address==0x492550:
  count=read(sp+4);result=heap
  if result:heap+=(count+15)&~15
  calls.append(['allocate',count,result]);cpu.reg_write(UC_X86_REG_EAX,result)
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
def invalid(cpu,access,address,size,value,user):
 print('Invalid memory',bits,hex(cpu.reg_read(UC_X86_REG_EIP)),hex(address),size,'heap',hex(heap));return False
cpu.hook_add(UC_HOOK_MEM_INVALID,invalid)
sceneOffsets=[0xc28,0x102c,0xc2c,0xc30,0xc34,0x1034,0x1038,0x1044];cases=[]
for bits in range(128):
 cpu.mem_write(owner,bytes(0x10000));cpu.mem_write(physics,bytes(0x100000));cpu.mem_write(owner,bytes([0xa5])*0x390);cpu.mem_write(context,bytes(0x20000));cpu.mem_write(config,bytes(40))
 team=2;worm=3;cpu.mem_write(config,b'\x64\x00\x00WormName\0');cpu.mem_write(config+0x1c,struct.pack('<H',65535 if bits&64 else 17));cpu.mem_write(config+0x1e,bytes([bits&1]));write(config+0x20,1100 if bits&64 else 500);write(config+0x24,2)
 cpu.mem_write(context+team*3000+0x3cd0,bytes([255 if bits&2 else 0]));cpu.mem_write(context+team*3000+0x3cd1,bytes([3]));cpu.mem_write(context+team*3000+0x3cd3,bytes([(bits>>4)&1]));cpu.mem_write(context+team*3000+0x3cd6,b'TeamName\0')
 cpu.mem_write(context+0x11d3e,bytes([(bits>>2)&1]));cpu.mem_write(context+0x11d51,bytes([(bits>>3)&1]));write(context+0x7f0,321);write(context+0x804,8);write(context+8,789)
 write(context+0xc28,0 if bits&32 else 1);write(context+0x828,5);write(context+0x102c,2);write(context+0xc2c,1);write(context+0xc30,2);write(context+0x1034,0);write(context+0x1038,1)
 write(context+0x7d4,physics);write(physics,vtable);write(vtable+0x24,stop+0x100);write(vtable+0xc,stop+0x200);write(vtable+0x34,0x4c8f80);cpu.mem_write(context+0x11ba0,bytes([bits*2]))
 cpu.mem_write(physics,bytes(0x400));write(physics,vtable);write(physics+4,77);write(physics+0x3c0,owner+0x3000)
 allEntries=[None,12][:bits%3];categoryEntries=[None] if bits&1 else [];links=[0,123,456,789];heap=physics+0x8000
 for offset,capacity,entries,storage in [(0x18,2,allEntries,owner+0x4000),(0x34+2*0x1c,1,categoryEntries,owner+0x4400)]:
  for o,v in [(4,capacity),(12,len(entries)),(16,storage),(20,storage+0x100)]:write(physics+offset+o,v)
  for i,v in enumerate(entries):write(storage+i*4,v or 0)
 for i,v in enumerate(links):write(owner+0x3000+0x3a4+i*4,v)
 environment=dict(all=dict(capacity=2,entries=allEntries),category=dict(capacity=1,entries=categoryEntries),links=links)
 packed=((1100 if bits&64 else 500)<<16)|2;gravity=[16384,65536,0x80000][bits%3];health=[-1,0,100,10000][bits%4];successAt=[1,2,4,99][bits%4];attempts=0;calls=[]
 initial=list(cpu.mem_read(context+0x824,0xc10));configuration=list(cpu.mem_read(config,40));sp=stack+0xf000
 write(context+8,owner+0x2000);write(owner+0x2000,owner+0x2200);write(owner+0x2228,stop+0x300)
 write(context+0x1b94+team*0x51c+worm*0x9c-0x538,health&0xffffffff);write(context+0x1b94+team*0x51c+worm*0x9c-0x4fc,0xdeadbeef);write(context+0x1b76c,12345)
 write(owner+0x2220,stop+0x400);write(context+0x1b94+team*0x51c-12,(bits>>4)&1)
 cpu.mem_write(context+team*3000+0x3cd2,bytes([(bits>>5)&1]));cpu.mem_write(config+0x1c,struct.pack('<H',17 if bits&8 else 0))
 write(context+0x44c,owner+0x5000);write(owner+0x5004,3);write(owner+0x500c,owner+0x5400)
 for i,(x,y,weight) in enumerate([(500,2,1),(800,3,2),(1100,4,1)]):write(owner+0x5400+i*8,(x<<16)|y);write(owner+0x5404+i*8,weight)
 write(context+0x1241c,(bits*1000003)&0xffffffff)
 write(vtable+0x24,0x4c8c60);write(vtable+0xc,0x4c9770);write(physics+0x3b8,gravity)
 write(owner+0x3000+0x3a4+3*4,owner+0x7100);write(owner+0x7100,owner+0x7200);write(owner+0x720c,stop+0x500)
 for index,(category,at,maskid,enabled) in enumerate([(1,owner+0x6000,owner+0x7300,1),(6,owner+0x6400,owner+0x7400,bits%2)]):
  storage=owner+0x6800+index*0x100;write(physics+0x34+category*0x1c+12,2);write(physics+0x34+category*0x1c+16,storage);write(storage,0);write(storage+4,at)
  write(at+0x48,enabled);write(at+0xf0,maskid);write(at+0x90,100<<16);write(at+0x94,3<<16);write(at+0xec,77)
 record=bytes(cpu.mem_read(config,40));cpu.mem_write(config,bytes(3000));cpu.mem_write(config,bytes([255 if bits&2 else 0]));cpu.mem_write(config+0xbb4,bytes([bits%4]))
 for index in range(bits%4):
  cpu.mem_write(config+0xa74+index*40,record)
  write(context+0x1b94+team*0x51c+(index+1)*0x9c-0x538,health&0xffffffff)
 write(context+0x1c,owner+0x2000);write(owner+0x2240,stop+0x600);write(0x56faf8,0xdeadbeef)
 count=bits%7;wormCount=bits%4;setup=context+0x47a8;record=bytes(cpu.mem_read(config,3000));cpu.mem_write(setup+0xde,bytes([count]))
 for index in range(6):
  cpu.mem_write(setup+0xe0+index*3000,record);base=context+0x1b94+(index+1)*0x51c;write(base,wormCount);write(base-12,(bits>>4)&1)
  for w in range(1,9):write(base+w*0x9c-0x538,health&0xffffffff)
 write(context+0xc28,32);write(context+0x102c,0)
 for index in range(32):write(context+0x828+index*4,index);write(context+0x1030+index*4,0)
 write(owner+0x5004,32)
 for index in range(32):write(owner+0x5400+index*8,((100+index*30)<<16)|2);write(owner+0x5404+index*8,1+index%3)
 write(vtable+0x20,stop+0x700);write(vtable+0x2c,stop+0x800)
 write(physics+0x34+0x1c+4,32);write(physics+0x34+0x1c+20,owner+0x6a00)
 write(owner+0x3000+0x3a4+4,owner+0x7500)
 write(context+0x28,owner+0x7600);write(owner+0x7600,owner+0x7700);write(owner+0x7714,stop+0x900);write(owner+0x7754,stop+0xa00)
 write(context+0x2f0,owner+0x7800);write(owner+0x7800,owner+0x7900);write(owner+0x7914,stop+0xb00)
 for entry,(method,n) in surfaceCalls.items():write(owner+0x7900+method,entry)
 write(context+0x1b8ac,bits&32);write(context+0x1b8cc,(-10<<16)&0xffffffff);write(context+0x1b8d0,1000<<16)
 for index in range(10):write(context+0x12434+index*4,0x12340000+index+bits)
 cpu.mem_write(setup+0xd5a7,bytes([bits%6]));cpu.mem_write(setup+0xd5a6,bytes([[0,1,255,128][bits%4]]));cpu.mem_write(context+0x11d50,bytes([bits%3]))
 write(physics+0x34+17*0x1c+4,2);write(physics+0x34+17*0x1c+16,owner+0x8200);write(physics+0x34+17*0x1c+20,owner+0x8300)
 write(owner+0x3000+0x3a4+9*4,owner+0x8400);write(owner+0x8400,owner+0x7200)
 if bits&64:write(context+0xc28,0)
 write(physics+0x34+10*0x1c+4,2);write(physics+0x34+10*0x1c+16,owner+0x8600);write(physics+0x34+10*0x1c+20,owner+0x8700)
 write(owner+0x3000+0x3a4+2*4,owner+0x8500);write(owner+0x8500,owner+0x7200)
 if bits&64:
  for index in range(24):
   previous=owner+0x9000+index*0x100;write(context+0x450+index*4,previous);write(previous,0x527300);write(previous+0x38,context);write(previous+0xfc,(index%7-3)&0xffffffff);write(previous+0x90,(200+index)<<16);write(previous+0x94,3<<16)
 write(context+0x1b8dc,320+bits*3)
 def short(offset,value):cpu.mem_write(context+offset,struct.pack('<h',value))
 short(0x1b798,bits%5);short(0x1b7da,bits%9)
 for index in range(16):
  short(0x1b778+index*2,index-2);short(0x1b79a+index*2,(bits%4)-index//2);short(0x1b7ba+index*2,20+index)
 write(context+0x1b94+0x1eb4,count)
 write(context+0x1acc,bits*997)
 cpu.mem_write(context+0x11d4a,struct.pack('<H',bits*5));cpu.mem_write(context+0x11b96,bytes([bits%7]))
 cpu.mem_write(context+0x114e0,bytes([count]))
 for index in range(count):cpu.mem_write(context+0x114e2+index*0x11e,bytes([count-index-1]))
 short(0x1b868,bits%5);short(0x1b8aa,bits%9)
 for index in range(16):
  short(0x1b848+index*2,index-2);short(0x1b86a+index*2,(bits%4)-index//2);short(0x1b88a+index*2,20+index)
 initialWords=[[address+i,read(address+i)] for address,length in [(owner,0x10000),(physics,0x8000),(context,0x20000)] for i in range(0,length,4) if read(address+i)]
 for i,v in enumerate([stop,context,setup]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4b2ad0,stop,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(count=count,wormCount=wormCount,portraitLabel=read(0x56faf8),bits=bits,team=team,worm=worm,input=base64.b64encode(zlib.compress(bytes().join(struct.pack("<II",a,v) for a,v in initialWords))).decode(),packed=packed,gravity=gravity,health=health,successAt=successAt,calls=calls,sha256=hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(physics,0x100000))+bytes(cpu.mem_read(context,0x20000))).hexdigest()))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004B2AD0/004EAAD0 with native presentation and scenery, mines, barrels, population, landscape, controllers and worms',owner=owner,sceneOffsets=sceneOffsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} composed world cases')
