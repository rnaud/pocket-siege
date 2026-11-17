"""Execute005019C0 targeting collector with native bounds and replay writes; device, worm query, placement acceptance are interfaces; targeting teardown executes natively."""
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
worm=owner+0x7000;shape=owner+0x7100;write(worm,vtable+0x200);write(shape,vtable+0x300)
write(vtable+8,stop+0x150);write(vtable+12,stop+0x160);write(vtable+0x200+12,stop+0x170);write(vtable+0x300+20,stop+0x180)
for address,argc in [(stop+0x150,1),(stop+0x160,1),(stop+0x170,3),(stop+0x180,2),(0x4ccf50,2),(0x501700,3),(0x501880,3)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def extra(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4ccf50:
  calls.append(['lookup',read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,worm)
 elif address in [stop+0x150,stop+0x160]:calls.append(['repeat' if address==stop+0x150 else 'consume',read(sp+4)])
 elif address==stop+0x170:
  calls.append(['query',read(sp+4),read(sp+8)]);payload=read(sp+12);cpu.mem_write(payload,bytes(0x154));write(payload+0x14,eligible);write(payload+0x18,eligible)
 elif address==stop+0x180:
  calls.append(['shape']);write(read(sp+4),33);write(read(sp+8),17)
 elif address==0x501700:
  calls.append(['girder',signed(sp+4),signed(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,accepted)
 elif address==0x501880:
  xp,yp=read(sp+4),read(sp+8);calls.append(['teleport',signed(xp),signed(yp)]);write(yp,(signed(yp)+65536)&0xffffffff);cpu.reg_write(UC_X86_REG_EAX,accepted)
 elif address==0x4e6380:calls.append(['end'])
for address in [0x4ccf50,stop+0x150,stop+0x160,stop+0x170,stop+0x180,0x501700,0x501880,0x4e6380]:cpu.hook_add(UC_HOOK_CODE,extra,begin=address,end=address)
cases=[]
def run(fields={},input_keys=[],pointer_sample=[0,0,0],allow=0,accept=1,worm_state=0x65,controllers=[7],owners=[9],keyowners=[8],xy=[100*65536+123,50*65536+456],ceiling=0,capacity=128,busy_value=0):
 global calls,keys,sample,busy,state,eligible,accepted
 cpu.mem_write(owner,bytes(0x200));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context);write(context+4,keyboard);write(context+0x10,pointer)
 fields={0x3c:2,0x4c:3,0xec:7,0xf0:8,0xe8:9,0xac:1,0x64:34,0xe0:1,0xdc:17,0x98:0,0xa4:0,0x84:1,0x94:1,**fields}
 for offset,value in fields.items():write(owner+offset,value&0xffffffff)
 for start,count,values in [(0x1b822,0x1b842,controllers),(0x1b7ba,0x1b7da,owners),(0x1b88a,0x1b8aa,keyowners)]:
  cpu.mem_write(context+count,struct.pack('<h',len(values)))
  for i,value in enumerate(values):cpu.mem_write(context+start+i*2,struct.pack('<h',value))
 for i in range(19):write(context+0x310+i*4,shape)
 for offset,value in [(0x1247c,xy[0]),(0x12480,xy[1]),(0x1b8cc,0),(0x1b8d0,1920*65536),(0x804,696),(0x1b8ac,ceiling)]:write(context+offset,value&0xffffffff)
 calls=[];keys=input_keys;sample=pointer_sample;busy=busy_value;state=worm_state;eligible=allow;accepted=accept
 cpu.mem_write(ring,bytes(32));write(ring+4,buffer);write(ring+8,capacity);cpu.mem_write(buffer,bytes(capacity))
 sp=stack+0xf000;write(sp,stop);write(sp+4,queue);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x5019c0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 events=[];node=read(ring+0x18)
 while node:
  length=read(node);events.append([read(node+8),list(cpu.mem_read(node+12,length-4))]);node=read(node+4)
 cases.append(dict(fields={str(k):v for k,v in fields.items()},keys=keys,sample=sample,busy=busy,state=state,allow=allow,accept=accept,controllers=controllers,owners=owners,keyowners=keyowners,xy=xy,ceiling=ceiling,capacity=capacity,calls=calls,events=events,output=[signed(owner+0xe0),signed(context+0x1247c),signed(context+0x12480)],targetFlags=[signed(owner+o) for o in [0xac,0xbc,0xe8]],ownership=list(cpu.mem_read(context+0x1b778,0x64))))
for slot in [1,34,36,40]:
 for direction in [0,1]:
  for index in [0,1,17,18]:
   for allow in [0,1]:
    for keys in [[],[34],[35],[34,35]]:run(fields={0x64:slot,0x98:direction,0xe0:index},input_keys=keys,allow=allow)
for slot in [1,34,36,40]:
 for state in [100,0x65,0x67,0x78,0x79,0x7b,0x7c,0x7d]:
  for flag in [0,1]:
   for accept in [0,1]:run(fields={0x64:slot,0xa4:flag},pointer_sample=[3,-4,1],accept=accept,worm_state=state,capacity=128)
for slot in [1,34]:
 for ceiling in [0,1]:
  for sample in [[0,0,0],[3,-4,0],[-32769,32768,0],[4000,-4000,0]]:
   for xy in [[-65537,-1],[1910*65536+123,690*65536+456]]:run(fields={0x64:slot},pointer_sample=sample,ceiling=ceiling,xy=xy)
for field in [0xec,0xf0,0xe8]:run(fields={field:-1})
for values in [[],[6],[6,7],[7,7]]:run(controllers=values)
for values in [[],[6],[6,9],[9,9]]:run(owners=values,pointer_sample=[3,4,1])
for values in [[],[6],[6,8],[8,8]]:run(keyowners=values,input_keys=[34])
for capacity in [24,32,48]:run(fields={0xa4:1},pointer_sample=[0,0,1],worm_state=100,capacity=capacity)
run(busy_value=1)
for buttons in [0,1]:run(fields={0xac:0},pointer_sample=[0,0,buttons])
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='005019C0',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} targeting cases')
