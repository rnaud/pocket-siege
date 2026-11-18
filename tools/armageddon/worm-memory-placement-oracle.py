"""Execute worm construction composed with native task ownership and environment membership against the original executable."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
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

context=0x2300000;cpu.mem_map(context,0x20000);config=owner+0x1000;physics=0x2400000;cpu.mem_map(physics,0x10000);vtable=owner+0x2100
interfaces=[(0x4924d0,0),(0x492510,0),(stop+0x500,5),(stop+0x300,2),(stop+0x400,4),(0x4aab40,0),(0x492550,0)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 global attempts,heap
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4924d0:
  count=read(sp+8);result=heap;heap+=(count+15)&~15;calls.append(['array',count,result,read(sp+4)]);cpu.reg_write(UC_X86_REG_EAX,result)
 elif address==0x492510:calls.append(['free',read(sp+4)])
 elif address==stop+0x400:
  identity=read(sp+4);calls.append(['metadata',cpu.reg_read(UC_X86_REG_ECX),identity])
  for offset,value in [(8,0 if identity%3==0 else 25<<16),(12,identity%2),(16,5+identity%7)]:write(read(sp+offset),value)
 elif address==stop+0x300:calls.append(['font',cpu.reg_read(UC_X86_REG_ECX),read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,8)
 elif address==stop+0x500:
  args=[signed(sp+4+i*4) for i in range(5)];calls.append(['overlap',cpu.reg_read(UC_X86_REG_ECX)]+args)
  cpu.reg_write(UC_X86_REG_EAX,int(args[1]>=2+bits%4 and (args[2]==owner+0x7300 or args[0]>=800)))
 elif address==0x4aab40:cpu.mem_write(read(sp+4),str(signed(sp+8)).encode()+b'\0')
 elif address==0x492550:
  count=read(sp+4);result=heap
  if result:heap+=(count+15)&~15
  calls.append(['allocate',count,result]);cpu.reg_write(UC_X86_REG_EAX,result)
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
sceneOffsets=[0xc28,0x102c,0xc2c,0xc30,0xc34,0x1034,0x1038,0x1044];cases=[]
for bits in range(128):
 cpu.mem_write(owner,bytes(0x10000));cpu.mem_write(physics,bytes(0x10000));cpu.mem_write(owner,bytes([0xa5])*0x390);cpu.mem_write(context,bytes(0x20000));cpu.mem_write(config,bytes(40))
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
 initialWords=[[address+i,read(address+i)] for address,length in [(owner,0x10000),(physics,0x10000),(context,0x20000)] for i in range(0,length,4) if read(address+i)]
 for i,v in enumerate([stop,0]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner+0x8000);cpu.emu_start(0x4b1ae0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 write(owner+0x8038,context)
 for i,v in enumerate([stop,owner+0x8000,team,worm,config]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4d5a40,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(bits=bits,team=team,worm=worm,initialWords=initialWords,packed=packed,gravity=gravity,health=health,successAt=successAt,calls=calls,sha256=hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(physics,0x10000))+bytes(cpu.mem_read(context,0x20000))).hexdigest()))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004D5A40 with native environment gravity and collision registry placement, state, spawn and resources',owner=owner,sceneOffsets=sceneOffsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} fresh worm cases')
