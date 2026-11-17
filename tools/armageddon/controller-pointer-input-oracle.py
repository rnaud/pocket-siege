"""Execute full 00501370 arsenal pointer input and005011F0 opening with original key classification and queue writes; external input/registry/worm queries are interfaces."""
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

context=0x2300000;cpu.mem_map(context,0x20000)
keyboard=owner+0x1000;pointer=owner+0x2000;vtable=owner+0x3000;queue=owner+0x4000;ring=owner+0x4100;buffer=owner+0x5000
write(keyboard,vtable);write(pointer,vtable+0x100);write(vtable+4,stop+0x100)
for offset,address in [(4,stop+0x120),(8,stop+0x130),(12,stop+0x140)]:write(vtable+0x100+offset,address)
write(queue+4,ring)
for address,argc in [(stop+0x100,1),(stop+0x120,3),(stop+0x130,0),(stop+0x140,0),(0x4c32b0,2),(0x4c2d60,2),(0x4c2ee0,2),(0x4edc50,5)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
calls=[];keys=[];sample=[];busy=0;state=0;available=0

def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4c32b0:
  calls.append(['busy',read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,busy)
 elif address==0x4c2d60:
  calls.append(['state',read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,state)
 elif address==0x4c2ee0:
  slot=read(sp+8);calls.append(['available',read(sp+4),slot]);cpu.reg_write(UC_X86_REG_EAX,int(slot==available))
 elif address==0x4edc50:
  calls.append(['sound']+[read(sp+i*4) for i in range(1,6)]);cpu.reg_write(UC_X86_REG_EAX,0)
 elif address==stop+0x100:
  key=read(sp+4);calls.append(['key',key]);cpu.reg_write(UC_X86_REG_EAX,int(key in keys))
 elif address==stop+0x120:
  calls.append(['pointer']);
  for i,value in enumerate(sample):write(read(sp+4+i*4),value&0xffffffff)
 elif address in [stop+0x130,stop+0x140]:calls.append(['resetA' if address==stop+0x130 else 'resetB'])
for address in [0x4c32b0,0x4c2d60,0x4c2ee0,0x4edc50,stop+0x100,stop+0x120,stop+0x130,stop+0x140]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
body_offsets=[0xe4,0xf4,0xd8]
scene_offsets=[0x1246c,0x12470,0x12474,0x12478]
cases=[]
def run(fields={},controllers=[7],owners=[9],priorities=[2],free=[10,11],pointer_sample=[0,0,0],input_keys=[],busy_value=0,state_value=0x65,available_slot=1,xy=[0,0],capacity=64,has_queue=True):
 global calls,keys,sample,busy,state,available
 cpu.mem_write(owner,bytes(0x200));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context);write(context+4,keyboard);write(context+0x10,pointer)
 fields={0x3c:2,0x4c:3,0xec:7,0xf4:9,0xe4:1,0x84:1,0x50:0,0xc0:320,0xc4:200,0x118:5,0xd8:65536,**fields}
 for offset,value in fields.items():write(owner+offset,value&0xffffffff)
 for start,count,values in [(0x1b822,0x1b842,controllers),(0x1b7ba,0x1b7da,owners),(0x1b778,0x1b798,free)]:
  cpu.mem_write(context+count,struct.pack('<h',len(values)))
  for i,value in enumerate(values):cpu.mem_write(context+start+i*2,struct.pack('<h',value))
 for i,value in enumerate(priorities):cpu.mem_write(context+0x1b79a+i*2,struct.pack('<h',value))
 for offset,value in zip(scene_offsets,[*xy,123,456]):write(context+offset,value&0xffffffff)
 keys=input_keys;sample=pointer_sample;busy=busy_value;state=state_value;available=available_slot;calls=[]
 cpu.mem_write(ring,bytes(32));write(ring+4,buffer);write(ring+8,capacity);cpu.mem_write(buffer,bytes(capacity))
 sp=stack+0xf000;write(sp,stop);write(sp+4,queue if has_queue else 0);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x501370,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 events=[];node=read(ring+0x18)
 while node:
  length=read(node);events.append([read(node+8),list(cpu.mem_read(node+12,length-4))]);node=read(node+4)
 signed=lambda address:struct.unpack('<i',cpu.mem_read(address,4))[0]
 cases.append(dict(fields={str(k):v for k,v in fields.items()},controllers=controllers,owners=owners,priorities=priorities,free=free,sample=sample,keys=keys,busy=busy,state=state,available=available,xy=xy,capacity=capacity,hasQueue=has_queue,calls=calls,events=events,body=[signed(owner+o) for o in body_offsets],scene=[signed(context+o) for o in scene_offsets],ownership=list(cpu.mem_read(context+0x1b778,0x64))))
for buttons in range(4):
 for key in [None,0x1d,0x1b,0x22,0x23,0x24,0x25,0x28,0x1a]:
  for dx,dy in [(0,0),(5,-7),(-400,400),(32768,-32769)]:
   for slot in [0,5]:run(fields={0x118:slot},pointer_sample=[dx,dy,buttons],input_keys=[] if key is None else [key],xy=[100*65536+123,50*65536+456],capacity=24 if dx==0 else 64)
for bits in range(16):
 for buttons in [0,2]:
  for available in [0,1,70]:run(fields={0xe4:0,0xf4:-1,0x84:bits&1,0x50:(bits>>1)&1},pointer_sample=[0,0,buttons],busy_value=(bits>>2)&1,state_value=100 if bits&8 else 0x65,available_slot=available,owners=[3,4,5],priorities=[4,3,1])
for controllers in [[],[8],[8,7],[7,7]]:
 for owners in [[],[8],[8,9],[9,9]]:run(controllers=controllers,owners=owners,priorities=[2]*len(owners),pointer_sample=[2,3,2])
for fields in [{0xec:-1},{0xf4:-1},{0xe4:0,0xf4:-1},{0xe4:0,0xf4:9}]:
 for free in [[],[11]]:run(fields=fields,free=free,pointer_sample=[0,0,2])
run(pointer_sample=[2,3,1],has_queue=False)
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='00501370',bodyOffsets=body_offsets,sceneOffsets=scene_offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} arsenal pointer cases')
