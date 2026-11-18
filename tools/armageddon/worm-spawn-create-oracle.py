"""Execute worm construction with native spawn selection and reservation against the original executable."""
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
interfaces=[(0x4ed970,1),(0x4924d0,0),(0x492510,0),(0x4b19e0,1),(stop+0x100,0),(stop+0x200,3),(0x4c32e0,3),(0x4c2cc0,2),(0x4aab40,0),(0x492550,0),(0x4fd2d0,1),(0x4d64f0,0),(0x4d7730,1),(0x4f6010,0),(0x4b2670,2)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 global attempts,heap
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4ed970:calls.append(['base']);write(owner+0x38,context)
 elif address==0x4924d0:
  count=read(sp+8);result=heap;heap+=(count+15)&~15;cpu.mem_write(result,bytes(count));cpu.reg_write(UC_X86_REG_EAX,result)
 elif address==0x492510:pass
 elif address==0x4b19e0:calls.append(['type',read(sp+4)]);write(owner+0x2c,read(sp+4))
 elif address==0x4ee900:calls.append(['random']);cpu.reg_write(UC_X86_REG_EAX,0x12345678)
 elif address==0x4cbcd0:calls.append(['randomSpawn',read(sp+4)]);write(read(sp+8),packed)
 elif address in [0x4cbd60,0x4cbd80]:calls.append(['sideSpawn',int(address==0x4cbd80)]);write(read(sp+4),packed)
 elif address==0x4cbdb0:calls.append(['reserve',signed(sp+4)])
 elif address==stop+0x100:calls.append(['gravity']);cpu.reg_write(UC_X86_REG_EAX,gravity)
 elif address==stop+0x200:
  calls.append(['place',signed(sp+8),signed(sp+12),signed(owner+0x40),signed(owner+0x48)]);attempts+=1;cpu.reg_write(UC_X86_REG_EAX,int(attempts>=successAt))
 elif address==0x4c32e0:calls.append(['busy']+[signed(sp+4+4*i) for i in range(3)])
 elif address==0x4c2cc0:calls.append(['health',signed(sp+4),signed(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,health&0xffffffff)
 elif address==0x4aab40:cpu.mem_write(read(sp+4),str(signed(sp+8)).encode()+b'\0')
 elif address==0x492550:calls.append(['allocate',read(sp+4)]);cpu.reg_write(UC_X86_REG_EAX,0 if bits&64 else 123)
 elif address==0x4fd2d0:calls.append(['animation',cpu.reg_read(UC_X86_REG_ECX),read(sp+4)]);cpu.reg_write(UC_X86_REG_EAX,456)
 elif address==0x4d64f0:calls.append(['resources'])
 elif address==0x4d7730:calls.append(['state',signed(sp+4)])
 elif address==0x4f6010:calls.append(['settle'])
 elif address==0x4b2670:calls.append(['register',signed(sp+4),signed(sp+8)])
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
sceneOffsets=[0xc28,0x102c,0xc2c,0xc30,0xc34,0x1034,0x1038,0x1044];cases=[]
for bits in range(128):
 cpu.mem_write(owner,bytes([0xa5])*0x390);cpu.mem_write(context,bytes(0x20000));cpu.mem_write(config,bytes(40))
 team=2;worm=3;cpu.mem_write(config,b'\x64\x00\x00WormName\0');cpu.mem_write(config+0x1c,struct.pack('<H',65535 if bits&64 else 17));cpu.mem_write(config+0x1e,bytes([bits&1]));write(config+0x20,1100 if bits&64 else 500);write(config+0x24,2)
 cpu.mem_write(context+team*3000+0x3cd0,bytes([255 if bits&2 else 0]));cpu.mem_write(context+team*3000+0x3cd1,bytes([3]));cpu.mem_write(context+team*3000+0x3cd3,bytes([(bits>>4)&1]));cpu.mem_write(context+team*3000+0x3cd6,b'TeamName\0')
 cpu.mem_write(context+0x11d3e,bytes([(bits>>2)&1]));cpu.mem_write(context+0x11d51,bytes([(bits>>3)&1]));write(context+0x7f0,321);write(context+0x804,8);write(context+8,789)
 write(context+0xc28,0 if bits&32 else 1);write(context+0x828,5);write(context+0x102c,2);write(context+0xc2c,1);write(context+0xc30,2);write(context+0x1034,0);write(context+0x1038,1)
 write(context+0x7d4,physics);write(physics,vtable);write(vtable+0x24,stop+0x100);write(vtable+0xc,stop+0x200);write(vtable+0x34,0x4c8f80);cpu.mem_write(context+0x11ba0,bytes([bits*2]))
 cpu.mem_write(physics,bytes(0x400));write(physics,vtable);write(physics+4,77);write(physics+0x3c0,owner+0x3000)
 allEntries=[None,12][:bits%3];categoryEntries=[None] if bits&1 else [];links=[0,123,456,789];heap=owner+0x6000
 for offset,capacity,entries,storage in [(0x18,2,allEntries,owner+0x4000),(0x34+2*0x1c,1,categoryEntries,owner+0x4400)]:
  for o,v in [(4,capacity),(12,len(entries)),(16,storage),(20,storage+0x100)]:write(physics+offset+o,v)
  for i,v in enumerate(entries):write(storage+i*4,v or 0)
 for i,v in enumerate(links):write(owner+0x3000+0x3a4+i*4,v)
 spawnPool=[dict(position=(500<<16)|2,weight=1),dict(position=(800<<16)|3,weight=2),dict(position=(1100<<16)|4,weight=1)]
 write(context+0x44c,owner+0x5000);write(owner+0x5004,len(spawnPool));write(owner+0x500c,owner+0x5400)
 for i,row in enumerate(spawnPool):write(owner+0x5400+i*8,row['position']);write(owner+0x5404+i*8,row['weight'])
 spawnSeed=(bits*1000003)&0xffffffff;write(context+0x1241c,spawnSeed)
 environment=dict(all=dict(capacity=2,entries=allEntries),category=dict(capacity=1,entries=categoryEntries),links=links)
 packed=((1100 if bits&64 else 500)<<16)|2;gravity=[16384,65536,0x80000][bits%3];health=[-1,0,100,10000][bits%4];successAt=[1,2,4,99][bits%4];attempts=0;calls=[]
 initial=list(cpu.mem_read(context+0x824,0xc10));configuration=list(cpu.mem_read(config,40));sp=stack+0xf000
 for i,v in enumerate([stop,0x1234,team,worm,config]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4d5a40,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 def capture(offset):return dict(capacity=read(physics+offset+4),entries=[read(read(physics+offset+16)+i*4) or None for i in range(read(physics+offset+12))])
 environmentResult=dict(all=capture(0x18),category=capture(0x34+2*0x1c),dirty=read(physics+4))
 remainingPool=[dict(position=read(owner+0x5400+i*8),weight=signed(owner+0x5404+i*8)) for i in range(read(owner+0x5004))]
 cases.append(dict(spawnPool=spawnPool,spawnSeed=spawnSeed,remainingPool=remainingPool,finalSeed=read(context+0x1241c),environment=environment,environmentResult=environmentResult,bits=bits,team=team,worm=worm,configuration=configuration,initial=initial,packed=packed,gravity=gravity,health=health,successAt=successAt,calls=calls,body=list(cpu.mem_read(owner+0x3c,0x390-0x3c)),scene=[signed(context+o) for o in sceneOffsets]))
poolCases=[]
for entries in [[],[dict(position=1,weight=1)],[dict(position=1,weight=1),dict(position=2,weight=2),dict(position=1,weight=1)],[dict(position=1,weight=0),dict(position=2,weight=1)],[dict(position=1,weight=32768)]]:
 for mode in ['random','left','right','reserve']:
  for value in [0,1,16383,16384,32768,49152,65535,0x1234ffff]:
   write(owner+0x5004,len(entries));write(owner+0x500c,owner+0x5400);write(owner+0x5800,777)
   for i,row in enumerate(entries):write(owner+0x5400+i*8,row['position']);write(owner+0x5404+i*8,row['weight'])
   routine={'random':0x4cbcd0,'left':0x4cbd60,'right':0x4cbd80,'reserve':0x4cbdb0}[mode]
   arguments=[value,owner+0x5800] if mode=='random' else [value if mode=='reserve' else owner+0x5800]
   sp=stack+0xf000
   for i,v in enumerate([stop]+arguments):write(sp+4*i,v)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner+0x5000);fault=False
   cpu.emu_start(routine,stop,count=100000)
   assert cpu.reg_read(UC_X86_REG_EIP)==stop,(entries,mode,value,hex(cpu.reg_read(UC_X86_REG_EIP)))
   poolCases.append(dict(entries=entries,mode=mode,value=value,fault=fault,result=None if fault else cpu.reg_read(UC_X86_REG_EAX),output=read(owner+0x5800),remaining=[dict(position=read(owner+0x5400+i*8),weight=signed(owner+0x5404+i*8)) for i in range(read(owner+0x5004))]))
insertCases=[]
for entries in [[],[dict(position=1,weight=1)],[dict(position=1,weight=1),dict(position=2,weight=2)]]:
 for capacity in [0,1,2,64]:
  for position in [1,3,0xffffffff]:
   for weight in [0,1,0x7fffffff,0xffffffff]:
    write(owner+0x5004,len(entries));write(owner+0x5008,capacity);write(owner+0x500c,owner+0x5400)
    for i,row in enumerate(entries):write(owner+0x5400+i*8,row['position']);write(owner+0x5404+i*8,row['weight'])
    sp=stack+0xf000
    for i,v in enumerate([stop,position,weight]):write(sp+4*i,v)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner+0x5000)
    cpu.emu_start(0x4cbc50,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    insertCases.append(dict(entries=entries,capacity=capacity,position=position,weight=weight,result=cpu.reg_read(UC_X86_REG_EAX),remaining=[dict(position=signed(owner+0x5400+i*8),weight=signed(owner+0x5404+i*8)) for i in range(read(owner+0x5004))]))
buildCases=[]
for count in [0,1,2,32,64,70]:
 for duplicate in [False,True]:
  positions=[dict(x=i//2 if duplicate else i,y=2) for i in range(count)]
  sp=stack+0xf000;write(sp+0x10,count);write(owner+0x5cd0,context);write(context+0x44c,owner+0x5000)
  write(owner+0x5004,0);write(owner+0x5008,64);write(owner+0x500c,owner+0x5400)
  for i,row in enumerate(positions):write(sp+0x118+i*8,row['x']);write(sp+0x11c+i*8,row['y'])
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EBX,owner)
  cpu.emu_start(0x4a5ae5,0x4a5b1e,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==0x4a5b1e
  buildCases.append(dict(positions=positions,entries=[dict(position=signed(owner+0x5400+i*8),weight=signed(owner+0x5404+i*8)) for i in range(read(owner+0x5004))]))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004D5A40 with real physics membership and004CBCD0/004CBD60/004CBD80/004CBDB0/004EE900 spawn routines',owner=owner,buildCases=buildCases,insertCases=insertCases,poolCases=poolCases,sceneOffsets=sceneOffsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} fresh worm cases')
