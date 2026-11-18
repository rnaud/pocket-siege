"""Execute runtime actor teardown with original base/physics/text destruction and scene bookkeeping."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI
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


context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x2a0,context)
heap=0x2400000;cpu.mem_map(heap,0x10000);body=heap+0x100;environment=heap+0x2000;table=owner+0x5000
for entry in [0x492550,0x4924d0,0x492510,0x492590]:cpu.mem_write(entry,b'\xc3')
calls=[];cursor=heap+0x8000
def hook(cpu,entry,size,user):
 global cursor
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if entry==0x492590:calls.append(['release',read(sp+4),read(sp+8)]);return
 if entry==0x492510:calls.append(['free',read(sp+4)]);return
 kind='array' if entry==0x4924d0 else 'allocate';size=read(sp+(8 if kind=='array' else 4));value=cursor;cursor+=(size+15)&~15
 calls.append([kind,size,value]+([read(sp+4)] if kind=='array' else []));cpu.reg_write(UC_X86_REG_EAX,value)
for entry in [0x492550,0x4924d0,0x492510,0x492590]:cpu.hook_add(UC_HOOK_CODE,hook,begin=entry,end=entry)
def invoke(entry,at,values):
 sp=stack+0xf000
 for i,value in enumerate([stop]+values):write(sp+i*4,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,at);cpu.emu_start(entry,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
soundCallback=stop+0x100;cpu.mem_write(soundCallback,b'\xc2\x04\x00')
def soundHook(cpu,entry,size,user):calls.append(['stopSound',cpu.reg_read(UC_X86_REG_ECX),read(cpu.reg_read(UC_X86_REG_ESP)+4)])
cpu.hook_add(UC_HOOK_CODE,soundHook,begin=soundCallback,end=soundCallback)
import base64,zlib,itertools
schemas=json.loads(Path('src/armageddon/replay-task-types.json').read_text())
tags=[7,9,13,15,16,17,21,22,23,24,25,26,27,28,29,30,31]
cases=[]
for tag,flags,variant in itertools.product(tags,range(4),range(4)):
 schema=next(row for row in schemas if row['tag']==tag)
 cpu.mem_write(owner,bytes(0x10000));cpu.mem_write(heap,bytes(0x10000));cpu.mem_write(context,bytes(0x20000));cursor=heap+0x8000
 invoke(0x4b1ae0,owner,[0]);write(owner+0x38,context)
 write(context+0x7d4,environment);write(environment,table);write(table+0x34,0x4c8f80);write(table+0x38,0x4c9460);write(environment+0x3c0,heap+0x6000)
 for offset,storage in [(0x18,heap+0x4000),(0x34+2*0x1c,heap+0x5000)]:
  for field,value in [(4,16),(12,0),(16,storage),(20,storage+0x100)]:write(environment+offset+field,value)
 invoke(0x4f4000 if schema['physics'] else 0x4b1ae0,body,[owner,2,0] if schema['physics'] else [owner]);write(body+0x38,context)
 if schema['physics']:invoke(0x4c8f80,environment,[body])
 invoke(0x4b2670,body,[3,tag]);write(body,int(schema['vtable'],16))
 #A registered child verifies recursive deletion and parent-list mutation.
 child=owner+0x4000;invoke(0x4b1ae0,child,[body]);invoke(0x4b2670,child,[4,tag])
 write(context+0xc28,2);write(context+0x102c,3)
 for i,slot in enumerate([3,1,2]):write(context+0xc2c+i*4,slot);write(context+0x1030+slot*4,i)
 slot=[1,3,2,7][variant]
 if tag in [9,15,21,30]:write(body+({9:0x10c}.get(tag,0x100)),slot)
 for offset in [0x12420,0x12424,0x12428,0x1242c,0x1b8f0,0x1b8f4]:write(context+offset,[0,1,0x80000000,0x7fffffff][variant])
 if tag==24:write(body+0x80,variant);write(context+0x4b0+variant*4,body)
 if tag==15:write(body+0x260,variant);write(body+0x124,variant)
 for index,offset in enumerate([0x268,0x270,0x26c] if tag==15 else [0x64] if tag==29 else []):
  text=owner+0x7000+index*0x200;write(body+offset,text if variant!=index else 0);write(text,0x5268a4)
  for j,field in enumerate([12,16]):
   image=owner+0x8000+index*0x100+j*0x40;write(text+field,image if variant>=j+1 else 0);write(image,0x526390);write(image+4,variant%2);write(image+8,owner+0x9000+index*0x100+j*0x40)
 if schema['physics']:
  write(body+0xc8,variant%2);write(body+0xf8,heap+0x7000);write(body+0xf4,0x1234 if variant>=2 else 0)
 write(context+12,owner+0x6000 if variant%2 else 0);write(owner+0x6000,owner+0x6100);write(owner+0x6128,soundCallback)
 def snapshot():return bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(heap,0x10000))+bytes(cpu.mem_read(context,0x20000))
 if tag==31:
  write(body+0x2dd0,variant);write(context+0x1d428,[0,1,0x80000000,0x7fffffff][variant])
  events=owner+0xa000;inner=events+0x20;tableAt=owner+0xb000
  write(body+0x2dc4,events if variant else 0);write(events,0x526544);write(events+4,inner if variant!=2 else 0);write(inner,0x5266a0);write(inner+4,events+0x100)
  write(body+0x2dcc,tableAt if variant!=1 else 0);write(tableAt,0x526918);write(tableAt+12,tableAt+0x100)
 initial=snapshot();calls.clear();invoke(read(int(schema['vtable'],16)),body,[flags])
 cases.append(dict(tag=tag,flags=flags,variant=variant,inputMemory=base64.b64encode(zlib.compress(initial)).decode(),calls=list(calls),sha256=hashlib.sha256(snapshot()).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='272 original runtime actor destructions across17 concrete types, four flags and four runtime resource/list/counter states. Original recursive base, registry, physics, presentation-slot and cached text/image destructors execute. Full256KiB memory and ordered frees/releases/audio stops are captured. Heap and audio backend remain interfaces; terrain-owned history/hash buffers execute; weapon actor11 is excluded.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'runtime actor destructions')
